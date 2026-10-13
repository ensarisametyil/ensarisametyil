#!/usr/bin/env node
/* =============================================================================
 * motor/tools/backtest.js
 * NE İŞE YARAR : KAYAN BAŞLANGIÇLI (rolling-origin) geriye dönük test.
 *   Her "başlangıç" anında motor (ve kıyas modelleri) yalnız o ana kadar bilinenle
 *   tahmin yapar; tahmin, sonradan gerçekleşen değerle karşılaştırılır.
 *
 *   Dönemler (zamanda AYRI; sızıntı yok):
 *     geçmiş   : yalnız öğrenme geçmişi (tahmin yok)
 *     ayar     : conformal kalibrasyon ve kıyas aralıkları BURADAN öğrenilir
 *     sınama   : TÜM raporlanan ölçüler BURADAN (ayar verisine hiç bakılmadan)
 *
 *   Kıyas modelleri: (a) süreklilik, (b) mevsimsel saf, (c) basit üstel düzeltme,
 *   (n) bugünkü ürün formülü (yalnız bekleme), (e) motor. (d) v1: depoda yok.
 *
 * KULLANIM:
 *   node motor/tools/backtest.js                     sentetik (4 rejim × 5 tohum)
 *   node motor/tools/backtest.js --quick             hızlı (2 tohum, kapatma deneyi yok)
 *   node motor/tools/backtest.js --no-ablation       5 tohum, kapatma deneyi yok
 *   node motor/tools/backtest.js --csv veri.csv      GERÇEK veri (CSV şeması: docs/VERI_GEREKSINIMLERI.md)
 *   node motor/tools/backtest.js --make-sample-csv ornek.csv   CSV yolunu sınamak için örnek dosya
 * ÇIKTI: motor/out/backtest.json → node motor/tools/report.js ile Türkçe rapora dönüşür.
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const engine = require('../core/index.js');
const config = require('../core/config.js');
const time = require('../core/time.js');
const quality = require('../core/quality.js');
const occupancyLib = require('../core/occupancy.js');
const calibrate = require('../core/calibrate.js');
const rngLib = require('../core/rng.js');
const simulator = require('./simulator.js');

const MS_PER_MINUTE = 60000;
const HORIZONS = config.HORIZONS_MINUTES;
const SES_ALPHA = 0.3;                 // önceden sabitlendi (sınama verisine bakılmadan)
const NAIVE_MINUTES_PER_PATIENT = 9;   // js/mock-data.js'teki bugünkü ürün formülü
const NAIVE_SPREAD = 1.4;
const NAIVE_YELLOW = [5, 20];
const ENGINE_RUNS = 400;               // geriye dönük testte süre için (üründe 1500)
const ORIGIN_EVERY_HOURS = 3;
const HEAVY_RHO = 0.85;
const LEVEL_SETS = [{ id: '45/75', MEDIUM_FROM: 45, HIGH_FROM: 75 }, { id: '50/80', MEDIUM_FROM: 50, HIGH_FROM: 80 }, { id: '55/85', MEDIUM_FROM: 55, HIGH_FROM: 85 }];

const PLAN = {
  A: { startIso: '2026-05-04T00:00:00+03:00', weeks: 6, historyWeeks: 2, calWeeks: 2 },
  B: { startIso: '2026-05-04T00:00:00+03:00', weeks: 6, historyWeeks: 2, calWeeks: 2 },
  // C: Ramazan Bayramı geçmişte, Kurban Bayramı + bayram ertesi sınama döneminde
  C: { startIso: '2026-03-09T00:00:00+03:00', weeks: 12, historyWeeks: 6, calWeeks: 3 },
  D: { startIso: '2026-05-04T00:00:00+03:00', weeks: 6, historyWeeks: 2, calWeeks: 2 }
};

/* ---- Yardımcılar ------------------------------------------------------------------ */

const cap100 = function (v) { return Math.min(100, Math.max(0, v)); };
const mean = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; };

function observedOccupancy(input, nowMs) {
  const a = quality.assess(input, nowMs);
  if (a.status !== 'ok') return null;
  const r = a.record;
  const cap = occupancyLib.capacity(r.bedCapacity, r.activePhysicians);
  return (r.greenWaiting + r.yellowWaiting + r.redWaiting + Math.min(r.inService, r.activePhysicians) + r.boarding) / cap * 100;
}

function quantileOf(values, q) {
  const s = values.slice().sort(function (a, b) { return a - b; });
  return occupancyLib.quantile(s, q);
}

/* ---- Kıyas modelleri ---------------------------------------------------------------- */

/** Geçmiş gözlemler (başlangıçtan önce) üzerinde mevsimsel saf ve üstel düzeltme. */
function benchmarkOccupancy(hospital, originIndex, observedNow) {
  const origin = hospital.obs[originIndex];
  const past = hospital.obs.slice(0, originIndex + 1);
  const hw = function (o) { const p = time.parts(o.ms); return p.hourOfWeek * 2 + (p.minute >= 30 ? 1 : 0); };
  const seasonalFor = function (targetMs) {
    const key = hw({ ms: targetMs });
    const same = past.filter(function (o) { return hw(o) === key && o.ms < origin.ms; }).map(function (o) { return o.occupancy; });
    return same.length ? mean(same) : observedNow;
  };
  let level = null;
  past.slice(-336).forEach(function (o) { level = level === null ? o.occupancy : SES_ALPHA * o.occupancy + (1 - SES_ALPHA) * level; });
  level = SES_ALPHA * observedNow + (1 - SES_ALPHA) * (level === null ? observedNow : level);
  return {
    persistence: function () { return observedNow; },
    seasonal: seasonalFor,
    ses: function () { return level; }
  };
}

function benchmarkWaits(hospital, originMs, input, cls) {
  const completed = [];
  Object.keys(hospital.probes).forEach(function (k) {
    const at = hospital.startMs + Number(k) * MS_PER_MINUTE;
    const w = hospital.probes[k][cls];
    if (w !== undefined && at + w * MS_PER_MINUTE <= originMs) completed.push({ at: at, w: w });
  });
  completed.sort(function (a, b) { return a.at - b.at; });
  const hw = function (ms) { const p = time.parts(ms); return p.hourOfWeek * 2 + (p.minute >= 30 ? 1 : 0); };
  let level = null;
  completed.slice(-336).forEach(function (c) { level = level === null ? c.w : SES_ALPHA * c.w + (1 - SES_ALPHA) * level; });
  const physicians = Math.max(1, input.activePhysicians || 1);
  const naiveLow = (input.greenWaiting || 0) / physicians * NAIVE_MINUTES_PER_PATIENT;
  return {
    seasonal: function (targetMs) {
      const same = completed.filter(function (c) { return hw(c.at) === hw(targetMs); }).map(function (c) { return c.w; });
      return same.length ? mean(same) : (level === null ? 0 : level);
    },
    ses: function () { return level === null ? 0 : level; },
    naive: cls === 'green' ? { lo: naiveLow, hi: naiveLow * NAIVE_SPREAD } : { lo: NAIVE_YELLOW[0], hi: NAIVE_YELLOW[1] }
  };
}

/* ---- Tek dünya ---------------------------------------------------------------------- */

/**
 * @returns {Object[]} kayıtlar: {phase, method, target, horizon, y, point, lo, hi, pHigh, seg, originMs, hospitalId, eveningMode}
 */
function evaluateWorld(world, plan, options) {
  const o = options || {};
  const records = [];
  const startMs = world.startMs;
  const calStart = startMs + plan.historyWeeks * 7 * 1440 * MS_PER_MINUTE;
  const testStart = calStart + plan.calWeeks * 7 * 1440 * MS_PER_MINUTE;
  const step = ORIGIN_EVERY_HOURS * 60 / simulator.PROBE_EVERY_MINUTES;
  const dirtyRng = rngLib.create('dirty/' + world.regime.id + '/' + (o.seed || 0));
  world.hospitals.forEach(function (hospital) {
    hospital.startMs = startMs;
    const byMs = {};
    hospital.obs.forEach(function (ob, i) { byMs[ob.ms] = i; });
    for (let i = 0; i < hospital.obs.length; i += step) {
      const origin = hospital.obs[i];
      if (origin.ms < calStart) continue;
      const phase = origin.ms < testStart ? 'cal' : 'test';
      const input = simulator.engineInput(world, hospital, i, dirtyRng);
      const result = engine.computeHospital(input, { nowMs: origin.ms, maxRuns: o.maxRuns || ENGINE_RUNS, minRuns: Math.min(300, o.maxRuns || ENGINE_RUNS), explain: false, ablate: o.ablate, seed: 'bt/' + hospital.spec.id + '/' + origin.ms });
      if (result.level === 'unknown') continue;
      const observedNow = observedOccupancy(input, origin.ms);
      const occB = benchmarkOccupancy(hospital, i, observedNow);
      const waitB = { green: benchmarkWaits(hospital, origin.ms, input, 'green'), yellow: benchmarkWaits(hospital, origin.ms, input, 'yellow') };
      const evening = result.evening;
      const targets = HORIZONS.map(function (h) { return { key: String(h), minutes: h }; });
      if (evening.mode !== 'passed') targets.push({ key: 'evening', minutes: evening.leadMinutes, mode: evening.mode });
      targets.forEach(function (t) {
        const targetMs = origin.ms + t.minutes * MS_PER_MINUTE;
        const ti = byMs[targetMs];
        if (ti === undefined) return;
        const truth = hospital.obs[ti];
        const h = result.horizons[t.key];
        const p = time.parts(targetMs);
        const seg = { heavy: truth.rho >= HEAVY_RHO, weekend: p.isWeekend, night: p.hour >= 22 || p.hour < 8 };
        const base = { phase: phase, horizon: t.key, originMs: origin.ms, hospitalId: hospital.spec.id, seg: seg, eveningMode: t.mode || null, tier: result.tier };
        // Doluluk
        const y = cap100(truth.occupancy);
        records.push(Object.assign({ method: 'engine', target: 'occupancy', y: y, point: h.occupancy.p50, lo: h.occupancy.p10, hi: h.occupancy.p90, pHigh: h.occupancy.levelShares.high, daypart: time.daypart(targetMs) }, base));
        records.push(Object.assign({ method: 'persistence', target: 'occupancy', y: y, point: cap100(occB.persistence()) }, base));
        records.push(Object.assign({ method: 'seasonal', target: 'occupancy', y: y, point: cap100(occB.seasonal(targetMs)) }, base));
        records.push(Object.assign({ method: 'ses', target: 'occupancy', y: y, point: cap100(occB.ses()) }, base));
        // Bekleme
        const probe = hospital.probes[truth.m];
        ['green', 'yellow'].forEach(function (cls) {
          if (!probe || probe[cls] === undefined) return;
          const target = cls === 'green' ? 'waitGreen' : 'waitYellow';
          const yw = probe[cls];
          const hw = h[target];
          const wb = waitB[cls];
          records.push(Object.assign({ method: 'engine', target: target, y: yw, point: hw.p50, lo: hw.p10, hi: hw.p90, daypart: time.daypart(targetMs) }, base));
          records.push(Object.assign({ method: 'naive', target: target, y: yw, point: (wb.naive.lo + wb.naive.hi) / 2, lo: wb.naive.lo, hi: wb.naive.hi }, base));
          records.push(Object.assign({ method: 'seasonal', target: target, y: yw, point: wb.seasonal(targetMs) }, base));
          records.push(Object.assign({ method: 'ses', target: target, y: yw, point: wb.ses() }, base));
        });
      });
    }
  });
  return records;
}

/* ---- Aralıklar: motor için conformal, kıyaslar için ayar dönemi artıkları ------------- */

function attachIntervals(records) {
  const cal = records.filter(function (r) { return r.phase === 'cal'; });
  const table = calibrate.fit(cal.filter(function (r) { return r.method === 'engine'; }).map(function (r) {
    return { target: r.target, horizon: r.horizon, daypart: r.daypart, y: r.y, point: r.point, lo: r.lo, hi: r.hi };
  }));
  const residuals = {};
  cal.forEach(function (r) {
    if (r.method === 'engine' || r.lo !== undefined) return;
    const k = r.method + '|' + r.target + '|' + r.horizon;
    (residuals[k] = residuals[k] || []).push(r.y - r.point);
  });
  const residualQ = {};
  Object.keys(residuals).forEach(function (k) { residualQ[k] = [quantileOf(residuals[k], 0.1), quantileOf(residuals[k], 0.9)]; });
  const out = [];
  records.forEach(function (r) {
    if (r.phase !== 'test') return;
    if (r.method === 'engine') {
      const a = calibrate.apply(table, r.target, r.horizon, r.daypart, r.point, r.lo, r.hi, 0, r.target === 'occupancy' ? 100 : undefined);
      out.push(Object.assign({}, r, { method: 'engine-raw' }));
      out.push(Object.assign({}, r, { point: a.point, lo: a.lo, hi: a.hi, calibrated: a.applied }));
      return;
    }
    if (r.lo === undefined) {
      const q = residualQ[r.method + '|' + r.target + '|' + r.horizon];
      if (q) out.push(Object.assign({}, r, { lo: Math.max(0, r.point + q[0]), hi: r.point + q[1] }));
      else out.push(r);
      return;
    }
    out.push(r);
  });
  return { test: out, table: table };
}

/* ---- Ölçüler -------------------------------------------------------------------------- */

function pinball(y, q, tau) {
  return y >= q ? tau * (y - q) : (1 - tau) * (q - y);
}

function metrics(list, levels) {
  if (!list.length) return null;
  const L = levels || config.LEVELS;
  const err = list.map(function (r) { return r.point - r.y; });
  const withInt = list.filter(function (r) { return isFinite(r.lo) && isFinite(r.hi); });
  const m = {
    n: list.length,
    mae: mean(err.map(Math.abs)),
    rmse: Math.sqrt(mean(err.map(function (e) { return e * e; }))),
    bias: mean(err),
    pinball50: mean(list.map(function (r) { return pinball(r.y, r.point, 0.5); }))
  };
  if (withInt.length) {
    m.pinball10 = mean(withInt.map(function (r) { return pinball(r.y, r.lo, 0.1); }));
    m.pinball90 = mean(withInt.map(function (r) { return pinball(r.y, r.hi, 0.9); }));
    m.coverage = mean(withInt.map(function (r) { return r.y >= r.lo && r.y <= r.hi ? 1 : 0; }));
    m.width = mean(withInt.map(function (r) { return r.hi - r.lo; }));
  }
  if (list[0].target === 'occupancy') {
    const lv = function (v) { return occupancyLib.level(v, L); };
    const confusion = { low: { low: 0, medium: 0, high: 0 }, medium: { low: 0, medium: 0, high: 0 }, high: { low: 0, medium: 0, high: 0 } };
    let correct = 0;
    list.forEach(function (r) {
      const t = lv(r.y);
      const p = lv(r.point);
      confusion[t][p] += 1;
      if (t === p) correct += 1;
    });
    m.levelAccuracy = correct / list.length;
    m.confusion = confusion;
  }
  return m;
}

function reliability(list) {
  const bins = [[0, 0.1], [0.1, 0.3], [0.3, 0.5], [0.5, 0.7], [0.7, 0.9], [0.9, 1.0001]];
  return bins.map(function (b) {
    const inBin = list.filter(function (r) { return r.pHigh >= b[0] && r.pHigh < b[1]; });
    return { from: b[0], to: Math.min(1, b[1]), n: inBin.length, predicted: mean(inBin.map(function (r) { return r.pHigh; })), observed: mean(inBin.map(function (r) { return r.y >= config.LEVELS.HIGH_FROM ? 1 : 0; })) };
  });
}

function group(records, keyFn) {
  const g = {};
  records.forEach(function (r) { const k = keyFn(r); (g[k] = g[k] || []).push(r); });
  return g;
}

function summarizeRun(test) {
  const out = { overall: {}, segments: {}, reliability: {}, thresholds: {}, evening: {}, tiers: {} };
  const byKey = group(test, function (r) { return r.method + '|' + r.target + '|' + r.horizon; });
  Object.keys(byKey).forEach(function (k) { out.overall[k] = metrics(byKey[k]); });
  ['heavy', 'weekend', 'night'].forEach(function (s) {
    [true, false].forEach(function (v) {
      const sub = test.filter(function (r) { return r.seg[s] === v; });
      const g = group(sub, function (r) { return r.method + '|' + r.target + '|' + r.horizon; });
      Object.keys(g).forEach(function (k) { out.segments[s + '=' + v + '|' + k] = metrics(g[k]); });
    });
  });
  const engineOcc = test.filter(function (r) { return r.method === 'engine' && r.target === 'occupancy'; });
  ['0', '60', '120', '240', 'evening'].forEach(function (h) { out.reliability[h] = reliability(engineOcc.filter(function (r) { return r.horizon === h; })); });
  LEVEL_SETS.forEach(function (ls) {
    const sub = engineOcc.filter(function (r) { return r.horizon === '120'; });
    const m = metrics(sub, ls);
    const dist = { low: 0, medium: 0, high: 0 };
    sub.forEach(function (r) { dist[occupancyLib.level(r.y, ls)] += 1; });
    out.thresholds[ls.id] = { levelAccuracy: m ? m.levelAccuracy : null, truthShare: { low: dist.low / sub.length, medium: dist.medium / sub.length, high: dist.high / sub.length } };
  });
  ['simulated', 'seasonal'].forEach(function (mode) {
    const sub = test.filter(function (r) { return r.horizon === 'evening' && r.eveningMode === mode; });
    const g = group(sub, function (r) { return r.method + '|' + r.target; });
    Object.keys(g).forEach(function (k) { out.evening[mode + '|' + k] = metrics(g[k]); });
  });
  const tiers = group(engineOcc.filter(function (r) { return r.horizon === '120'; }), function (r) { return r.tier; });
  Object.keys(tiers).forEach(function (t) { out.tiers[t] = metrics(tiers[t]); });
  // Kayma denetimi: 120 dk mutlak hata, zaman sırasıyla, hastane başına
  const drift = {};
  const perHospital = group(engineOcc.filter(function (r) { return r.horizon === '120'; }), function (r) { return r.hospitalId; });
  Object.keys(perHospital).forEach(function (hid) {
    const series = perHospital[hid].sort(function (a, b) { return a.originMs - b.originMs; }).map(function (r) { return Math.abs(r.point - r.y); });
    drift[hid] = calibrate.pageHinkley(series);
  });
  out.drift = drift;
  return out;
}

/* ---- Rejim × tohum ------------------------------------------------------------------ */

function runOne(regime, seed, options) {
  const plan = PLAN[regime];
  const started = Date.now();
  const world = simulator.simulateWorld({ regime: regime, seed: seed, startMs: Date.parse(plan.startIso), weeks: plan.weeks, hospitals: 2 });
  const records = evaluateWorld(world, plan, Object.assign({ seed: seed }, options));
  const intervals = attachIntervals(records);
  const summary = summarizeRun(intervals.test);
  const loads = world.hospitals.map(function (h) { return { id: h.spec.id, meanOccupancy: mean(h.obs.map(function (o) { return o.occupancy; })), heavyShare: mean(h.obs.map(function (o) { return o.rho >= HEAVY_RHO ? 1 : 0; })) }; });
  return { regime: regime, seed: seed, ablate: options && options.ablate || null, seconds: (Date.now() - started) / 1000, loads: loads,
    calibrationCells: Object.keys(intervals.table.cells).length, summary: summary };
}

/* ---- Gerçek veri: CSV --------------------------------------------------------------- */

const CSV_COLUMNS = ['timestamp', 'hospitalId', 'greenWaiting', 'yellowWaiting', 'activePhysicians', 'arrivalsLastHour', 'boarding', 'bedCapacity'];

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(function (l) { return l.trim(); });
  const sep = lines[0].indexOf(';') !== -1 ? ';' : ',';
  const head = lines[0].replace(/^﻿/, '').split(sep).map(function (h) { return h.trim(); });
  CSV_COLUMNS.forEach(function (c) { if (head.indexOf(c) === -1) throw new Error('CSV sütunu eksik: ' + c); });
  return lines.slice(1).map(function (line) {
    const cells = line.split(sep);
    const row = {};
    head.forEach(function (h, i) { row[h] = cells[i] === undefined || cells[i] === '' ? null : cells[i].trim(); });
    return row;
  });
}

/** CSV satırlarını simülatör dünyası biçimine çevirir (aynı değerlendirme hattı). */
function worldFromCsv(rows) {
  const num = function (v) { return v === null ? null : Number(v); };
  const byHospital = group(rows, function (r) { return r.hospitalId; });
  const hospitals = Object.keys(byHospital).map(function (id) {
    const list = byHospital[id].map(function (r) { return Object.assign({}, r, { ms: Date.parse(r.timestamp) }); })
      .filter(function (r) { return isFinite(r.ms); }).sort(function (a, b) { return a.ms - b.ms; });
    const start = list[0].ms;
    const obs = [];
    const probes = {};
    const hourly = [];
    list.forEach(function (r) {
      const m = Math.round((r.ms - start) / MS_PER_MINUTE);
      const physicians = num(r.activePhysicians) || 1;
      const cap = occupancyLib.capacity(num(r.bedCapacity), physicians);
      const waiting = { red: 0, yellow: num(r.yellowWaiting) || 0, green: num(r.greenWaiting) || 0 };
      const inService = r.inService !== undefined && r.inService !== null ? num(r.inService) : Math.round(physicians * config.DEFAULTS.IN_SERVICE_SHARE);
      obs.push({ m: m, ms: r.ms, waiting: waiting, inService: inService, boarding: num(r.boarding) || 0, physicians: physicians,
        bedCapacity: num(r.bedCapacity), arrivalsLastHour: num(r.arrivalsLastHour),
        occupancy: (waiting.green + waiting.yellow + Math.min(inService, physicians) + (num(r.boarding) || 0)) / cap * 100, rho: 0 });
      if (r.greenWaitObserved !== undefined || r.yellowWaitObserved !== undefined) probes[m] = { green: num(r.greenWaitObserved), yellow: num(r.yellowWaitObserved) };
      if (r.arrivalsLastHour !== null && time.parts(r.ms).minute === 0) hourly.push({ startMs: r.ms - 3600000, arrivals: num(r.arrivalsLastHour) });
    });
    return { spec: { id: id, bedCapacity: null, roster: null }, obs: obs, probes: probes, hourly: hourly, startMs: start };
  });
  return { regime: { id: 'CSV', name: 'gerçek veri (CSV)' }, startMs: hospitals[0].startMs, hospitals: hospitals };
}

function csvEngineInput(world, hospital, i) {
  const o = hospital.obs[i];
  return { hospitalId: hospital.spec.id, updatedAtMs: o.ms, dataSource: 'hospital', activePhysicians: o.physicians, greenWaiting: o.waiting.green,
    yellowWaiting: o.waiting.yellow, boarding: o.boarding, bedCapacity: o.bedCapacity, arrivalsLastHour: o.arrivalsLastHour,
    history: hospital.hourly.filter(function (x) { return x.startMs + 3600000 <= o.ms; }).slice(-config.DEMAND.MAX_HISTORY_HOURS) };
}

function runCsv(file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const world = worldFromCsv(rows);
  const original = simulator.engineInput;
  simulator.engineInput = csvEngineInput;   // aynı hat, CSV girdisiyle
  try {
    const spanWeeks = (world.hospitals[0].obs[world.hospitals[0].obs.length - 1].ms - world.startMs) / (7 * 1440 * MS_PER_MINUTE);
    const plan = { historyWeeks: Math.max(1, Math.floor(spanWeeks * 0.4)), calWeeks: Math.max(1, Math.floor(spanWeeks * 0.3)) };
    world.hospitals.forEach(function (h) { h.startMs = world.startMs; });
    const records = evaluateWorld(world, plan, { seed: 'csv' });
    const intervals = attachIntervals(records);
    return { regime: 'CSV', seed: 'csv', file: path.basename(file), weeks: spanWeeks, summary: summarizeRun(intervals.test) };
  } finally {
    simulator.engineInput = original;
  }
}

function makeSampleCsv(file) {
  const world = simulator.simulateWorld({ regime: 'A', seed: 'csv', startMs: Date.parse(PLAN.A.startIso), weeks: 6, hospitals: 1 });
  const h = world.hospitals[0];
  const lines = [CSV_COLUMNS.concat(['inService', 'greenWaitObserved', 'yellowWaitObserved']).join(';')];
  h.obs.forEach(function (o) {
    const hourIdx = Math.floor(o.m / 60) - 1;
    const arrivals = hourIdx >= 0 && h.hourly[hourIdx] ? h.hourly[hourIdx].arrivals : '';
    const pr = h.probes[o.m] || {};
    lines.push([engine.toIso(o.ms), 'ornek-csv-01', o.waiting.green, o.waiting.yellow, o.physicians, arrivals, o.boarding, h.spec.bedCapacity, o.inService,
      pr.green === undefined ? '' : pr.green, pr.yellow === undefined ? '' : pr.yellow].join(';'));
  });
  fs.writeFileSync(file, '﻿' + lines.join('\n') + '\n');
}

/* ---- Komut satırı -------------------------------------------------------------------- */

function main() {
  const args = process.argv.slice(2);
  const outDir = path.join(__dirname, '..', 'out');
  fs.mkdirSync(outDir, { recursive: true });
  if (args[0] === '--make-sample-csv') {
    makeSampleCsv(args[1] || path.join(outDir, 'ornek-veri.csv'));
    console.log('Örnek CSV yazıldı.');
    return;
  }
  if (args[0] === '--csv') {
    const result = runCsv(args[1]);
    fs.writeFileSync(path.join(outDir, 'backtest-csv.json'), JSON.stringify({ when: new Date().toISOString(), modelVersion: config.MODEL_VERSION, source: 'csv', runs: [result] }, null, 2));
    console.log('CSV geriye dönük testi tamam: motor/out/backtest-csv.json');
    return;
  }
  const quick = args.indexOf('--quick') !== -1;
  const seeds = quick ? [1, 2] : [1, 2, 3, 4, 5];
  const regimes = ['A', 'B', 'C', 'D'];
  const runs = [];
  regimes.forEach(function (rg) {
    seeds.forEach(function (seed) {
      const r = runOne(rg, seed);
      runs.push(r);
      console.log('rejim ' + rg + ' tohum ' + seed + ' — ' + r.seconds.toFixed(0) + ' sn');
    });
  });
  const ablations = [];
  if (!quick && args.indexOf('--no-ablation') === -1) {
    const variants = [{ id: 'ani-artis-kapali', ablate: { surge: false } }, { id: 'ogrenme-kapali', ablate: { learning: false } },
      { id: 'parametre-belirsizligi-kapali', ablate: { paramUncertainty: false } }, { id: 'yatak-kisiti-kapali', ablate: { bedBlocking: false } },
      { id: 'bayram-etkisi-kapali', ablate: { holiday: false } }];
    variants.forEach(function (v) {
      ['A', 'B', 'C'].forEach(function (rg) {
        [1, 2].forEach(function (seed) {
          const r = runOne(rg, seed, { ablate: v.ablate });
          r.variant = v.id;
          ablations.push(r);
          console.log('kapatma ' + v.id + ' rejim ' + rg + ' tohum ' + seed + ' — ' + r.seconds.toFixed(0) + ' sn');
        });
      });
    });
  }
  const payload = { when: new Date().toISOString(), modelVersion: config.MODEL_VERSION, source: 'synthetic', engineRuns: ENGINE_RUNS,
    plan: PLAN, regimes: simulator.REGIMES, runs: runs, ablations: ablations };
  fs.writeFileSync(path.join(outDir, 'backtest.json'), JSON.stringify(payload));
  console.log('Tamam: motor/out/backtest.json');
}

if (require.main === module) main();

module.exports = { runOne: runOne, runCsv: runCsv, metrics: metrics, parseCsv: parseCsv, makeSampleCsv: makeSampleCsv, PLAN: PLAN };

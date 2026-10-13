/* =============================================================================
 * motor/tools/simulator.js
 * NE İŞE YARAR : "Gerçekliği" üreten SENTETİK DÜNYA. Motorun bilmediği parametreler
 *   ve motorun KENDİ model ailesinden FARKLI mekanizmalarla acil servis işleyişini
 *   dakika dakika benzetir; geriye dönük test (tools/backtest.js) bunu "gerçek" sayar.
 *
 *   NEDEN AYRI KOD: Motoru yalnız kendi modeliyle üretilmiş veride sınamak DÖNGÜSELDİR
 *   (iyi görünür ama bir şey kanıtlamaz). Bu dosya motorun kuyruk kodunu KULLANMAZ;
 *   dakika adımlı ayrı bir benzetimdir. Yalnız tohumlu rastgele sayı üreteci ve
 *   takvim (gün türü) ortaktır.
 *
 *   GERÇEKLİK REJİMLERİ
 *   A "kendi ailesi"   : Poisson geliş, log-normal hizmet — motorun varsayım ailesi; ama
 *                        parametreler motorun öncülünden FARKLI (yalnız kontrol amaçlı)
 *   B "ağır kuyruk"    : dalgalar hâlinde kaza patlamaları (toplu geliş), Gamma/Weibull
 *                        karışımı hizmet, vardiya devrinde hekim düşüşü, kaymış saat örüntüsü
 *   C "tıkanma+bayram" : yüksek yatış oranı ve uzun (ağır kuyruklu) yatış bekleme →
 *                        yatak tıkanması; bayramda düşüş, bayram ertesi yığılma; haftalar
 *                        içinde sınıf payı kayması; yüksek vazgeçme
 *   D "kirli veri"     : B dünyası + gözlemlerde eksik alan, gürültü ve gecikme
 *
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: rejim tanımları → REGIMES; dünya → simulateWorld().
 * NOT: Burada üretilen hiçbir sayı gerçek bir hastaneye ait DEĞİLDİR.
 * ========================================================================== */
'use strict';

const rngLib = require('../core/rng.js');
const time = require('../core/time.js');

const MS_PER_MINUTE = 60000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_WEEK = 10080;
const PROBE_EVERY_MINUTES = 30;   // her 30 dk'da gözlem + ölçüm hastası
const CLASSES = ['red', 'yellow', 'green'];

/* ---- Rejimler ------------------------------------------------------------------- */

// Motorun öncülünden bilerek farklı saat örüntüleri (göreli; ortalama 1'e ölçeklenir)
const PROFILE_A = [0.6, 0.5, 0.42, 0.38, 0.36, 0.4, 0.55, 0.8, 1.05, 1.2, 1.3, 1.3, 1.28, 1.25, 1.22, 1.2, 1.22, 1.28, 1.32, 1.3, 1.2, 1.05, 0.88, 0.72];
const PROFILE_B = [0.7, 0.6, 0.5, 0.42, 0.38, 0.38, 0.45, 0.6, 0.85, 1.05, 1.15, 1.2, 1.2, 1.2, 1.22, 1.25, 1.3, 1.38, 1.45, 1.5, 1.45, 1.3, 1.1, 0.88];

const REGIMES = {
  A: { id: 'A', name: 'kendi ailesi (kontrol)', profile: PROFILE_A, weekday: [1.08, 1, 1, 0.98, 0.98, 0.95, 1.01],
    service: 'lognormal', bursts: false, handoverDip: false, holiday: false, admit: { red: 0.45, yellow: 0.15, green: 0.02 },
    boarding: { median: 140, sigma: 0.6 }, patience: { yellow: 500, green: 160 }, mixDrift: 0 },
  B: { id: 'B', name: 'ağır kuyruk + patlama + vardiya devri', profile: PROFILE_B, weekday: [1.15, 1.02, 0.97, 0.95, 0.97, 1.02, 1.1],
    service: 'gammaWeibull', bursts: true, handoverDip: true, holiday: false, admit: { red: 0.5, yellow: 0.18, green: 0.03 },
    boarding: { median: 160, sigma: 0.8 }, patience: { yellow: 420, green: 140 }, mixDrift: 0 },
  C: { id: 'C', name: 'yatak tıkanması + bayram + sınıf kayması', profile: PROFILE_A, weekday: [1.1, 1, 0.98, 0.97, 0.99, 1, 1.03],
    service: 'lognormal', bursts: false, handoverDip: false, holiday: true, admit: { red: 0.6, yellow: 0.28, green: 0.04 },
    boarding: { median: 260, sigma: 1.0 }, patience: { yellow: 300, green: 90 }, mixDrift: 0.1 },
  D: { id: 'D', name: 'kirli veri (B dünyası + bozuk gözlem)', base: 'B', dirty: true }
};

function regimeSpec(id) {
  const r = REGIMES[id];
  return r.base ? Object.assign({}, REGIMES[r.base], { id: id, name: r.name, dirty: true }) : r;
}

/* ---- Hastane (dünya parametreleri; motor bunları BİLMEZ) ---------------------- */

function makeHospital(rng, index, regime) {
  const day = 5 + Math.floor(rng.uniform() * 4);           // 08–16 hekim
  const roster = [
    { from: 480, to: 960, count: day },
    { from: 960, to: 1440, count: Math.max(3, day - 1) },
    { from: 0, to: 480, count: Math.max(2, day - 3) }
  ];
  const meanPhysicians = (day * 8 + Math.max(3, day - 1) * 8 + Math.max(2, day - 3) * 8) / 24;
  return {
    id: 'sentetik-' + regime.id + '-' + index,
    roster: roster,
    bedCapacity: Math.round(meanPhysicians * (3.5 + rng.uniform() * 2.5)),
    // Yük: ortalama ρ ≈ 0,6–0,9 olacak biçimde saatlik geliş (motorun öncülü 2,4/hekim)
    arrivalsPerPhysicianHour: 2.3 + rng.uniform() * 1.6,
    meanPhysicians: meanPhysicians,
    serviceMedian: { red: 30 + rng.uniform() * 15, yellow: 15 + rng.uniform() * 8, green: 7 + rng.uniform() * 5 },
    mix: { red: 0.04 + rng.uniform() * 0.03, yellow: 0.3 + rng.uniform() * 0.1 }
  };
}

function normalize(list) {
  const mean = list.reduce(function (a, b) { return a + b; }, 0) / list.length;
  return list.map(function (v) { return v / mean; });
}

/* ---- Dünya benzetimi (dakika adımlı) ------------------------------------------- */

function rosterCount(roster, minuteOfDay) {
  for (let i = 0; i < roster.length; i++) {
    const b = roster[i];
    if (minuteOfDay >= b.from && minuteOfDay < b.to) return b.count;
  }
  return roster[roster.length - 1].count;
}

function serviceTime(regime, h, cls, rng) {
  const median = h.serviceMedian[cls];
  if (regime.service === 'gammaWeibull') {
    // Karışım: %70 Gamma(şekil 1,6), %30 Weibull(k 0,8) — ağır kuyruklu
    if (rng.uniform() < 0.7) return rng.gamma(1.6, median / 1.3);
    const scale = median * 1.4;
    return scale * Math.pow(-Math.log(rng.uniform()), 1 / 0.8);
  }
  return rng.lognormal(Math.log(median), 0.55);
}

/**
 * @param {Object} o { regime:'A'|'B'|'C'|'D', seed, startMs, weeks, hospitals }
 * @returns {{regime, hospitals:[{spec, obs:[], probes:{}, hourly:[]}]}}
 */
function simulateWorld(o) {
  const regime = regimeSpec(o.regime);
  const rng = rngLib.create('world/' + regime.id + '/' + o.seed);
  const profile = normalize(regime.profile);
  const weekday = normalize(regime.weekday);
  const minutes = o.weeks * MINUTES_PER_WEEK;
  const hospitals = [];
  for (let hi = 0; hi < o.hospitals; hi++) {
    const h = makeHospital(rng, hi, regime);
    const r = rng.fork('h' + hi);
    const lines = { red: [], yellow: [], green: [] };
    const docs = [];             // { remaining, cls, bed, leaving }
    const boarders = [];         // kalan dakika
    const hourly = [];
    const obs = [];
    const probes = {};           // dakika → { green, yellow } gerçek bekleme
    const probeLines = { yellow: [], green: [] };
    let arrivalsThisHour = 0;
    let burstLeft = 0;
    let nextId = 0;             // sıra numarası (ölçüm hastası önündekileri bununla izler)

    for (let m = 0; m < minutes; m++) {
      const ms = o.startMs + m * MS_PER_MINUTE;
      const p = time.parts(ms);
      const type = regime.holiday ? time.dayInfo(ms).type : null;
      // ---- hekim sayısı (vardiya + devir düşüşü) ----
      let target = rosterCount(h.roster, p.minuteOfDay);
      if (regime.handoverDip && [480, 960, 0].some(function (b) { return p.minuteOfDay >= b && p.minuteOfDay < b + 30; })) target = Math.max(1, target - 2);
      const active = docs.filter(function (d) { return !d.leaving; });
      if (active.length < target) for (let k = active.length; k < target; k++) docs.push({ remaining: 0, cls: null, bed: false, leaving: false });
      if (active.length > target) {
        let extra = active.length - target;
        active.forEach(function (d) { if (extra > 0 && !d.cls) { d.leaving = true; extra -= 1; } });
        active.forEach(function (d) { if (extra > 0 && !d.leaving) { d.leaving = true; extra -= 1; } });
      }
      // ---- gelişler ----
      let dayFactor = 1;
      if (type === 'religious') dayFactor = 0.85;
      if (type === 'postReligious') dayFactor = 1.35;
      if (type === 'official') dayFactor = 0.92;
      const drift = regime.mixDrift * (m / minutes);   // yeşil payı zamanla azalır
      const mixRed = h.mix.red;
      const mixYellow = h.mix.yellow + drift;
      const lambda = h.arrivalsPerPhysicianHour * h.meanPhysicians * profile[p.hour] * weekday[p.weekday] * dayFactor / MINUTES_PER_HOUR;
      let n = r.poisson(lambda);
      if (regime.bursts) {
        if (burstLeft === 0 && r.uniform() < 0.15 / MINUTES_PER_HOUR) burstLeft = 3 + Math.floor(r.uniform() * 8);
        if (burstLeft > 0) {
          const k = Math.min(burstLeft, 1 + Math.floor(r.uniform() * 3));
          burstLeft -= k;
          for (let i = 0; i < k; i++) lines[r.uniform() < 0.35 ? 'red' : 'yellow'].push({ id: nextId++, arrival: m, deadline: Infinity });
          arrivalsThisHour += k;
        }
      }
      for (let i = 0; i < n; i++) {
        const u = r.uniform();
        const cls = u < mixRed ? 'red' : u < mixRed + mixYellow ? 'yellow' : 'green';
        const patienceMean = regime.patience[cls];
        lines[cls].push({ id: nextId++, arrival: m, deadline: patienceMean ? m - patienceMean * Math.log(r.uniform()) : Infinity });
      }
      arrivalsThisHour += n;
      // ---- vazgeçme ----
      CLASSES.forEach(function (c) { lines[c] = lines[c].filter(function (x) { return x.deadline > m; }); });
      // ---- hizmet ve yatış bitişleri ----
      for (let i = boarders.length - 1; i >= 0; i--) { boarders[i] -= 1; if (boarders[i] <= 0) boarders.splice(i, 1); }
      docs.forEach(function (d) {
        if (!d.cls) return;
        d.remaining -= 1;
        if (d.remaining > 0) return;
        if (r.uniform() < regime.admit[d.cls]) boarders.push(r.lognormal(Math.log(regime.boarding.median), regime.boarding.sigma));
        d.cls = null;
        d.bed = false;
      });
      for (let i = docs.length - 1; i >= 0; i--) if (docs[i].leaving && !docs[i].cls) docs.splice(i, 1);
      // ---- gözlem anı: önce ölçüm hastası eklenir ----
      if (m % PROBE_EVERY_MINUTES === 0) {
        probes[m] = {};
        // Ölçüm hastası: o an sıradaki son hastanın arkasına girer (önündekiler = id ≤ lastId)
        probeLines.green.push({ at: m, lastId: nextId - 1 });
        probeLines.yellow.push({ at: m, lastId: nextId - 1 });
      }
      // ---- muayeneye alma (öncelik + yatak kısıtı) ----
      // Ölçüm hastası (süresi sıfır): boş hekim kendi sınıfına geldiğinde, önündeki aynı
      // sınıf hastalar gitmişse (muayene ya da vazgeçme) anında "muayene edilir".
      const bedsUsed = function () { return boarders.length + docs.filter(function (d) { return d.bed; }).length; };
      const resolveProbes = function (c) {
        if (!probeLines[c]) return;
        const head = lines[c].length ? lines[c][0].id : Infinity;
        probeLines[c] = probeLines[c].filter(function (pr) {
          if (head > pr.lastId) { probes[pr.at][c] = m - pr.at; return false; }
          return true;
        });
      };
      docs.forEach(function (d) {
        if (d.cls || d.leaving) return;
        for (let ci = 0; ci < CLASSES.length; ci++) {
          const c = CLASSES[ci];
          const needsBed = c !== 'green';
          if (needsBed && bedsUsed() >= h.bedCapacity) continue;
          resolveProbes(c);
          if (!lines[c].length) continue;
          lines[c].shift();
          d.cls = c;
          d.bed = needsBed;
          d.remaining = Math.max(1, Math.round(serviceTime(regime, h, c, r)));
          break;
        }
      });
      ['yellow', 'green'].forEach(function (c) {
        probeLines[c] = probeLines[c].filter(function (pr) {
          if (m - pr.at >= 1440) { probes[pr.at][c] = 1440; return false; }   // üst sınır
          return true;
        });
      });
      // ---- kayıtlar ----
      if ((m + 1) % MINUTES_PER_HOUR === 0) {
        hourly.push({ startMs: ms - (MINUTES_PER_HOUR - 1) * MS_PER_MINUTE, arrivals: arrivalsThisHour });
        arrivalsThisHour = 0;
      }
      if (m % PROBE_EVERY_MINUTES === 0) {
        const inService = docs.filter(function (d) { return d.cls; }).length;
        const waiting = { red: lines.red.length, yellow: lines.yellow.length, green: lines.green.length };
        const occupants = waiting.red + waiting.yellow + waiting.green + inService + boarders.length;
        const physicians = docs.filter(function (d) { return !d.leaving; }).length;
        const meanService = h.mix.red * h.serviceMedian.red * 1.16 + mixYellow * h.serviceMedian.yellow * 1.16 + (1 - h.mix.red - mixYellow) * h.serviceMedian.green * 1.16;
        obs.push({ m: m, ms: ms, waiting: waiting, inService: inService, boarding: boarders.length, physicians: Math.max(physicians, target),
          occupancy: occupants / h.bedCapacity * 100, rho: lambda * meanService / Math.max(1, target) });
      }
    }
    hospitals.push({ spec: h, obs: obs, probes: probes, hourly: hourly });
  }
  return { regime: regime, startMs: o.startMs, weeks: o.weeks, hospitals: hospitals };
}

/**
 * Motor girdisi: gözlem anındaki toplu sayılar (hasta bazlı alan YOK).
 * Kirli veri rejiminde alan düşürme, gürültü ve gecikme eklenir.
 */
function engineInput(world, hospital, obsIndex, rng) {
  const o = hospital.obs[obsIndex];
  const history = hospital.hourly.filter(function (x) { return x.startMs + 3600000 <= o.ms; }).slice(-24 * 28);
  const input = {
    hospitalId: hospital.spec.id,
    updatedAtMs: o.ms,
    dataSource: 'hospital',
    activePhysicians: o.physicians,
    greenWaiting: o.waiting.green,
    yellowWaiting: o.waiting.yellow,
    inService: o.inService,
    boarding: o.boarding,
    bedCapacity: hospital.spec.bedCapacity,
    physicianSchedule: hospital.spec.roster,
    history: history
  };
  if (world.regime.dirty && rng) {
    if (rng.uniform() < 0.3) delete input.inService;
    if (rng.uniform() < 0.3) delete input.boarding;
    if (rng.uniform() < 0.2) delete input.bedCapacity;
    if (rng.uniform() < 0.2) input.history = [];
    if (rng.uniform() < 0.3) input.greenWaiting = Math.max(0, Math.round(input.greenWaiting * (0.7 + rng.uniform() * 0.6)));
    if (rng.uniform() < 0.1) input.greenWaiting = input.greenWaiting * 10;   // yazım hatası (aykırı)
    input.updatedAtMs = o.ms - Math.round(rng.uniform() * 25) * MS_PER_MINUTE;  // gecikmeli bildirim
  }
  return input;
}

module.exports = { simulateWorld: simulateWorld, engineInput: engineInput, REGIMES: REGIMES, PROBE_EVERY_MINUTES: PROBE_EVERY_MINUTES };

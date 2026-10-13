/* =============================================================================
 * motor/core/index.js
 * NE İŞE YARAR : Motorun dışa açılan TEK girişi.
 *   computeHospital(input, options) → tek hastane: şimdi, ufuklar, akşam 20:00
 *   computeRegion(inputs, options)  → ≤ 200 hastane; önbellek + zaman sınırı
 *   toContract(result, slot)         → EK-1 sözleşme alanları (+ 1.2 isteğe bağlı alanlar)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: sözleşme eşlemesi → toContract(); sürüm → config.MODEL_VERSION.
 * KURALLAR: Her sayı TAHMİNDİR. Bayat veride sayı üretilmez. Örnek (simulated) veride
 *           isForecast:true ve simulated:true yazılır. Hasta bazlı alan yoktur.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./config.js'), require('./time.js'), require('./quality.js'), require('./demand.js'),
      require('./occupancy.js'), require('./forecast.js'), require('./calibrate.js'), require('./explain.js'), require('./fallback.js'));
  } else {
    const ns = root.AcilRadarMotor = root.AcilRadarMotor || {};
    ns.engine = factory(ns.config, ns.time, ns.quality, ns.demand, ns.occupancy, ns.forecast, ns.calibrate, ns.explain, ns.fallback);
  }
})(typeof self !== 'undefined' ? self : this, function (config, time, quality, demand, occupancy, forecast, calibrate, explainLib, fallback) {
  'use strict';

  const MS_PER_MINUTE = 60000;
  const SLOT_OFFSET = { now: 0, '2h': 120 };
  const MAX_WAIT_MINUTES = 1440;     // sözleşme sınırı
  const SHARE_DECIMALS = 100;

  function now() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /** ms → "2026-10-13T21:30:00+03:00" */
  function toIso(ms) {
    const p = time.parts(ms);
    const sec = Math.floor((ms % MS_PER_MINUTE + MS_PER_MINUTE) % MS_PER_MINUTE / 1000);
    return p.dateKey + 'T' + pad(p.hour) + ':' + pad(p.minute) + ':' + pad(sec) + '+03:00';
  }

  function uniqueSorted(list) {
    return list.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
  }

  function roundRange(lo, hi, max, minSpread) {
    const a = Math.max(0, Math.min(max, Math.round(lo)));
    const b = Math.max(a + (minSpread || 0), Math.min(max, Math.round(hi)));
    return [Math.min(a, max), Math.min(b, max)];
  }

  /** Kalibrasyon (varsa) uygulanmış horizon özeti. */
  function calibrated(h, table, key) {
    const daypart = time.daypart(h.atMs);
    const occ = calibrate.apply(table, 'occupancy', key, daypart, h.occupancy.p50, h.occupancy.p10, h.occupancy.p90, 0, 100);
    const wg = calibrate.apply(table, 'waitGreen', key, daypart, h.waitGreen.p50, h.waitGreen.p10, h.waitGreen.p90, 0);
    const wy = calibrate.apply(table, 'waitYellow', key, daypart, h.waitYellow.p50, h.waitYellow.p10, h.waitYellow.p90, 0);
    return {
      offset: h.offset,
      atMs: h.atMs,
      // point: kalibre edilmiş orta tahmin (kalibrasyon yoksa p50)
      occupancy: Object.assign({}, h.occupancy, { point: occ.point, lo: occ.lo, hi: occ.hi }),
      waitGreen: Object.assign({}, h.waitGreen, { point: wg.point, lo: wg.lo, hi: wg.hi }),
      waitYellow: Object.assign({}, h.waitYellow, { point: wy.point, lo: wy.lo, hi: wy.hi }),
      greenWaiting: h.greenWaiting,
      yellowWaiting: h.yellowWaiting,
      physicians: h.physicians,
      calibration: occ.applied ? occ.scope : 'none'
    };
  }

  function horizonKey(offset, eveningLead) {
    return offset === eveningLead ? 'evening' : String(offset);
  }

  /* ---- Tek hastane ---------------------------------------------------------------- */

  /**
   * @param {Object} input   (quality.js girdisi)
   * @param {Object} options
   * @param {number} options.nowMs           sunucu saati (ZORUNLU; motor saati okumaz)
   * @param {string} [options.seed]          verilmezse hastane + dakika (tekrarlanabilir)
   * @param {number} [options.maxRuns]
   * @param {number} [options.minRuns]
   * @param {boolean} [options.explain=true]
   * @param {Object} [options.calibration]   calibrate.fit() çıktısı
   * @param {string} [options.recentAccuracy] 'good'|'fair'|'poor'
   * @param {boolean} [options.waits=true]
   * @param {Object} [options.ablate]  YALNIZ doğrulama içindir (bileşen kapatma deneyi):
   *   { surge:false, learning:false, holiday:false, paramUncertainty:false, bedBlocking:false }
   */
  function computeHospital(input, options) {
    const o = options || {};
    const started = now();
    const nowMs = o.nowMs;
    const assessment = quality.assess(input, nowMs);
    const tier = fallback.tier(assessment);
    if (tier === 'unknown') {
      return Object.assign(fallback.unknownResult(assessment, config.MODEL_VERSION), {
        hospitalId: input && typeof input.hospitalId === 'string' ? input.hospitalId : null,
        warnings: assessment.warnings, timingMs: Math.round(now() - started)
      });
    }
    const record = assessment.record;
    const ablate = o.ablate || {};
    const seed = o.seed || record.hospitalId + '@' + Math.floor(nowMs / MS_PER_MINUTE);
    const FEAT = config.FEATURES;
    const on = function (key, featureFlag) { return ablate[key] !== undefined ? ablate[key] !== false : featureFlag; };
    const model = demand.learn(on('learning', FEAT.DEMAND_LEARNING) ? record : Object.assign({}, record, { history: [], arrivalsLastHour: null }), nowMs);
    const evening = time.eveningTarget(nowMs);
    const eveningInline = evening.available && !evening.longLead;
    const offsets = uniqueSorted(config.HORIZONS_MINUTES.concat(eveningInline ? [evening.leadMinutes] : []));
    const ablateNeutral = { surge: !on('surge', FEAT.SURGE_DETECTION), holiday: !on('holiday', FEAT.HOLIDAY_EFFECT) };
    const runOptions = { seed: seed, maxRuns: o.maxRuns, minRuns: o.minRuns, waits: o.waits,
      fixedParams: !on('paramUncertainty', FEAT.PARAM_UNCERTAINTY), noBedBlocking: !on('bedBlocking', FEAT.BED_BLOCKING) };

    let fc;
    if (tier === 'seasonal') {
      const warm = fallback.WARMUP_MINUTES;
      fc = forecast.run(record, model, Object.assign({ startMs: nowMs - warm * MS_PER_MINUTE, offsets: offsets.map(function (v) { return v + warm; }), neutral: Object.assign({ emptyStart: true }, ablateNeutral) }, runOptions));
      fc.horizons.forEach(function (h) { h.offset -= warm; });
    } else {
      fc = forecast.run(record, model, Object.assign({ startMs: nowMs, offsets: offsets, neutral: ablateNeutral }, runOptions));
    }

    const horizons = {};
    fc.horizons.forEach(function (h) {
      const key = horizonKey(h.offset, eveningInline ? evening.leadMinutes : null);
      horizons[key] = calibrated(h, o.calibration, key);
      if (key === 'evening') horizons[String(h.offset)] = horizons[key];
    });
    let eveningMode = evening.available ? (eveningInline ? 'simulated' : 'seasonal') : 'passed';
    if (evening.available && !eveningInline) {
      // Akşam çok uzaksa: yalnız mevsimsel öncül (boş sistemden ısınma)
      const warm = fallback.WARMUP_MINUTES;
      const sf = forecast.run(record, model, Object.assign({}, runOptions, { startMs: evening.ms - warm * MS_PER_MINUTE, offsets: [warm], neutral: Object.assign({ emptyStart: true }, ablateNeutral), maxRuns: config.SIMULATION.MIN_RUNS, seed: seed + '/evening' }));
      horizons.evening = calibrated(Object.assign(sf.horizons[0], { offset: evening.leadMinutes }), o.calibration, 'evening');
      eveningMode = 'seasonal';
    }

    const conf = quality.confidence({ ageMinutes: assessment.ageMinutes, dataSource: record.dataSource, assumedCore: assessment.assumedCore,
      missingOptional: assessment.missingOptional, recentAccuracy: o.recentAccuracy, tier: tier });
    const eveningConfidence = eveningMode === 'seasonal' ? 'low' : conf.level;

    const factors = {};
    if (o.explain !== false && tier !== 'seasonal') {
      const slots = [['now', 0], ['2h', SLOT_OFFSET['2h']]];
      if (eveningInline) slots.push(['evening', evening.leadMinutes]);
      slots.forEach(function (s) {
        factors[s[0]] = explainLib.explain(record, model, { startMs: nowMs, offset: s[1], seed: seed, dayInfo: time.dayInfo,
          baseNeutral: ablateNeutral, fixedParams: runOptions.fixedParams, noBedBlocking: runOptions.noBedBlocking });
      });
    }

    return {
      ok: true,
      modelVersion: config.MODEL_VERSION,
      hospitalId: record.hospitalId,
      definition: occupancy.definitionInfo(),
      tier: tier,
      confidence: conf.level,
      confidenceDetail: conf,
      eveningConfidence: eveningConfidence,
      assumedFields: assessment.assumedFields,
      warnings: assessment.warnings,
      dataSource: record.dataSource,
      simulated: record.dataSource === 'simulated',
      updatedAtMs: record.updatedAtMs,
      ageMinutes: Math.round(assessment.ageMinutes),
      nowMs: nowMs,
      horizons: horizons,
      evening: { mode: eveningMode, atMs: evening.ms, leadMinutes: evening.leadMinutes },
      earlyWarning: forecast.earlyWarning(fc.horizons),
      features: { surge: !ablateNeutral.surge, holiday: !ablateNeutral.holiday, paramUncertainty: !runOptions.fixedParams, bedBlocking: !runOptions.noBedBlocking },
      demand: { surge: model.surge, observedHours: model.observedHours, scale: model.scale, dayType: time.dayInfo(nowMs).type },
      factors: factors,
      runs: fc.runs,
      converged: fc.converged,
      censoredShare: fc.censoredShare,
      timingMs: Math.round(now() - started)
    };
  }

  /* ---- Sözleşme eşlemesi ------------------------------------------------------------ */

  /**
   * EK-1 alanlarını AYNEN üretir; 1.2 isteğe bağlı alanları ekler.
   * @param {Object} result computeHospital() çıktısı
   * @param {'now'|'2h'|'evening'} slot
   * @returns {?Object} sayı yoksa (bilinmiyor / akşam geçti) null
   */
  function toContract(result, slot) {
    if (!result || !result.ok || result.level === 'unknown') return null;
    const key = slot === 'evening' ? 'evening' : String(SLOT_OFFSET[slot]);
    const h = result.horizons[key];
    if (!h) return null;
    const occ = Math.round(h.occupancy.point);
    const simulated = result.simulated;
    const out = {
      occupancyPercent: occ,
      crowdingLevel: occupancy.level(occ),
      greenWaiting: Math.round(h.greenWaiting.p50 || 0),
      yellowWaiting: Math.round(h.yellowWaiting.p50 || 0),
      activePhysicians: Math.round(h.physicians.p50 || 0),
      estimatedGreenWaitMinutes: roundRange(h.waitGreen.lo, h.waitGreen.hi, MAX_WAIT_MINUTES, config.CONTRACT.MIN_WAIT_SPREAD_MINUTES),
      estimatedYellowWaitMinutes: roundRange(h.waitYellow.lo, h.waitYellow.hi, MAX_WAIT_MINUTES, config.CONTRACT.MIN_WAIT_SPREAD_MINUTES),
      updatedAt: toIso(result.updatedAtMs),
      isForecast: slot !== 'now' || simulated,
      dataSource: result.dataSource,
      // ---- 1.2 isteğe bağlı alanlar ----
      occupancyRange: roundRange(h.occupancy.lo, h.occupancy.hi, 100),
      overCapacityShare: Math.round(h.occupancy.overCapacityShare * SHARE_DECIMALS) / SHARE_DECIMALS,
      confidence: slot === 'evening' ? result.eveningConfidence : result.confidence,
      factors: (result.factors[slot] || []).map(function (f) { return { key: f.key, text: f.text, points: f.points }; }),
      modelVersion: result.modelVersion,
      definition: 'capacity',
      assumedFields: result.assumedFields.slice()
    };
    if (simulated) out.simulated = true;
    return out;
  }

  /* ---- Bölge ------------------------------------------------------------------------ */

  /** Kararlı metin özeti (önbellek anahtarı) — FNV-1a 32 bit, iki tur. */
  function digest(value) {
    const text = JSON.stringify(value, function (k, v) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        return Object.keys(v).sort().reduce(function (acc, key) { acc[key] = v[key]; return acc; }, {});
      }
      return v;
    });
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < text.length; i++) {
      h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 ^ text.charCodeAt(text.length - 1 - i), 2246822519) >>> 0;
    }
    return h1.toString(16) + h2.toString(16) + ':' + text.length;
  }

  const cache = new Map();

  function cacheGet(key) {
    if (!cache.has(key)) return null;
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);     // en son kullanılan sona
    return value;
  }

  function cacheSet(key, value) {
    cache.set(key, value);
    while (cache.size > config.REGION.CACHE_SIZE) cache.delete(cache.keys().next().value);
  }

  /**
   * @param {Object[]} inputs
   * @param {Object} options computeHospital seçenekleri + deadlineMs
   */
  function computeRegion(inputs, options) {
    const o = options || {};
    if (!Array.isArray(inputs)) return { ok: false, reason: 'NOT_AN_ARRAY', results: [] };
    const list = inputs.slice(0, config.REGION.MAX_HOSPITALS);
    const started = now();
    const deadline = o.deadlineMs || config.REGION.DEADLINE_MS;
    const stats = { computed: 0, cached: 0, degraded: 0, dropped: inputs.length - list.length };
    const minute = Math.floor(o.nowMs / MS_PER_MINUTE);
    const results = list.map(function (input) {
      const key = digest([input, minute, o.maxRuns || 0, o.explain !== false, o.calibration ? digest(o.calibration) : '']);
      const hit = cacheGet(key);
      if (hit) { stats.cached += 1; return hit; }
      const late = now() - started > deadline;
      const result = computeHospital(input, late ? Object.assign({}, o, { maxRuns: config.SIMULATION.MIN_RUNS, explain: false }) : o);
      if (late) { stats.degraded += 1; result.degraded = true; }
      stats.computed += 1;
      cacheSet(key, result);
      return result;
    });
    return { ok: true, results: results, stats: stats, timingMs: Math.round(now() - started) };
  }

  function clearCache() {
    cache.clear();
  }

  return { computeHospital: computeHospital, computeRegion: computeRegion, toContract: toContract, toIso: toIso,
    digest: digest, clearCache: clearCache, MODEL_VERSION: config.MODEL_VERSION };
});

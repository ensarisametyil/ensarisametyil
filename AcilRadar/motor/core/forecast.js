/* =============================================================================
 * motor/core/forecast.js
 * NE İŞE YARAR : Ufuk bazlı tahmin. Tek bir benzetim yörüngesinden tüm ufukların
 *   (0, 30, 60, 120, 180, 240 dk ve akşam 20:00) durum kesitleri alınır; çok koşu
 *   (Monte Carlo) ile dağılım çıkar. Koşu sayısı UYARLAMALI: doluluk yüzdelikleri
 *   (10/50/90) art arda denetimlerde en çok 1 puan (ya da bir hastanın puanı —
 *   hangisi büyükse) kayıyorsa durur.
 *   Ayrıca erken uyarı eğrisi: her ufukta "çok yoğun" olma olasılığı.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: koşu sayısı ve yakınsama → config.SIMULATION.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./config.js'), require('./rng.js'), require('./demand.js'), require('./service.js'),
      require('./queue.js'), require('./occupancy.js'));
  } else {
    const ns = root.AcilRadarMotor = root.AcilRadarMotor || {};
    ns.forecast = factory(ns.config, ns.rng, ns.demand, ns.service, ns.queue, ns.occupancy);
  }
})(typeof self !== 'undefined' ? self : this, function (config, rngLib, demand, service, queue, occupancy) {
  'use strict';

  const MS_PER_MINUTE = 60000;
  const S = config.SIMULATION;
  const TAG_CLASSES = ['green', 'yellow'];

  /** Başlangıç durumu (gözlenen kayıttan ya da karşıolgusal/mevsimsel durum). */
  function initialState(record, neutral) {
    if (neutral.emptyStart) return { waiting: { red: 0, yellow: 0, green: 0 }, inService: 0, boarding: 0 };
    const queueNeutral = neutral.queue;
    return {
      waiting: queueNeutral ? { red: 0, yellow: 0, green: 0 } : { red: record.redWaiting, yellow: record.yellowWaiting, green: record.greenWaiting },
      inService: queueNeutral ? Math.round(record.activePhysicians * config.DEFAULTS.IN_SERVICE_SHARE) : record.inService,
      boarding: neutral.boarding ? 0 : record.boarding
    };
  }

  function maxShift(a, b) {
    if (!a || !b) return Infinity;
    let m = 0;
    for (let i = 0; i < a.length; i++) {
      m = Math.max(m, Math.abs(a[i].p10 - b[i].p10), Math.abs(a[i].p50 - b[i].p50), Math.abs(a[i].p90 - b[i].p90));
    }
    return m;
  }

  /**
   * @param {Object} record     quality.assess().record
   * @param {Object} model      demand.learn()
   * @param {Object} o
   * @param {number} o.startMs  benzetim başlangıcı (genelde "şimdi")
   * @param {number[]} o.offsets durum kesiti dakikaları (artan)
   * @param {string|number} o.seed
   * @param {number} [o.maxRuns]
   * @param {number} [o.minRuns]
   * @param {boolean} [o.adaptive=true]
   * @param {Object} [o.neutral] karşıolgusal: {queue, seasonal, holiday, surge, shift, boarding, emptyStart}
   * @param {boolean} [o.waits=true] ölçüm hastası (bekleme süresi) gerekli mi
   * @param {boolean} [o.fixedParams] kapatma deneyi: parametre belirsizliği yok
   * @param {boolean} [o.noBedBlocking] kapatma deneyi: yatak kısıtı benzetilmez
   */
  function run(record, model, o) {
    const neutral = o.neutral || {};
    const offsets = o.offsets;
    const maxRuns = o.maxRuns || S.RUNS;
    const minRuns = Math.min(o.minRuns || S.MIN_RUNS, maxRuns);
    const adaptive = o.adaptive !== false;
    const horizonMinutes = offsets[offsets.length - 1] + S.TAG_EXTENSION_MINUTES;
    const table = demand.rateTable(model, o.startMs, horizonMinutes + demand.SLOT_MINUTES, neutral);
    const changes = service.physicianChanges(record, o.startMs, horizonMinutes, neutral.shift);
    const init = initialState(record, neutral);
    const base = rngLib.create(o.seed);
    const occ = offsets.map(function () { return []; });
    const waitG = offsets.map(function () { return []; });
    const waitY = offsets.map(function () { return []; });
    const greenW = offsets.map(function () { return []; });
    const yellowW = offsets.map(function () { return []; });
    const phys = offsets.map(function () { return []; });
    let censored = 0;
    let truncated = 0;
    let previous = null;
    let streak = 0;
    let runs = 0;
    let converged = false;
    // Yakınsama eşiği: 1 puan ya da bir hastanın puanı (hangisi büyükse). Doluluk tam
    // sayı hastayla değişir; yüzdelikler bir hastadan ince çözülemez (örn. kapasite 30
    // → bir hasta 3,3 puan; ölçümle görüldü: yüzdelikler bu adımla sıçrıyor).
    const personPoints = 100 / occupancy.capacity(record.bedCapacity, record.activePhysicians);
    const tolerance = Math.max(S.CONVERGENCE_POINTS, personPoints) + 1e-9;

    for (let i = 0; i < maxRuns; i++) {
      const rng = base.fork('run' + i);
      const result = queue.simulate({
        initial: init,
        rng: rng,
        rateTable: table,
        scale: o.fixedParams ? model.scale : demand.sampleScale(model, rng),
        serviceParams: o.fixedParams ? { logShift: 0 } : service.sampleParams(rng),
        physicianChanges: changes,
        snapshots: offsets,
        bedCapacity: o.noBedBlocking ? null : record.bedCapacity,
        tagClasses: o.waits === false ? [] : TAG_CLASSES,
        noAdmissions: Boolean(neutral.boarding)
      });
      runs += 1;
      if (result.truncated) truncated += 1;
      result.snapshots.forEach(function (snap, k) {
        const cap = occupancy.capacity(record.bedCapacity, snap.physicians);
        occ[k].push(occupancy.rawPercent(snap.occupants, cap));
        greenW[k].push(snap.waiting.green);
        yellowW[k].push(snap.waiting.yellow);
        phys[k].push(snap.physicians);
      });
      result.tagWaits.forEach(function (w, k) {
        if (w.green) { waitG[k].push(w.green.wait); if (w.green.censored) censored += 1; }
        if (w.yellow) { waitY[k].push(w.yellow.wait); if (w.yellow.censored) censored += 1; }
      });
      if (adaptive && runs >= minRuns && runs % S.BATCH === 0) {
        const now = occ.map(function (v) { return occupancy.summarize(v); });
        streak = maxShift(now, previous) <= tolerance ? streak + 1 : 0;
        previous = now;
        if (streak >= S.CONVERGENCE_STREAK) { converged = true; break; }
      }
    }

    const horizons = offsets.map(function (offset, k) {
      return {
        offset: offset,
        atMs: o.startMs + offset * MS_PER_MINUTE,
        occupancy: occupancy.summarize(occ[k]),
        waitGreen: occupancy.summarizeValues(waitG[k]),
        waitYellow: occupancy.summarizeValues(waitY[k]),
        greenWaiting: occupancy.summarizeValues(greenW[k]),
        yellowWaiting: occupancy.summarizeValues(yellowW[k]),
        physicians: occupancy.summarizeValues(phys[k])
      };
    });
    return { horizons: horizons, runs: runs, converged: converged, censoredShare: censored / Math.max(1, runs * offsets.length * 2), truncatedRuns: truncated };
  }

  /** Erken uyarı eğrisi: ufuk başına "çok yoğun" olasılığı. */
  function earlyWarning(horizons) {
    return horizons.map(function (h) { return { offset: h.offset, pHigh: h.occupancy.levelShares.high }; });
  }

  return { run: run, earlyWarning: earlyWarning, initialState: initialState, TAG_CLASSES: TAG_CLASSES };
});

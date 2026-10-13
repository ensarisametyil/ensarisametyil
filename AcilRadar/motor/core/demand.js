/* =============================================================================
 * motor/core/demand.js
 * NE İŞE YARAR : Talep (başvuru hızı) modeli.
 *   λ(t) = taban × ölçek × saatÖrüntüsü(t) × saatDüzeltmesi(t) × haftaGünü(t)
 *          × günTürü(t) × aniArtış(t)
 *   - taban: bölge öncülü (hekim × saatlik başvuru/hekim; config.DEMAND)
 *   - ölçek, saat düzeltmesi, gün türü: HİYERARŞİK GAMMA-POISSON büzülme ile geçmiş
 *     saatlik başvurudan öğrenilir. Az veri → öncüle (1) yakın; çok veri → hastaneye özel.
 *   - ani artış: standartlaştırılmış artıklarda tek yönlü CUSUM; alarm varsa son
 *     saatlerin gözlenen/beklenen oranı (büzülmüş), ileriye doğru yarılanarak sönümlenir.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: öncüller ve CUSUM → config.DEMAND.
 * SINIRLILIK: haftanın günü etkisi öğrenilmez (öncül sabit); bkz. docs/MODEL_KARTI.md.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'), require('./time.js'));
  else { const ns = root.AcilRadarMotor = root.AcilRadarMotor || {}; ns.demand = factory(ns.config, ns.time); }
})(typeof self !== 'undefined' ? self : this, function (config, time) {
  'use strict';

  const C = config.DEMAND;
  const MS_PER_MINUTE = 60000;
  const MS_PER_HOUR = 3600000;
  const MINUTES_PER_HOUR = 60;
  const SLOT_MINUTES = 15;
  const MIN_VARIANCE = 0.5;    // CUSUM'da sıfıra bölmeyi önler

  function normalize(list) {
    let sum = 0;
    for (let i = 0; i < list.length; i++) sum += list[i];
    const mean = sum / list.length;
    return list.map(function (v) { return v / mean; });
  }

  const HOURLY = normalize(C.HOURLY_PROFILE);
  const WEEKDAY = normalize(C.WEEKDAY_FACTOR);

  /** Bölge öncülü: hastanenin ortalama saatlik başvurusu. */
  function baseRatePerHour(record) {
    let physicians = record.activePhysicians;
    if (record.physicianSchedule) {
      let weighted = 0;
      let minutes = 0;
      record.physicianSchedule.forEach(function (b) {
        const len = b.to > b.from ? b.to - b.from : time.MINUTES_PER_DAY - b.from + b.to;
        weighted += b.count * len;
        minutes += len;
      });
      if (minutes > 0) physicians = weighted / minutes;
    }
    return Math.max(0.1, physicians * C.ARRIVALS_PER_PHYSICIAN_HOUR);
  }

  function dayTypeKey(ms, cache) {
    const key = Math.floor(ms / MS_PER_HOUR);
    if (cache[key] === undefined) cache[key] = time.dayInfo(ms).type;
    return cache[key];
  }

  /** Öncül + öğrenilen düzeltmelerle saatlik beklenen başvuru (ani artış hariç). */
  function expectedPerHour(model, ms, cache, neutral) {
    const p = time.parts(ms);
    const n = neutral || {};
    const seasonal = n.seasonal ? model.flatSeasonal : HOURLY[p.hour] * model.hourCorrection[p.hour] * WEEKDAY[p.weekday];
    const type = n.holiday ? null : dayTypeKey(ms, cache);
    const dayFactor = type ? model.dayType[type] : 1;
    return model.base * model.scale * seasonal * dayFactor;
  }

  /* ---- Öğrenme ------------------------------------------------------------------ */

  function observations(record, nowMs) {
    const obs = record.history.slice();
    const lastStart = nowMs - MS_PER_HOUR;
    const hasLast = obs.length && obs[obs.length - 1].startMs >= lastStart - MS_PER_MINUTE;
    if (record.arrivalsLastHour !== null && record.arrivalsLastHour !== undefined && !hasLast) {
      obs.push({ startMs: lastStart, arrivals: record.arrivalsLastHour });
    }
    return obs;
  }

  /**
   * Gamma-Poisson koordinat güncellemesi (her parametre için Gamma(k + Σx, k + Σμ)).
   * @returns {DemandModel}
   */
  function learn(record, nowMs) {
    const obs = observations(record, nowMs);
    const cache = {};
    const model = {
      base: baseRatePerHour(record),
      scale: 1,
      scaleShape: C.SCALE_PRIOR_STRENGTH,
      scaleRate: C.SCALE_PRIOR_STRENGTH,
      hourCorrection: HOURLY.map(function () { return 1; }),
      dayType: {},
      observedHours: obs.length,
      surge: { alarm: false, factor: 1, cusum: 0 },
      nowMs: nowMs
    };
    C.DAYTYPES.forEach(function (t) { model.dayType[t] = 1; });
    const rows = obs.map(function (o) {
      const mid = o.startMs + MS_PER_HOUR / 2;
      const p = time.parts(mid);
      return { x: o.arrivals, hour: p.hour, weekday: p.weekday, type: dayTypeKey(mid, cache), mid: mid };
    });
    for (let iter = 0; iter < C.LEARN_ITERATIONS && rows.length; iter++) {
      // Ölçek
      let sx = 0;
      let sm = 0;
      rows.forEach(function (r) { sx += r.x; sm += model.base * HOURLY[r.hour] * model.hourCorrection[r.hour] * WEEKDAY[r.weekday] * (r.type ? model.dayType[r.type] : 1); });
      model.scaleShape = C.SCALE_PRIOR_STRENGTH + sx;
      model.scaleRate = C.SCALE_PRIOR_STRENGTH + sm;
      model.scale = model.scaleShape / model.scaleRate;
      // Saat düzeltmesi
      const hx = HOURLY.map(function () { return 0; });
      const hm = HOURLY.map(function () { return 0; });
      rows.forEach(function (r) {
        hx[r.hour] += r.x;
        hm[r.hour] += model.base * model.scale * HOURLY[r.hour] * WEEKDAY[r.weekday] * (r.type ? model.dayType[r.type] : 1);
      });
      model.hourCorrection = hx.map(function (x, h) { return (C.HOUR_PRIOR_STRENGTH + x) / (C.HOUR_PRIOR_STRENGTH + hm[h]); });
      // Gün türü
      C.DAYTYPES.forEach(function (t) {
        let dx = 0;
        let dm = 0;
        rows.forEach(function (r) {
          if (r.type !== t) return;
          dx += r.x;
          dm += model.base * model.scale * HOURLY[r.hour] * model.hourCorrection[r.hour] * WEEKDAY[r.weekday];
        });
        model.dayType[t] = (C.DAYTYPE_PRIOR_STRENGTH + dx) / (C.DAYTYPE_PRIOR_STRENGTH + dm);
      });
    }
    // Saat düzeltmesinin ortalaması 1 olsun (ölçekle karışmasın)
    const meanCorrection = model.hourCorrection.reduce(function (a, b) { return a + b; }, 0) / model.hourCorrection.length;
    model.hourCorrection = model.hourCorrection.map(function (v) { return v / meanCorrection; });
    model.scale *= meanCorrection;
    model.scaleShape = model.scale * model.scaleRate;
    let flat = 0;
    for (let h = 0; h < 24; h++) flat += HOURLY[h] * model.hourCorrection[h];
    model.flatSeasonal = flat / 24;
    model.surge = detectSurge(model, rows, cache);
    return model;
  }

  /** Tek yönlü CUSUM (yalnız artış). */
  function detectSurge(model, rows, cache) {
    const recent = rows.slice(-C.CUSUM_LOOKBACK_HOURS);
    let s = 0;
    recent.forEach(function (r) {
      const lambda = expectedPerHour(model, r.mid, cache);
      const z = (r.x - lambda) / Math.sqrt(Math.max(lambda, MIN_VARIANCE));
      s = Math.max(0, s + z - C.CUSUM_K);
    });
    if (s <= C.CUSUM_H) return { alarm: false, factor: 1, cusum: s };
    let ox = 0;
    let om = 0;
    recent.slice(-C.SURGE_WINDOW_HOURS).forEach(function (r) {
      ox += r.x;
      om += expectedPerHour(model, r.mid, cache);
    });
    const factor = Math.min(C.SURGE_MAX_FACTOR, Math.max(1, (ox + C.SURGE_PRIOR) / (om + C.SURGE_PRIOR)));
    return { alarm: true, factor: factor, cusum: s };
  }

  /* ---- Benzetim için hız tablosu -------------------------------------------------- */

  /**
   * 15 dakikalık dilimlerle dakika başına başvuru hızı (ölçek örneği HARİÇ; benzetim
   * her koşuda örneklenen ölçek oranıyla çarpar).
   * @param {DemandModel} model
   * @param {number} startMs   benzetimin başladığı an
   * @param {number} minutes   kaç dakika
   * @param {{seasonal?:boolean, holiday?:boolean, surge?:boolean}} [neutral] karşıolgusal
   */
  function rateTable(model, startMs, minutes, neutral) {
    const n = neutral || {};
    const cache = {};
    const slots = Math.max(1, Math.ceil(minutes / SLOT_MINUTES));
    const rates = new Float64Array(slots);
    const halfLife = C.SURGE_HALF_LIFE_MINUTES;
    const surgeExtra = n.surge ? 0 : model.surge.factor - 1;
    const sinceNow = (startMs - model.nowMs) / MS_PER_MINUTE;
    for (let i = 0; i < slots; i++) {
      const mid = startMs + (i + 0.5) * SLOT_MINUTES * MS_PER_MINUTE;
      const elapsed = Math.max(0, sinceNow + (i + 0.5) * SLOT_MINUTES);
      const surge = 1 + surgeExtra * Math.pow(0.5, elapsed / halfLife);
      const perHour = Math.min(config.SIMULATION.MAX_ARRIVAL_RATE_PER_HOUR, expectedPerHour(model, mid, cache, n) * surge);
      rates[i] = perHour / MINUTES_PER_HOUR / model.scale;   // ölçek benzetimde örneklenir
    }
    return { slotMinutes: SLOT_MINUTES, rates: rates };
  }

  /** Ölçeğin sonsal dağılımından örnek (parametre belirsizliği). */
  function sampleScale(model, rng) {
    return rng.gamma(model.scaleShape, 1 / model.scaleRate);
  }

  return { learn: learn, rateTable: rateTable, sampleScale: sampleScale, baseRatePerHour: baseRatePerHour,
    expectedPerHour: expectedPerHour, HOURLY: HOURLY, WEEKDAY: WEEKDAY, SLOT_MINUTES: SLOT_MINUTES };
});

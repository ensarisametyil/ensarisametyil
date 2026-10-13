/* =============================================================================
 * motor/core/service.js
 * NE İŞE YARAR : Hizmet (muayene) süresi modeli ve hekim vardiya çizelgesi.
 *   - Süre: sınıf başına log-normal; ortanca sürenin kendisi de belirsiz (koşu başına
 *     ortak bir çarpan örneklenir → parametre belirsizliği).
 *   - Hekim sayısı: şu an bildirilen sayı; çizelge varsa bir sonraki vardiya
 *     sınırından itibaren çizelgedeki sayı.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: config.SERVICE, config.SERVICE_PARAM_SIGMA.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'), require('./time.js'));
  else { const ns = root.AcilRadarMotor = root.AcilRadarMotor || {}; ns.service = factory(ns.config, ns.time); }
})(typeof self !== 'undefined' ? self : this, function (config, time) {
  'use strict';

  const MS_PER_MINUTE = 60000;
  const LOG_MEDIAN = {};
  config.CLASSES.forEach(function (c) { LOG_MEDIAN[c] = Math.log(config.SERVICE[c].median); });
  const BOARD_LOG_MEDIAN = Math.log(config.BOARDING.median);
  const MAX_SERVICE_MINUTES = 720;   // tek muayene en çok 12 saat (aşırı kuyruğa karşı)
  const MAX_BOARDING_MINUTES = 4320; // yatış bekleme en çok 3 gün

  /** Koşu başına hizmet parametreleri. */
  function sampleParams(rng) {
    return { logShift: config.SERVICE_PARAM_SIGMA * rng.normal() };
  }

  function sampleService(cls, params, rng) {
    const v = rng.lognormal(LOG_MEDIAN[cls] + params.logShift, config.SERVICE[cls].sigma);
    return Math.min(MAX_SERVICE_MINUTES, v);
  }

  function sampleBoarding(rng) {
    return Math.min(MAX_BOARDING_MINUTES, rng.lognormal(BOARD_LOG_MEDIAN, config.BOARDING.sigma));
  }

  /** Ortalama hizmet süresi (dk), sınıf karışımına göre — yük oranı ρ için. */
  function meanServiceMinutes() {
    let mean = 0;
    config.CLASSES.forEach(function (c) {
      const s = config.SERVICE[c];
      mean += config.CLASS_MIX[c] * s.median * Math.exp(s.sigma * s.sigma / 2);
    });
    return mean;
  }

  function scheduleCount(schedule, minuteOfDay) {
    for (let i = 0; i < schedule.length; i++) {
      const b = schedule[i];
      const inside = b.from < b.to ? minuteOfDay >= b.from && minuteOfDay < b.to : minuteOfDay >= b.from || minuteOfDay < b.to;
      if (inside) return b.count;
    }
    return null;
  }

  /**
   * Hekim sayısı değişimleri, benzetim başlangıcına göre dakika cinsinden.
   * İlk eleman her zaman { at: 0, count: şimdiki sayı }.
   * @param {boolean} [constant] karşıolgusal: çizelgeyi yok say
   */
  function physicianChanges(record, startMs, minutes, constant) {
    const changes = [{ at: 0, count: record.activePhysicians }];
    if (constant || !record.physicianSchedule) return changes;
    const boundaries = [];
    record.physicianSchedule.forEach(function (b) { boundaries.push(b.from, b.to % time.MINUTES_PER_DAY); });
    const dayStart = time.startOfLocalDay(startMs);
    let current = record.activePhysicians;
    const points = [];
    for (let day = 0; day * time.MINUTES_PER_DAY < minutes + time.MINUTES_PER_DAY; day++) {
      boundaries.forEach(function (m) {
        const at = (dayStart - startMs) / MS_PER_MINUTE + day * time.MINUTES_PER_DAY + m;
        if (at > 0 && at <= minutes) points.push(at);
      });
    }
    points.sort(function (a, b) { return a - b; });
    points.forEach(function (at) {
      const minuteOfDay = time.parts(startMs + at * MS_PER_MINUTE).minuteOfDay;
      const count = scheduleCount(record.physicianSchedule, minuteOfDay);
      if (count !== null && count !== current) {
        changes.push({ at: at, count: count });
        current = count;
      }
    });
    return changes;
  }

  return { sampleParams: sampleParams, sampleService: sampleService, sampleBoarding: sampleBoarding,
    meanServiceMinutes: meanServiceMinutes, physicianChanges: physicianChanges, scheduleCount: scheduleCount };
});

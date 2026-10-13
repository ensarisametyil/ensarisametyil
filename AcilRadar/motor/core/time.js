/* =============================================================================
 * motor/core/time.js
 * NE İŞE YARAR : Zaman işleri. Türkiye saati SABİT UTC+3 (yaz saati yok).
 *                Yerel saat/gün/hafta parçaları, yerel tarih anahtarı, "akşam 20:00"
 *                hedefi, resmî tatil / dini bayram / arife / bayram ertesi bilgisi.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Takvim verisi: core/holidays.js     - Saat dilimi ve akşam saati: config.TIME
 * NOT: Bu dosya saati KENDİSİ OKUMAZ; her fonksiyon zamanı parametre (ms) olarak alır.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'), require('./holidays.js'));
  else { const ns = root.AcilRadarMotor = root.AcilRadarMotor || {}; ns.time = factory(ns.config, ns.holidays); }
})(typeof self !== 'undefined' ? self : this, function (config, holidays) {
  'use strict';

  const MS_PER_MINUTE = 60000;
  const MINUTES_PER_HOUR = 60;
  const MINUTES_PER_DAY = 1440;
  const MS_PER_DAY = MINUTES_PER_DAY * MS_PER_MINUTE;
  const OFFSET_MS = config.TIME.UTC_OFFSET_MINUTES * MS_PER_MINUTE;
  const VERIFICATION_RANK = { secondary: 1, primary: 2, law: 3 };
  const MIN_RANK = VERIFICATION_RANK[config.TIME.HOLIDAY_MIN_VERIFICATION] || VERIFICATION_RANK.primary;

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /**
   * Yerel (UTC+3) zaman parçaları.
   * weekday: 0 = Pazartesi … 6 = Pazar.
   */
  function parts(ms) {
    const d = new Date(ms + OFFSET_MS);
    const hour = d.getUTCHours();
    const minute = d.getUTCMinutes();
    const weekday = (d.getUTCDay() + 6) % 7;
    const dateKey = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
    return {
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: hour, minute: minute, weekday: weekday,
      minuteOfDay: hour * MINUTES_PER_HOUR + minute,
      hourOfWeek: weekday * 24 + hour,
      dateKey: dateKey,
      isWeekend: weekday >= 5
    };
  }

  /** Yerel gün başlangıcı (00:00) ms. */
  function startOfLocalDay(ms) {
    return Math.floor((ms + OFFSET_MS) / MS_PER_DAY) * MS_PER_DAY - OFFSET_MS;
  }

  /** "YYYY-AA-GG" + günün dakikası → ms. */
  function localToMs(dateKey, minuteOfDay) {
    const y = Number(dateKey.slice(0, 4));
    const m = Number(dateKey.slice(5, 7));
    const d = Number(dateKey.slice(8, 10));
    return Date.UTC(y, m - 1, d) - OFFSET_MS + minuteOfDay * MS_PER_MINUTE;
  }

  function addDays(dateKey, days) {
    return parts(localToMs(dateKey, 0) + days * MS_PER_DAY).dateKey;
  }

  /**
   * Akşam hedefi: bugün yerel 20:00. 20:00 ve sonrasında "geçti" (available:false).
   * @returns {{available:boolean, ms:?number, leadMinutes:?number, reason:?string, longLead:boolean}}
   */
  function eveningTarget(nowMs) {
    const target = startOfLocalDay(nowMs) + config.TIME.EVENING_HOUR * MINUTES_PER_HOUR * MS_PER_MINUTE;
    if (nowMs >= target) return { available: false, ms: null, leadMinutes: null, reason: 'PASSED', longLead: false };
    const lead = Math.round((target - nowMs) / MS_PER_MINUTE);
    return { available: true, ms: target, leadMinutes: lead, reason: null, longLead: lead > config.EVENING_MAX_LEAD_MINUTES };
  }

  /* ---- Takvim ------------------------------------------------------------------ */

  function verified(level) {
    return (VERIFICATION_RANK[level] || 0) >= MIN_RANK;
  }

  /** Yılın dini bayram kaydı uygulanabilir mi? null = takvimde yok ya da doğrulama yetersiz. */
  function religiousYear(year) {
    const entry = holidays.RELIGIOUS[year];
    return entry && verified(entry.verification) ? entry : null;
  }

  /**
   * Günün türü. Öncelik: dini bayram > resmî tatil > arife (yarım gün, 13:00 sonrası) >
   * bayram ertesi > normal.
   * @returns {{dateKey:string, type:?string, name:?string, calendarKnown:boolean}}
   *   type: 'religious' | 'official' | 'arife' | 'postReligious' | null
   */
  function dayInfo(ms) {
    const p = parts(ms);
    const afternoon = p.hour >= config.TIME.HALF_DAY_FROM_HOUR;
    const year = religiousYear(p.year);
    const result = { dateKey: p.dateKey, type: null, name: null, calendarKnown: Boolean(year) };
    if (year) {
      for (let i = 0; i < year.feasts.length; i++) {
        const feast = year.feasts[i];
        if (feast.days.indexOf(p.dateKey) !== -1) return Object.assign(result, { type: 'religious', name: feast.name });
      }
    }
    const monthDay = p.dateKey.slice(5);
    for (let i = 0; i < holidays.FIXED.length; i++) {
      const fixed = holidays.FIXED[i];
      if (fixed.monthDay !== monthDay || !verified(fixed.verification)) continue;
      if (!fixed.halfDay) return Object.assign(result, { type: 'official', name: fixed.name });
      if (afternoon) return Object.assign(result, { type: 'arife', name: fixed.name });
    }
    if (year) {
      for (let i = 0; i < year.feasts.length; i++) {
        const feast = year.feasts[i];
        if (feast.arife === p.dateKey && afternoon) return Object.assign(result, { type: 'arife', name: feast.name + ' arifesi' });
        const last = feast.days[feast.days.length - 1];
        for (let k = 1; k <= config.DEMAND.POST_RELIGIOUS_DAYS; k++) {
          if (addDays(last, k) === p.dateKey) return Object.assign(result, { type: 'postReligious', name: feast.name + ' ertesi' });
        }
      }
    }
    return result;
  }

  /** Okul dönemi mi? Doğrulanmış takvim yoksa null (bilinmiyor). */
  function isSchoolTerm(ms) {
    const key = parts(ms).dateKey;
    if (!holidays.SCHOOL_TERMS.length) return null;
    return holidays.SCHOOL_TERMS.some(function (term) { return verified(term.verification) && key >= term.from && key <= term.to; });
  }

  /** Saat dilimi kimliği (config.CALIBRATION.DAYPARTS). */
  function daypart(ms) {
    const hour = parts(ms).hour;
    const list = config.CALIBRATION.DAYPARTS;
    for (let i = 0; i < list.length; i++) if (hour >= list[i].from && hour < list[i].to) return list[i].id;
    return list[list.length - 1].id;
  }

  return {
    MS_PER_MINUTE: MS_PER_MINUTE, MS_PER_DAY: MS_PER_DAY, MINUTES_PER_DAY: MINUTES_PER_DAY,
    parts: parts, startOfLocalDay: startOfLocalDay, localToMs: localToMs, addDays: addDays,
    eveningTarget: eveningTarget, dayInfo: dayInfo, isSchoolTerm: isSchoolTerm, daypart: daypart
  };
});

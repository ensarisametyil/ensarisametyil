/* =============================================================================
 * motor/core/quality.js
 * NE İŞE YARAR : Girdi kaydının veri kalitesi denetimi:
 *                tür/aralık doğrulama, bayatlık, aykırı değer (sınırla + uyarı),
 *                eksik alan (varsayılanla doldur + assumedFields), kaynak güveni ve
 *                GÜVEN DÜZEYİ (düşük/orta/yüksek) kuralları.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: sınırlar → config.LIMITS; güven → config.CONFIDENCE;
 *   kural tablosu → docs/MODEL_KARTI.md › Güven düzeyi.
 * KURAL: Hiçbir değer SESSİZCE düzeltilmez; her düzeltme warnings listesine yazılır.
 *
 * GİRDİ (yalnız toplu sayılar; hasta bazlı alan YOK — KVKK):
 *   hospitalId (metin), updatedAtMs (sayı) ya da updatedAt (ISO), dataSource
 *   ('simulated'|'hospital'|'official'), activePhysicians, greenWaiting, yellowWaiting,
 *   [redWaiting, inService, boarding, bedCapacity, arrivalsLastHour,
 *    physicianSchedule: [{from, to, count}] (yerel günün dakikası),
 *    history: [{startMs, arrivals}] (saatlik başvuru)]
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'));
  else { const ns = root.AcilRadarMotor = root.AcilRadarMotor || {}; ns.quality = factory(ns.config); }
})(typeof self !== 'undefined' ? self : this, function (config) {
  'use strict';

  const MS_PER_MINUTE = 60000;
  const MS_PER_HOUR = 3600000;
  const MINUTES_PER_DAY = 1440;
  const L = config.LIMITS;
  const D = config.DEFAULTS;
  const SOURCES = Object.keys(config.SOURCE_TRUST);
  const CORE_FIELDS = ['activePhysicians', 'greenWaiting', 'yellowWaiting'];
  const MAX_SCHEDULE_BLOCKS = 48;

  /**
   * Sayısal alanı denetler. Geçersiz → null (eksik sayılır) + uyarı;
   * kesirli → yuvarla + uyarı; üst sınır üstü → sınırla + uyarı.
   */
  function cleanCount(raw, field, max, warnings) {
    if (raw === undefined || raw === null || raw === '') return null;
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!isFinite(value)) {
      warnings.push({ code: 'NOT_A_NUMBER', field: field });
      return null;
    }
    if (value < 0) {
      warnings.push({ code: 'NEGATIVE', field: field });
      return null;
    }
    let result = value;
    if (Math.round(result) !== result) {
      warnings.push({ code: 'ROUNDED', field: field });
      result = Math.round(result);
    }
    if (result > max) {
      warnings.push({ code: 'OUTLIER_CLAMPED', field: field, from: result, to: max });
      result = max;
    }
    return result;
  }

  function parseTime(input) {
    if (typeof input.updatedAtMs === 'number' && isFinite(input.updatedAtMs)) return input.updatedAtMs;
    if (typeof input.updatedAt === 'string') {
      const ms = Date.parse(input.updatedAt);
      return isFinite(ms) ? ms : null;
    }
    return null;
  }

  function cleanSchedule(raw, warnings) {
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const blocks = [];
    raw.slice(0, MAX_SCHEDULE_BLOCKS).forEach(function (b, i) {
      const from = Number(b && b.from);
      const to = Number(b && b.to);
      const count = cleanCount(b && b.count, 'physicianSchedule[' + i + '].count', L.PHYSICIANS_MAX, warnings);
      const okRange = isFinite(from) && isFinite(to) && from >= 0 && from < MINUTES_PER_DAY && to > 0 && to <= MINUTES_PER_DAY && from !== to;
      if (!okRange || count === null) {
        warnings.push({ code: 'SCHEDULE_BLOCK_IGNORED', field: 'physicianSchedule[' + i + ']' });
        return;
      }
      blocks.push({ from: from, to: to, count: count });
    });
    return blocks.length ? blocks : null;
  }

  function cleanHistory(raw, nowMs, warnings) {
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const out = [];
    let dropped = 0;
    raw.forEach(function (h) {
      const start = Number(h && h.startMs);
      const arrivals = Number(h && h.arrivals);
      if (!isFinite(start) || start + MS_PER_HOUR > nowMs + MS_PER_MINUTE || !isFinite(arrivals) || arrivals < 0) {
        dropped += 1;
        return;
      }
      out.push({ startMs: start, arrivals: Math.min(Math.round(arrivals), L.ARRIVALS_HOUR_MAX) });
    });
    if (dropped) warnings.push({ code: 'HISTORY_ROWS_DROPPED', field: 'history', count: dropped });
    out.sort(function (a, b) { return a.startMs - b.startMs; });
    return out.slice(-config.DEMAND.MAX_HISTORY_HOURS);
  }

  /* ---- Güven düzeyi ------------------------------------------------------------ */

  /**
   * Kural tablosu (her satır 0–2 puan, toplam 0–8):
   *   tazelik   : yaş ≤ 10 dk → 2, ≤ 20 dk → 1, aksi 0
   *   kaynak    : official 2, hospital 1, simulated 0
   *   eksiksizlik: varsayılan çekirdek alan yok ve eksik isteğe bağlı ≤ 2 → 2;
   *                varsayılan çekirdek alan yok → 1; aksi 0
   *   geçmiş doğruluk: 'good' 2, 'fair' 1, 'poor' 0, bilinmiyor 1
   * Toplam ≥ 7 yüksek, ≥ 4 orta, aksi düşük.
   * Tavanlar: simulated → en çok düşük; kısmi veri → en çok orta; mevsimsel → düşük.
   */
  function confidence(facts) {
    const c = config.CONFIDENCE;
    const fresh = facts.ageMinutes <= c.FRESH_FULL_MINUTES ? 2 : facts.ageMinutes <= c.FRESH_PARTIAL_MINUTES ? 1 : 0;
    const source = config.SOURCE_TRUST[facts.dataSource] || 0;
    const completeness = facts.assumedCore > 0 ? 0 : facts.missingOptional <= 2 ? 2 : 1;
    const accuracy = { good: 2, fair: 1, poor: 0 }[facts.recentAccuracy];
    const points = fresh + source + completeness + (accuracy === undefined ? 1 : accuracy);
    let level = points >= c.HIGH_FROM_POINTS ? 'high' : points >= c.MEDIUM_FROM_POINTS ? 'medium' : 'low';
    if (facts.dataSource === 'simulated') level = 'low';
    if (facts.tier === 'partial' && level === 'high') level = 'medium';
    if (facts.tier === 'seasonal') level = 'low';
    return { level: level, points: points, parts: { fresh: fresh, source: source, completeness: completeness, accuracy: accuracy === undefined ? 1 : accuracy } };
  }

  /* ---- Ana denetim -------------------------------------------------------------- */

  /**
   * @param {Object} input
   * @param {number} nowMs  sunucu saati
   * @returns {{status:'ok'|'stale'|'future'|'invalid', reason:?string, record:?Object,
   *            warnings:Object[], assumedFields:string[], ageMinutes:?number}}
   */
  function assess(input, nowMs) {
    const warnings = [];
    if (!input || typeof input !== 'object') return { status: 'invalid', reason: 'NOT_AN_OBJECT', record: null, warnings: warnings, assumedFields: [], ageMinutes: null };
    if (!isFinite(nowMs)) return { status: 'invalid', reason: 'NO_TIME', record: null, warnings: warnings, assumedFields: [], ageMinutes: null };
    const id = typeof input.hospitalId === 'string' && input.hospitalId.length > 0 && input.hospitalId.length <= 64 ? input.hospitalId : null;
    if (!id) return { status: 'invalid', reason: 'NO_HOSPITAL_ID', record: null, warnings: warnings, assumedFields: [], ageMinutes: null };
    const updatedAtMs = parseTime(input);
    if (updatedAtMs === null) return { status: 'invalid', reason: 'NO_UPDATED_AT', record: null, warnings: warnings, assumedFields: [], ageMinutes: null };
    const ageMinutes = (nowMs - updatedAtMs) / MS_PER_MINUTE;
    if (ageMinutes < -config.FUTURE_TOLERANCE_MINUTES) return { status: 'future', reason: 'FUTURE', record: null, warnings: warnings, assumedFields: [], ageMinutes: ageMinutes };
    if (ageMinutes > config.STALE_AFTER_MINUTES) return { status: 'stale', reason: 'STALE', record: null, warnings: warnings, assumedFields: [], ageMinutes: ageMinutes };

    let dataSource = input.dataSource;
    if (SOURCES.indexOf(dataSource) === -1) {
      warnings.push({ code: 'UNKNOWN_SOURCE', field: 'dataSource' });
      dataSource = 'simulated';   // en düşük güven
    }

    const r = {
      hospitalId: id,
      updatedAtMs: updatedAtMs,
      dataSource: dataSource,
      activePhysicians: cleanCount(input.activePhysicians, 'activePhysicians', L.PHYSICIANS_MAX, warnings),
      greenWaiting: cleanCount(input.greenWaiting, 'greenWaiting', L.COUNT_MAX, warnings),
      yellowWaiting: cleanCount(input.yellowWaiting, 'yellowWaiting', L.COUNT_MAX, warnings),
      redWaiting: cleanCount(input.redWaiting, 'redWaiting', L.COUNT_MAX, warnings),
      inService: cleanCount(input.inService, 'inService', L.COUNT_MAX, warnings),
      boarding: cleanCount(input.boarding, 'boarding', L.COUNT_MAX, warnings),
      bedCapacity: cleanCount(input.bedCapacity, 'bedCapacity', L.CAPACITY_MAX, warnings),
      arrivalsLastHour: cleanCount(input.arrivalsLastHour, 'arrivalsLastHour', L.ARRIVALS_HOUR_MAX, warnings),
      physicianSchedule: cleanSchedule(input.physicianSchedule, warnings),
      history: cleanHistory(input.history, nowMs, warnings)
    };
    if (r.bedCapacity === 0) {
      warnings.push({ code: 'ZERO_CAPACITY_IGNORED', field: 'bedCapacity' });
      r.bedCapacity = null;
    }

    const assumed = [];
    if (!r.activePhysicians) {
      // 0 hekim de "bilinmiyor" sayılır: kapasite ve hizmet hesaplanamaz.
      if (r.activePhysicians === 0) warnings.push({ code: 'ZERO_PHYSICIANS', field: 'activePhysicians' });
      r.activePhysicians = D.PHYSICIANS;
      assumed.push('activePhysicians');
    }
    // Aykırı: hekim başına bekleyen akıl dışıysa sınırla (sessiz değil: uyarı).
    ['greenWaiting', 'yellowWaiting'].forEach(function (f) {
      const max = r.activePhysicians * L.WAITING_PER_PHYSICIAN_MAX;
      if (r[f] !== null && r[f] > max) {
        warnings.push({ code: 'OUTLIER_CLAMPED', field: f, from: r[f], to: max });
        r[f] = max;
      }
    });
    const waitingMissing = r.greenWaiting === null && r.yellowWaiting === null;
    if (r.greenWaiting === null) { r.greenWaiting = 0; assumed.push('greenWaiting'); }
    if (r.yellowWaiting === null) { r.yellowWaiting = 0; assumed.push('yellowWaiting'); }
    if (r.redWaiting === null) { r.redWaiting = Math.round(r.yellowWaiting * D.RED_PER_YELLOW_WAITING); assumed.push('redWaiting'); }
    if (r.inService === null) { r.inService = Math.round(r.activePhysicians * D.IN_SERVICE_SHARE); assumed.push('inService'); }
    if (r.boarding === null) { r.boarding = Math.round(r.activePhysicians * D.BOARDING_PER_PHYSICIAN); assumed.push('boarding'); }
    if (r.bedCapacity === null) assumed.push('bedCapacity');
    if (r.arrivalsLastHour === null && r.history.length === 0) assumed.push('arrivals');
    if (r.physicianSchedule === null) assumed.push('physicianSchedule');

    const assumedCore = assumed.filter(function (f) { return CORE_FIELDS.indexOf(f) !== -1; }).length;
    return {
      status: 'ok',
      reason: null,
      record: r,
      warnings: warnings,
      assumedFields: assumed,
      ageMinutes: Math.max(0, ageMinutes),
      assumedCore: assumedCore,
      missingOptional: assumed.length - assumedCore,
      waitingMissing: waitingMissing
    };
  }

  return { assess: assess, confidence: confidence, CORE_FIELDS: CORE_FIELDS };
});

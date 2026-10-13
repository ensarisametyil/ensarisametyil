/* =============================================================================
 * motor/core/occupancy.js
 * NE İŞE YARAR : Doluluk TANIMI, seviyesi ve dağılım özetleri.
 *   Tanım 1 — "capacity" (varsayılan, kullanılan):
 *     doluluk % = (bekleyen + muayenede + yatış bekleyen) ÷ kapasite × 100
 *     kapasite  = bedCapacity (hastane verirse) ya da hekim × CAPACITY_PER_PHYSICIAN
 *                 (VARSAYIM — "DOĞRULANMALI").
 *     Gösterilen değer en çok 100; 100'ü aşma olasılığı ayrıca overCapacityShare.
 *   Tanım 2 — "index" (NEDOCS türü bileşik endeks): UYGULANMADI.
 *     Gerekçe config.INDEX_DEFINITION.REASON'da.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: eşikler → config.LEVELS.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'));
  else { const ns = root.AcilRadarMotor = root.AcilRadarMotor || {}; ns.occupancy = factory(ns.config); }
})(typeof self !== 'undefined' ? self : this, function (config) {
  'use strict';

  const FULL = 100;

  /** Kapasite (kişi). physicians: o andaki hekim sayısı. En az 1. */
  function capacity(bedCapacity, physicians) {
    if (bedCapacity) return bedCapacity;
    return Math.max(1, physicians * config.CAPACITY_PER_PHYSICIAN);
  }

  /** Ham doluluk yüzdesi (100'ü aşabilir; gösterimde sınırlanır). */
  function rawPercent(occupants, cap) {
    if (!(cap > 0) || !isFinite(occupants)) return 0;
    return Math.max(0, occupants / cap * FULL);
  }

  function level(percent, levels) {
    const l = levels || config.LEVELS;
    if (percent >= l.HIGH_FROM) return 'high';
    if (percent >= l.MEDIUM_FROM) return 'medium';
    return 'low';
  }

  /** Sıralı dizide doğrusal aradeğerli yüzdelik. Boş dizi → null. */
  function quantile(sorted, q) {
    if (!sorted.length) return null;
    if (sorted.length === 1) return sorted[0];
    const pos = (sorted.length - 1) * Math.min(1, Math.max(0, q));
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  /** Sonlu değerleri sayısal sıralar (Float64Array: karşılaştırıcısız, hızlı). */
  function sortNumbers(values) {
    const out = new Float64Array(values.length);
    let n = 0;
    for (let i = 0; i < values.length; i++) if (isFinite(values[i])) out[n++] = values[i];
    return out.subarray(0, n).sort();
  }

  /**
   * Doluluk örneklerinin özeti.
   * @param {number[]} rawValues  ham yüzdeler (koşu başına)
   */
  function summarize(rawValues) {
    const sorted = sortNumbers(rawValues);
    const q = config.QUANTILES;
    const shares = { low: 0, medium: 0, high: 0 };
    let over = 0;
    let sum = 0;
    for (let i = 0; i < sorted.length; i++) {
      const v = sorted[i];
      shares[level(Math.min(FULL, v))] += 1;
      if (v > FULL) over += 1;
      sum += Math.min(FULL, v);
    }
    const n = sorted.length || 1;
    Object.keys(shares).forEach(function (k) { shares[k] /= n; });
    const cap = function (v) { return v === null ? null : Math.min(FULL, v); };
    return {
      p10: cap(quantile(sorted, q.LOW)),
      p50: cap(quantile(sorted, q.MID)),
      p90: cap(quantile(sorted, q.HIGH)),
      mean: sum / n,
      overCapacityShare: over / n,
      levelShares: shares,
      n: sorted.length
    };
  }

  /** Genel sayısal özet (bekleme süresi vb.). */
  function summarizeValues(values) {
    const sorted = sortNumbers(values);
    const q = config.QUANTILES;
    let sum = 0;
    for (let i = 0; i < sorted.length; i++) sum += sorted[i];
    return { p10: quantile(sorted, q.LOW), p50: quantile(sorted, q.MID), p90: quantile(sorted, q.HIGH),
      mean: sorted.length ? sum / sorted.length : null, n: sorted.length };
  }

  function definitionInfo() {
    return { used: 'capacity', index: { applied: config.INDEX_DEFINITION.ENABLED, reason: config.INDEX_DEFINITION.REASON } };
  }

  return { capacity: capacity, rawPercent: rawPercent, level: level, quantile: quantile,
    summarize: summarize, summarizeValues: summarizeValues, definitionInfo: definitionInfo };
});

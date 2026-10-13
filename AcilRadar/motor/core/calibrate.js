/* =============================================================================
 * motor/core/calibrate.js
 * NE İŞE YARAR : Kalibrasyon ve kayma denetimi.
 *   1) SPLIT-CONFORMAL (konform nicel regresyon, CQR türü): geriye dönük testteki
 *      AYRI bir kalibrasyon döneminden uygunluk puanları s = max(alt − y, y − üst)
 *      toplanır; ufuk × saat dilimi hücresi başına q̂ = ⌈(n+1)(1−α)⌉/n. yüzdelik.
 *      Yeni aralık [alt − q̂, üst + q̂] (q̂ < 0 ise aralık daralır).
 *      Hücrede yeterli örnek yoksa ufuk geneli; o da yoksa "uygulanmadı".
 *   2) PAGE-HINKLEY kayma denetimi: hata serisinde kalıcı artış → "yeniden kalibrasyon".
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: config.CALIBRATION, config.DRIFT.
 * KURAL: Kalibrasyon verisi ile test verisi AYRI dönemlerden gelir (sızıntı yok);
 *        bu ayrımı çağıran (tools/backtest.js) sağlar.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'));
  else { const ns = root.AcilRadarMotor = root.AcilRadarMotor || {}; ns.calibrate = factory(ns.config); }
})(typeof self !== 'undefined' ? self : this, function (config) {
  'use strict';

  const C = config.CALIBRATION;

  function conformalQuantile(scores, coverage) {
    const sorted = scores.filter(function (v) { return isFinite(v); }).sort(function (a, b) { return a - b; });
    const n = sorted.length;
    if (!n) return null;
    const rank = Math.ceil((n + 1) * coverage);
    return rank > n ? sorted[n - 1] : sorted[rank - 1];
  }

  /**
   * @param {{target:string, horizon:(number|string), daypart:string, y:number, lo:number, hi:number}[]} records
   * @returns {CalibrationTable}
   */
  function fit(records) {
    const groups = {};
    (records || []).forEach(function (r) {
      if (![r.y, r.lo, r.hi].every(isFinite)) return;
      const score = Math.max(r.lo - r.y, r.y - r.hi);
      const cell = r.target + '|' + r.horizon + '|' + r.daypart;
      const pooled = r.target + '|' + r.horizon + '|*';
      (groups[cell] = groups[cell] || []).push(score);
      (groups[pooled] = groups[pooled] || []).push(score);
    });
    const table = {};
    Object.keys(groups).forEach(function (key) {
      const scores = groups[key];
      const minSize = key.slice(-2) === '|*' ? C.MIN_POOLED_SIZE : C.MIN_CELL_SIZE;
      if (scores.length >= minSize) table[key] = { q: conformalQuantile(scores, C.TARGET_COVERAGE), n: scores.length };
    });
    return { coverage: C.TARGET_COVERAGE, cells: table };
  }

  /**
   * @returns {{lo:number, hi:number, applied:boolean, scope:?string}}
   */
  function apply(table, target, horizon, daypart, lo, hi, floor) {
    const none = { lo: lo, hi: hi, applied: false, scope: null };
    if (!table || !table.cells) return none;
    const cell = table.cells[target + '|' + horizon + '|' + daypart];
    const pooled = table.cells[target + '|' + horizon + '|*'];
    const use = cell || pooled;
    if (!use) return none;
    let newLo = lo - use.q;
    let newHi = hi + use.q;
    if (newLo > newHi) { const mid = (lo + hi) / 2; newLo = mid; newHi = mid; }
    const minimum = floor === undefined ? 0 : floor;
    return { lo: Math.max(minimum, newLo), hi: Math.max(minimum, newHi), applied: true, scope: cell ? 'cell' : 'horizon' };
  }

  /**
   * Page-Hinkley (artış yönü). errors: mutlak hata serisi.
   * @returns {{alarm:boolean, index:?number, statistic:number}}
   */
  function pageHinkley(errors, options) {
    const delta = options && options.delta !== undefined ? options.delta : config.DRIFT.DELTA;
    const lambda = options && options.lambda !== undefined ? options.lambda : config.DRIFT.LAMBDA;
    let mean = 0;
    let m = 0;
    let minM = 0;
    let n = 0;
    for (let i = 0; i < errors.length; i++) {
      const e = errors[i];
      if (!isFinite(e)) continue;
      n += 1;
      mean += (e - mean) / n;
      m += e - mean - delta;
      minM = Math.min(minM, m);
      if (m - minM > lambda) return { alarm: true, index: i, statistic: m - minM };
    }
    return { alarm: false, index: null, statistic: m - minM };
  }

  return { fit: fit, apply: apply, pageHinkley: pageHinkley, conformalQuantile: conformalQuantile };
});

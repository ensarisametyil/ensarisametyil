/* =============================================================================
 * motor/core/calibrate.js
 * NE İŞE YARAR : Kalibrasyon ve kayma denetimi.
 *   0) SAPMA DÜZELTMESİ: ayar döneminde hücre başına artıkların ortancası (y − tahmin)
 *      öğrenilir; tahmin ve aralık bu kadar kaydırılır (motorun bilmediği hizmet/yatış
 *      farklarını kısmen giderir). Önce kaydırılır, sonra conformal uygulanır.
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

  function median(values) {
    const s = values.slice().sort(function (a, b) { return a - b; });
    const n = s.length;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }

  function cellKeys(r) {
    return [r.target + '|' + r.horizon + '|' + r.daypart, r.target + '|' + r.horizon + '|*'];
  }

  /**
   * @param {{target:string, horizon:(number|string), daypart:string, y:number, point:number, lo:number, hi:number}[]} records
   *        YALNIZ ayar döneminden.
   * @returns {CalibrationTable}  hücre: { shift, q, n }
   */
  function fit(records, options) {
    const useShift = !(options && options.shift === false);
    const valid = (records || []).filter(function (r) { return [r.y, r.lo, r.hi].every(isFinite) && (!useShift || isFinite(r.point)); });
    const residuals = {};
    valid.forEach(function (r) {
      cellKeys(r).forEach(function (k) { (residuals[k] = residuals[k] || []).push(r.y - (useShift ? r.point : 0)); });
    });
    const minSize = function (key) { return key.slice(-2) === '|*' ? C.MIN_POOLED_SIZE : C.MIN_CELL_SIZE; };
    const shifts = {};
    Object.keys(residuals).forEach(function (k) { shifts[k] = useShift && residuals[k].length >= minSize(k) ? median(residuals[k]) : 0; });
    const scores = {};
    valid.forEach(function (r) {
      const keys = cellKeys(r);
      const shift = shifts[keys[0]] !== undefined && residuals[keys[0]].length >= minSize(keys[0]) ? shifts[keys[0]] : shifts[keys[1]] || 0;
      const score = Math.max(r.lo + shift - r.y, r.y - (r.hi + shift));
      keys.forEach(function (k) { (scores[k] = scores[k] || []).push(score); });
    });
    const table = {};
    Object.keys(scores).forEach(function (key) {
      if (scores[key].length >= minSize(key)) table[key] = { shift: shifts[key] || 0, q: conformalQuantile(scores[key], C.TARGET_COVERAGE), n: scores[key].length };
    });
    return { coverage: C.TARGET_COVERAGE, cells: table };
  }

  /**
   * @returns {{point:number, lo:number, hi:number, applied:boolean, scope:?string}}
   */
  function apply(table, target, horizon, daypart, point, lo, hi, floor, ceiling) {
    const none = { point: point, lo: lo, hi: hi, applied: false, scope: null };
    if (!table || !table.cells) return none;
    const cell = table.cells[target + '|' + horizon + '|' + daypart];
    const pooled = table.cells[target + '|' + horizon + '|*'];
    const use = cell || pooled;
    if (!use) return none;
    const shift = use.shift || 0;
    let newLo = lo + shift - use.q;
    let newHi = hi + shift + use.q;
    let newPoint = point + shift;
    if (newLo > newHi) { const mid = (newLo + newHi) / 2; newLo = mid; newHi = mid; }
    const minimum = floor === undefined ? 0 : floor;
    const maximum = ceiling === undefined ? Infinity : ceiling;
    const clamp = function (v) { return Math.min(maximum, Math.max(minimum, v)); };
    newPoint = Math.min(clamp(newHi), Math.max(clamp(newLo), clamp(newPoint)));
    return { point: newPoint, lo: clamp(newLo), hi: clamp(newHi), applied: true, scope: cell ? 'cell' : 'horizon' };
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

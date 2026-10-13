/* =============================================================================
 * motor/core/rng.js
 * NE İŞE YARAR : Tohumlu (tekrarlanabilir) rastgele sayı üreteci ve dağılım
 *                örnekleyicileri: düzgün, üstel, normal, log-normal, gamma, Poisson.
 *                Aynı tohum → aynı sayı dizisi (Node ve tarayıcıda aynı).
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: üreteç algoritması → create(); alt akış → fork().
 * NOT: Üreteç sfc32 (32 bit, hızlı, iyi istatistiksel nitelik); tohum metni cyrb128
 *      ile 128 bite yayılır. Kriptografik amaçla KULLANILMAZ.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.AcilRadarMotor = root.AcilRadarMotor || {}).rng = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TWO_POW_32 = 4294967296;
  const MAX_REJECTION_LOOPS = 1000;     // sınırsız döngüye karşı
  const SMALL_POISSON = 30;             // bunun altında çarpım yöntemi

  /** Metni dört 32 bitlik sayıya yayar (cyrb128). */
  function cyrb128(text) {
    let h1 = 1779033703;
    let h2 = 3144134277;
    let h3 = 1013904242;
    let h4 = 2773480762;
    for (let i = 0; i < text.length; i++) {
      const k = text.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
  }

  /** log Γ(x), x > 0 (Lanczos yaklaşımı; Poisson kabul testinde kullanılır). */
  function logGamma(x) {
    const g = 7;
    const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61503916999185, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
    const y = x - 1;
    let a = c[0];
    const t = y + g + 0.5;
    for (let i = 1; i < g + 2; i++) a += c[i] / (y + i);
    return 0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(a);
  }

  /**
   * Tohumlu üreteç.
   * @param {string|number} seed
   * @returns {Rng}
   */
  function create(seed) {
    const seedText = String(seed);
    const s = cyrb128(seedText);
    let a = s[0];
    let b = s[1];
    let c = s[2];
    let d = s[3];
    let spareNormal = null;

    /** (0, 1) aralığında düzgün sayı; 0 ve 1 hiç dönmez (log güvenli). */
    function uniform() {
      a |= 0; b |= 0; c |= 0; d |= 0;
      const t = (((a + b) | 0) + d) | 0;
      d = (d + 1) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      c = (c + t) | 0;
      return ((t >>> 0) + 0.5) / TWO_POW_32;
    }

    function normal() {
      if (spareNormal !== null) {
        const value = spareNormal;
        spareNormal = null;
        return value;
      }
      const u = uniform();
      const v = uniform();
      const r = Math.sqrt(-2 * Math.log(u));
      spareNormal = r * Math.sin(2 * Math.PI * v);
      return r * Math.cos(2 * Math.PI * v);
    }

    /** Üstel; rate > 0 (olay/dk). rate ≤ 0 ise Infinity (olay yok). */
    function exponential(rate) {
      if (!(rate > 0)) return Infinity;
      return -Math.log(uniform()) / rate;
    }

    function lognormal(mu, sigma) {
      return Math.exp(mu + sigma * normal());
    }

    /** Gamma(şekil, ölçek) — Marsaglia & Tsang (2000). */
    function gamma(shape, scale) {
      if (!(shape > 0) || !(scale > 0)) return 0;
      if (shape < 1) return gamma(shape + 1, scale) * Math.pow(uniform(), 1 / shape);
      const dd = shape - 1 / 3;
      const cc = 1 / Math.sqrt(9 * dd);
      for (let i = 0; i < MAX_REJECTION_LOOPS; i++) {
        let x;
        let v;
        do {
          x = normal();
          v = 1 + cc * x;
        } while (v <= 0);
        v = v * v * v;
        const u = uniform();
        if (u < 1 - 0.0331 * x * x * x * x) return dd * v * scale;
        if (Math.log(u) < 0.5 * x * x + dd * (1 - v + Math.log(v))) return dd * v * scale;
      }
      return shape * scale;   // olağanüstü durumda beklenen değer
    }

    /** Poisson(λ). Küçük λ: çarpım yöntemi; büyük λ: PTRS (Hörmann, 1993). */
    function poisson(lambda) {
      if (!(lambda > 0)) return 0;
      if (lambda < SMALL_POISSON) {
        const limit = Math.exp(-lambda);
        let k = 0;
        let p = uniform();
        while (p > limit && k < MAX_REJECTION_LOOPS) {
          k += 1;
          p *= uniform();
        }
        return k;
      }
      const slam = Math.sqrt(lambda);
      const logLambda = Math.log(lambda);
      const bb = 0.931 + 2.53 * slam;
      const aa = -0.059 + 0.02483 * bb;
      const invAlpha = 1.1239 + 1.1328 / (bb - 3.4);
      const vr = 0.9277 - 3.6224 / (bb - 2);
      for (let i = 0; i < MAX_REJECTION_LOOPS; i++) {
        const u = uniform() - 0.5;
        const v = uniform();
        const us = 0.5 - Math.abs(u);
        const k = Math.floor((2 * aa / us + bb) * u + lambda + 0.43);
        if (us >= 0.07 && v <= vr) return k;
        if (k < 0 || (us < 0.013 && v > us)) continue;
        if (Math.log(v) + Math.log(invAlpha) - Math.log(aa / (us * us) + bb) <= -lambda + k * logLambda - logGamma(k + 1)) return k;
      }
      return Math.round(lambda);
    }

    function bernoulli(p) {
      return uniform() < p;
    }

    /** Ağırlıklı seçim: keys sırasıyla weights. */
    function choice(keys, weights) {
      let total = 0;
      for (let i = 0; i < weights.length; i++) total += weights[i];
      let r = uniform() * total;
      for (let i = 0; i < keys.length; i++) {
        r -= weights[i];
        if (r <= 0) return keys[i];
      }
      return keys[keys.length - 1];
    }

    /** Bağımsız alt akış: aynı tohum + etiket → aynı alt dizi (ortak rastgele sayılar). */
    function fork(label) {
      return create(seedText + '/' + label);
    }

    return { seed: seedText, uniform: uniform, normal: normal, exponential: exponential, lognormal: lognormal,
      gamma: gamma, poisson: poisson, bernoulli: bernoulli, choice: choice, fork: fork };
  }

  return { create: create, logGamma: logGamma };
});

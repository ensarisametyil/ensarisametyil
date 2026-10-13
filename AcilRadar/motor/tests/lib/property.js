/* =============================================================================
 * motor/tests/lib/property.js
 * NE İŞE YARAR : Bağımlılıksız, tohumlu özellik tabanlı test yardımcısı.
 *   forAll(üreteç, özellik, {runs, seed}) — özellik her örnekte doğru olmalı;
 *   bozulursa örnek ve tohum hata iletisinde yazılır (yeniden üretilebilir).
 * NOT: Küçültme (shrinking) yoktur; karşı örnek olduğu gibi raporlanır.
 * ========================================================================== */
'use strict';

const rngLib = require('../../core/rng.js');

function forAll(generate, property, options) {
  const o = Object.assign({ runs: 50, seed: 'property' }, options);
  const rng = rngLib.create(o.seed);
  for (let i = 0; i < o.runs; i++) {
    const sample = generate(rng, i);
    let ok;
    try {
      ok = property(sample);
    } catch (error) {
      throw new Error('özellik hata verdi (tohum ' + o.seed + ', örnek ' + i + '): ' + error.message + ' — ' + JSON.stringify(sample).slice(0, 300));
    }
    if (!ok) throw new Error('özellik bozuldu (tohum ' + o.seed + ', örnek ' + i + '): ' + JSON.stringify(sample).slice(0, 300));
  }
  return true;
}

function int(rng, lo, hi) {
  return lo + Math.floor(rng.uniform() * (hi - lo + 1));
}

module.exports = { forAll: forAll, int: int };

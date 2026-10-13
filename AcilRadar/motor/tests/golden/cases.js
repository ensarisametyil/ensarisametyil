/* Altın dosya (regresyon) senaryoları. Çıktı golden.json'da saklıdır.
 * Kasıtlı model değişikliğinde: config.MODEL_VERSION artırılır, sonra
 *   node motor/tests/golden/update.js
 * ile golden.json yeniden üretilir ve DEGISIKLIK.md'ye not düşülür. */
'use strict';
const F = require('../lib/fixtures.js');

const OPTIONS = { maxRuns: 300, minRuns: 300, explain: true };

module.exports = {
  OPTIONS: OPTIONS,
  CASES: [
    { name: 'sakin-gun', nowMs: F.NOW, input: F.input({ greenWaiting: 6, yellowWaiting: 2, boarding: 1 }) },
    { name: 'kalabalik-yatak-tikali', nowMs: F.NOW, input: F.input({ greenWaiting: 45, yellowWaiting: 14, boarding: 12, bedCapacity: 24 }) },
    { name: 'eksik-veri-gece', nowMs: Date.parse('2026-10-13T02:00:00+03:00'), input: F.input({ updatedAtMs: Date.parse('2026-10-13T01:55:00+03:00'), activePhysicians: undefined, inService: undefined, bedCapacity: undefined }) },
    { name: 'bayram-ilk-gun', nowMs: Date.parse('2026-05-27T11:00:00+03:00'), input: F.input({ updatedAtMs: Date.parse('2026-05-27T10:57:00+03:00'), dataSource: 'official' }) }
  ]
};

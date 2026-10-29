'use strict';
/* Sözleşme uyumu: motor çıktısı (EK-1 alanları + 1.2 isteğe bağlı alanlar) arayüzle
 * paylaşılan JSON Şemasına (docs/hospitals.schema.json) karşı doğrulanır. */
const fs = require('fs');
const path = require('path');
const { test, assert } = require('../lib/harness.js');
const { validateAgainst } = require('../../../tests/lib/json-schema-lite.js');
const engine = require('../../core/index.js');
const F = require('../lib/fixtures.js');

const SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../docs/hospitals.schema.json'), 'utf8'));
const IDENTITY = { name: 'Örnek Devlet Hastanesi Test', district: 'Gebze', lat: 40.8, lng: 29.43, childER: false, ownership: 'public' };

function envelope(hospitals) {
  return { schemaVersion: '1.2', generatedAt: engine.toIso(F.NOW), region: null, notice: null, hospitals: hospitals };
}

test('sözleşme: motor çıktısı şemaya uyar (şimdi / +2 saat / akşam; tam, kısmi, mevsimsel, örnek veri)', function () {
  const hist = F.occupancyHistory(3, function (ms) { return 40 + (ms / 1800000) % 30; });
  const inputs = [F.input({ occupancyHistory: hist }), F.input({ activePhysicians: undefined, bedCapacity: undefined, occupancyHistory: hist }), F.input({ greenWaiting: undefined, yellowWaiting: undefined }),
    F.input({ dataSource: 'simulated', greenWaiting: 80, occupancyHistory: hist }), F.input()];
  const list = [];
  inputs.forEach(function (inp, i) {
    const r = engine.computeHospital(inp, { nowMs: F.NOW, maxRuns: 150 });
    ['now', '2h', 'evening'].forEach(function (slot) {
      const c = engine.toContract(r, slot);
      if (c) list.push(Object.assign({ hospitalId: 'ornek-' + i + '-' + slot }, IDENTITY, c));
    });
  });
  assert.ok(list.length >= 10);
  const errors = validateAgainst(SCHEMA, envelope(list));
  assert.equal(errors.length, 0, errors.slice(0, 5).join(' | '));
});

test('sözleşme: alan adları ve türleri EK-1 ile aynı (zorunlu alanların hepsi var)', function () {
  const r = engine.computeHospital(F.input(), { nowMs: F.NOW, maxRuns: 100, explain: false });
  const c = engine.toContract(r, 'now');
  ['occupancyPercent', 'crowdingLevel', 'greenWaiting', 'yellowWaiting', 'activePhysicians', 'estimatedGreenWaitMinutes',
    'estimatedYellowWaitMinutes', 'updatedAt', 'isForecast', 'dataSource'].forEach(function (k) { assert.ok(k in c, k); });
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+03:00$/.test(c.updatedAt), c.updatedAt);
});

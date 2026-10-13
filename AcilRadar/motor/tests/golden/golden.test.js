'use strict';
const fs = require('fs');
const path = require('path');
const { test, assert } = require('../lib/harness.js');
const { snapshot } = require('./update.js');

test('altın dosya: kasıtlı sürüm artışı olmadan çıktı değişmez (tekrarlanabilirlik dahil)', function () {
  const file = path.join(__dirname, 'golden.json');
  assert.ok(fs.existsSync(file), 'golden.json yok: node motor/tests/golden/update.js');
  const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
  const current = snapshot();
  if (stored.modelVersion !== current.modelVersion) throw new Error('model sürümü değişti (' + stored.modelVersion + ' → ' + current.modelVersion + '): golden.json kasıtlı olarak yeniden üretilmeli');
  Object.keys(stored.cases).forEach(function (name) {
    assert.deepEqual(current.cases[name], stored.cases[name], name);
  });
  assert.deepEqual(snapshot(), current, 'aynı tohum aynı çıktı');
});

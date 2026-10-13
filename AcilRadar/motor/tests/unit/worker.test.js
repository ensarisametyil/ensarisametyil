'use strict';
const { test, assert } = require('../lib/harness.js');
const { runInWorker } = require('../../tools/worker.js');
const engine = require('../../core/index.js');
const F = require('../lib/fixtures.js');

test('worker: Node worker_threads ile aynı çekirdek → ana iş parçacığıyla aynı sonuç', async function () {
  const options = { nowMs: F.NOW, maxRuns: 100, explain: false, seed: 'w' };
  const viaWorker = await runInWorker({ kind: 'hospital', input: F.input(), options: options });
  const direct = engine.computeHospital(F.input(), options);
  assert.deepEqual(engine.toContract(viaWorker, '2h'), engine.toContract(direct, '2h'));
});

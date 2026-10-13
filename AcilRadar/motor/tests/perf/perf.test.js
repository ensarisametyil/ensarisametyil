'use strict';
/* Performans bütçesi (Node): tek hastane tahmini (şimdi + ufuklar + akşam), en çok
 * 1500 benzetim, p95 ≤ 250 ms. Açıklama (karşıolgusal) ayrıca ölçülür ve raporlanır.
 * NOT: Süre makineye bağlıdır; sonuç tabloya yazılır (PERF_REPORT ortam değişkeni). */
const { test, assert } = require('../lib/harness.js');
const engine = require('../../core/index.js');
const F = require('../lib/fixtures.js');

const BUDGET_MS = 250;
const results = {};

function p95(list) {
  const s = list.slice().sort(function (a, b) { return a - b; });
  return s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)];
}

function measure(label, options, hours) {
  const times = [];
  hours.forEach(function (h, i) {
    const now = Date.parse('2026-10-13T' + (h < 10 ? '0' : '') + h + ':00:00+03:00');
    const inp = F.input({ hospitalId: 'perf-' + i, updatedAtMs: now - 3 * F.MIN, greenWaiting: 10 + (i * 7) % 40, yellowWaiting: 3 + i % 9 });
    const t = Date.now();
    engine.computeHospital(inp, Object.assign({ nowMs: now }, options));
    times.push(Date.now() - t);
  });
  results[label] = { p50: times.slice().sort(function (a, b) { return a - b; })[Math.floor(times.length / 2)], p95: p95(times), max: Math.max.apply(null, times), n: times.length };
  return results[label];
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 0, 3, 6, 9, 14];

test('performans: tek hastane (açıklamasız) p95 ≤ 250 ms', function () {
  engine.computeHospital(F.input(), { nowMs: F.NOW, explain: false });   // ısınma
  const r = measure('tahmin (açıklamasız)', { explain: false }, HOURS);
  assert.ok(r.p95 <= BUDGET_MS, 'p95 ' + r.p95 + ' ms');
});

test('performans: açıklama dahil süre ölçülür (bütçe dışı, raporlanır)', function () {
  const r = measure('tahmin + açıklama', {}, HOURS.slice(0, 10));
  assert.ok(r.p95 > 0);
});

test('performans: bölge (20 hastane, açıklamasız)', function () {
  engine.clearCache();
  const list = [];
  for (let i = 0; i < 20; i++) list.push(F.input({ hospitalId: 'bolge-' + i, greenWaiting: 5 + i }));
  const t = Date.now();
  engine.computeRegion(list, { nowMs: F.NOW, explain: false });
  results['bölge 20 hastane (ilk)'] = { p50: Date.now() - t, p95: Date.now() - t, max: Date.now() - t, n: 1 };
  const t2 = Date.now();
  engine.computeRegion(list, { nowMs: F.NOW, explain: false });
  results['bölge 20 hastane (önbellek)'] = { p50: Date.now() - t2, p95: Date.now() - t2, max: Date.now() - t2, n: 1 };
  assert.ok(Date.now() - t2 < 50, 'önbellekten dönmeli');
});

module.exports = { results: results };

'use strict';
const { test, assert } = require('../lib/harness.js');
const calibrate = require('../../core/calibrate.js');
const fallback = require('../../core/fallback.js');
const quality = require('../../core/quality.js');
const engine = require('../../core/index.js');
const rngLib = require('../../core/rng.js');
const F = require('../lib/fixtures.js');

// Yasak ifadeler (görev kuralı). Sözcükler bu dosyada da geçmesin diye parçalardan kurulur.
const FORBIDDEN = new RegExp(['yapay ' + 'zek', 'can' + 'lı', 'an' + 'lık', 'gerçek ' + 'zaman', 'öl' + 'üm', 'teh' + 'like'].join('|'), 'i');

test('calibrate: dar aralık genişler, kapsama hedefe yaklaşır (eğitim ≠ sınama)', function () {
  const rng = rngLib.create('cal');
  // Gerçek değer tahminden sistematik olarak 6 yüksek (sapma) ve aralık dar
  const make = function (n) { const out = []; for (let i = 0; i < n; i++) { const y = 6 + rng.normal() * 10; out.push({ target: 'occupancy', horizon: '120', daypart: 'day', y: y, point: 0, lo: -5, hi: 5 }); } return out; };
  const table = calibrate.fit(make(400));
  const test = make(2000);
  let covered = 0;
  let shiftedError = 0;
  test.forEach(function (r) {
    const a = calibrate.apply(table, 'occupancy', '120', 'day', r.point, r.lo, r.hi, -Infinity);
    if (r.y >= a.lo && r.y <= a.hi) covered += 1;
    shiftedError += a.point - r.y;
  });
  assert.between(covered / test.length, 0.76, 0.84);
  assert.near(shiftedError / test.length, 0, 1.5, 'sapma düzeltildi');
});

test('calibrate: veri yetersiz → uygulanmadı; geniş aralık daralabilir', function () {
  const small = calibrate.fit([{ target: 'occupancy', horizon: '60', daypart: 'day', y: 0, point: 0, lo: -1, hi: 1 }]);
  assert.equal(calibrate.apply(small, 'occupancy', '60', 'day', 5, 0, 10).applied, false);
  const rows = [];
  for (let i = 0; i < 100; i++) rows.push({ target: 'w', horizon: '0', daypart: 'night', y: 0, point: 0, lo: -50, hi: 50 });
  const t = calibrate.fit(rows);
  const a = calibrate.apply(t, 'w', '0', 'night', 0, -50, 50, -Infinity);
  assert.ok(a.applied && a.hi < 50, 'aşırı geniş aralık daraldı');
});

test('calibrate: Page-Hinkley kalıcı artışı yakalar, durağanda alarm yok', function () {
  const rng = rngLib.create('ph');
  const flat = []; const jump = [];
  for (let i = 0; i < 300; i++) { flat.push(5 + rng.normal()); jump.push(i < 150 ? 5 + rng.normal() : 15 + rng.normal()); }
  assert.equal(calibrate.pageHinkley(flat).alarm, false);
  const r = calibrate.pageHinkley(jump);
  assert.ok(r.alarm && r.index >= 150);
});

test('fallback: basamaklar (tam / kısmi / mevsimsel / bilinmiyor)', function () {
  assert.equal(fallback.tier(quality.assess(F.input(), F.NOW)), 'full');
  assert.equal(fallback.tier(quality.assess(F.input({ activePhysicians: undefined }), F.NOW)), 'partial');
  assert.equal(fallback.tier(quality.assess(F.input({ greenWaiting: undefined, yellowWaiting: undefined }), F.NOW)), 'seasonal');
  assert.equal(fallback.tier(quality.assess(F.input({ updatedAtMs: F.NOW - 60 * F.MIN }), F.NOW)), 'unknown');
});

test('index: bayat veride sayı üretilmez → { ok:true, level:"unknown", reason:"STALE" }', function () {
  const r = engine.computeHospital(F.input({ updatedAtMs: F.NOW - 45 * F.MIN }), { nowMs: F.NOW });
  assert.equal(r.ok, true); assert.equal(r.level, 'unknown'); assert.equal(r.reason, 'STALE');
  assert.equal(r.horizons, undefined);
  assert.equal(engine.toContract(r, 'now'), null);
});

test('index: örnek (simulated) veride isForecast:true ve simulated:true; güven düşük', function () {
  const r = engine.computeHospital(F.input({ dataSource: 'simulated' }), { nowMs: F.NOW, maxRuns: 200, explain: false });
  const c = engine.toContract(r, 'now');
  assert.equal(c.isForecast, true); assert.equal(c.simulated, true); assert.equal(c.confidence, 'low');
});

test('index: [motor incelemesi] doluluk etkenleri en çok 3, şablon cümle, yuvarlanmış puan, yasaklı ifade yok', function () {
  const r = engine.computeHospital(F.input({ greenWaiting: 40, boarding: 6 }), { nowMs: F.NOW, maxRuns: 300, explainTarget: 'occupancy' });
  ['now', '2h', 'evening'].forEach(function (slot) {
    const list = r.factors[slot] || [];
    assert.ok(list.length <= 3);
    list.forEach(function (f) {
      assert.equal(f.points, Math.round(f.points));
      assert.ok(/yaklaşık [+−]\d+ puan\.$/.test(f.text), f.text);
      assert.ok(!FORBIDDEN.test(f.text), f.text);
    });
  });
  assert.ok(r.factors['2h'].some(function (f) { return f.key === 'queue'; }), 'kalabalık kuyruk 2 saatlik tahmine katkı yapmalı');
});

test('index: akşam 20:00 sonrası "geçti" — akşam sözleşme çıktısı yok', function () {
  const late = Date.parse('2026-10-13T21:00:00+03:00');
  const r = engine.computeHospital(F.input({ updatedAtMs: late - 5 * F.MIN }), { nowMs: late, maxRuns: 200, explain: false });
  assert.equal(r.evening.mode, 'passed');
  assert.equal(engine.toContract(r, 'evening'), null);
  assert.ok(engine.toContract(r, '2h'));
});

test('index: akşam çok uzaksa (gece 03:00) motor yalnız mevsimsel öncül kullanır; hibrit akşam geçmiş ortalamadan gelir', function () {
  const early = Date.parse('2026-10-13T03:00:00+03:00');
  const inp = F.input({ updatedAtMs: early - 5 * F.MIN, dataSource: 'official', occupancyHistory: F.occupancyHistory(3, 55, early) });
  const r = engine.computeHospital(inp, { nowMs: early, maxRuns: 200, explain: false });
  assert.equal(r.evening.mode, 'seasonal');
  const c = engine.toContract(r, 'evening');
  assert.equal(c.occupancyPercent, 55, 'akşam = aynı saat-gün geçmiş ortalaması');
  assert.ok(!('confidence' in c) && !('factors' in c), 'doluluk tahmininde güven/etken yok');
});

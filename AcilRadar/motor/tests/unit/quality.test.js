'use strict';
const { test, assert } = require('../lib/harness.js');
const quality = require('../../core/quality.js');
const F = require('../lib/fixtures.js');

test('quality: geçerli kayıt → ok; eksik isteğe bağlı alanlar assumedFields içinde', function () {
  const a = quality.assess(F.input({ inService: undefined, bedCapacity: undefined }), F.NOW);
  assert.equal(a.status, 'ok');
  assert.ok(a.assumedFields.indexOf('inService') !== -1);
  assert.ok(a.assumedFields.indexOf('bedCapacity') !== -1);
  assert.equal(a.assumedCore, 0);
});

test('quality: bayat (> 30 dk) → stale, gelecek tarih → future, kimliksiz → invalid', function () {
  assert.equal(quality.assess(F.input({ updatedAtMs: F.NOW - 31 * F.MIN }), F.NOW).status, 'stale');
  assert.equal(quality.assess(F.input({ updatedAtMs: F.NOW + 10 * F.MIN }), F.NOW).status, 'future');
  assert.equal(quality.assess(F.input({ updatedAtMs: F.NOW + 3 * F.MIN }), F.NOW).status, 'ok', 'saat kayması toleransı');
  assert.equal(quality.assess(F.input({ hospitalId: '' }), F.NOW).status, 'invalid');
  assert.equal(quality.assess(null, F.NOW).status, 'invalid');
  assert.equal(quality.assess(F.input(), NaN).status, 'invalid');
  assert.equal(quality.assess(F.input({ updatedAtMs: undefined, updatedAt: '2026-10-13T13:58:00+03:00' }), F.NOW).status, 'ok', 'ISO zaman kabul');
});

test('quality: NaN / negatif / kesirli / aşırı değer → uyarı (sessiz düzeltme yok)', function () {
  const a = quality.assess(F.input({ greenWaiting: NaN, yellowWaiting: -2, boarding: 2.6, activePhysicians: 4, inService: 1e9 }), F.NOW);
  const codes = a.warnings.map(function (w) { return w.code + ':' + w.field; });
  assert.ok(codes.indexOf('NOT_A_NUMBER:greenWaiting') !== -1, codes.join());
  assert.ok(codes.indexOf('NEGATIVE:yellowWaiting') !== -1);
  assert.ok(codes.indexOf('ROUNDED:boarding') !== -1);
  assert.ok(codes.indexOf('OUTLIER_CLAMPED:inService') !== -1);
  assert.equal(a.record.boarding, 3);
  assert.equal(a.record.inService, 9999);
  assert.ok(a.waitingMissing, 'iki bekleyen alanı da yok');
});

test('quality: hekim başına akıl dışı bekleyen → sınırlanır ve uyarı', function () {
  const a = quality.assess(F.input({ activePhysicians: 2, greenWaiting: 500 }), F.NOW);
  assert.equal(a.record.greenWaiting, 120);
  assert.ok(a.warnings.some(function (w) { return w.code === 'OUTLIER_CLAMPED' && w.field === 'greenWaiting'; }));
});

test('quality: 0 hekim → varsayılan hekim + uyarı + çekirdek varsayım', function () {
  const a = quality.assess(F.input({ activePhysicians: 0 }), F.NOW);
  assert.ok(a.assumedFields.indexOf('activePhysicians') !== -1);
  assert.equal(a.assumedCore, 1);
  assert.ok(a.warnings.some(function (w) { return w.code === 'ZERO_PHYSICIANS'; }));
});

test('quality: bilinmeyen kaynak → simulated (en düşük güven) + uyarı', function () {
  const a = quality.assess(F.input({ dataSource: 'x' }), F.NOW);
  assert.equal(a.record.dataSource, 'simulated');
  assert.ok(a.warnings.some(function (w) { return w.code === 'UNKNOWN_SOURCE'; }));
});

test('quality: güven düzeyi kuralları ve tavanlar', function () {
  const c = function (f) { return quality.confidence(Object.assign({ ageMinutes: 5, dataSource: 'official', assumedCore: 0, missingOptional: 0, tier: 'full' }, f)).level; };
  assert.equal(c({}), 'high');
  assert.equal(c({ dataSource: 'hospital' }), 'medium', 'taze 2 + kaynak 1 + eksiksiz 2 + doğruluk bilinmiyor 1 = 6');
  assert.equal(c({ dataSource: 'hospital', recentAccuracy: 'good' }), 'high');
  assert.equal(c({ dataSource: 'simulated', recentAccuracy: 'good' }), 'low', 'örnek veri en çok düşük');
  assert.equal(c({ tier: 'partial' }), 'medium', 'kısmi veri en çok orta');
  assert.equal(c({ tier: 'seasonal' }), 'low');
  assert.equal(c({ ageMinutes: 25, dataSource: 'hospital', assumedCore: 1 }), 'low');
});

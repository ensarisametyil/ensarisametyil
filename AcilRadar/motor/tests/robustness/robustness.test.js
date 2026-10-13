'use strict';
/* Dayanıklılık: bozuk/eksik/aşırı girdi, boş liste, 0–200 hastane, NaN, çok büyük
 * sayılar, negatif zaman, bayat veri, gece yarısı, bayram başlangıcı, 20:00 sonrası. */
const { test, assert } = require('../lib/harness.js');
const engine = require('../../core/index.js');
const F = require('../lib/fixtures.js');

const FAST = { maxRuns: 60, minRuns: 60, explain: false };
const BAD = [null, undefined, 42, 'x', [], {}, { hospitalId: 'a' }, { hospitalId: 'a', updatedAtMs: 'dün' },
  F.input({ activePhysicians: NaN, greenWaiting: Infinity, yellowWaiting: -1 }),
  F.input({ greenWaiting: 1e12, yellowWaiting: 1e12, inService: 1e12, boarding: 1e12, bedCapacity: 1e12, arrivalsLastHour: 1e12 }),
  F.input({ physicianSchedule: [{ from: -5, to: 9999, count: 'x' }, null, 7] }),
  F.input({ history: [null, { startMs: 'x' }, { startMs: F.NOW + 3600000, arrivals: 5 }, { startMs: F.NOW - 7200000, arrivals: -4 }] }),
  F.input({ hospitalId: 'x'.repeat(65) }), F.input({ updatedAtMs: -1e15 }), F.input({ updatedAtMs: F.NOW + 86400000 }),
  F.input({ activePhysicians: 0, greenWaiting: 0, yellowWaiting: 0, inService: 0, boarding: 0, bedCapacity: 0 })];

function allFinite(value) {
  if (typeof value === 'number') return isFinite(value);
  if (Array.isArray(value)) return value.every(allFinite);
  if (value && typeof value === 'object') return Object.keys(value).every(function (k) { return allFinite(value[k]); });
  return true;
}

test('dayanıklılık: bozuk girdiler hata fırlatmaz; ok:true + sayı yok ya da sonlu sayılar', function () {
  BAD.forEach(function (inp, i) {
    const r = engine.computeHospital(inp, Object.assign({ nowMs: F.NOW }, FAST));
    assert.equal(r.ok, true, 'girdi ' + i);
    ['now', '2h', 'evening'].forEach(function (slot) {
      const c = engine.toContract(r, slot);
      if (c) assert.ok(allFinite(c), 'girdi ' + i + ' ' + slot + ': ' + JSON.stringify(c));
    });
  });
});

test('dayanıklılık: nowMs eksik/NaN/negatif → "bilinmiyor", çökme yok', function () {
  [undefined, NaN, -1e15].forEach(function (nowMs) {
    const r = engine.computeHospital(F.input(), Object.assign({ nowMs: nowMs }, FAST));
    assert.equal(r.ok, true);
    assert.equal(r.level, 'unknown');
  });
});

test('dayanıklılık: bölge — boş liste, dizi olmayan, 1 ve 200 hastane, 200 üstü kesilir', function () {
  engine.clearCache();
  assert.equal(engine.computeRegion([], { nowMs: F.NOW }).results.length, 0);
  assert.equal(engine.computeRegion('x', { nowMs: F.NOW }).ok, false);
  const many = [];
  for (let i = 0; i < 205; i++) many.push(F.input({ hospitalId: 'ornek-' + i, greenWaiting: i % 40 }));
  const r = engine.computeRegion(many, Object.assign({ nowMs: F.NOW }, FAST, { maxRuns: 30, minRuns: 30 }));
  assert.equal(r.results.length, 200);
  assert.equal(r.stats.dropped, 5);
  // LRU önbellek en çok 64 kayıt tutar: son hesaplananlar önbellekten döner.
  const again = engine.computeRegion(many.slice(190, 200), Object.assign({ nowMs: F.NOW }, FAST, { maxRuns: 30, minRuns: 30 }));
  assert.equal(again.stats.cached, 10, 'önbellek kullanıldı: ' + JSON.stringify(again.stats));
});

test('dayanıklılık: bölge zaman sınırı aşılınca kalan hastaneler azaltılmış koşuyla (degraded)', function () {
  engine.clearCache();
  const list = [];
  for (let i = 0; i < 6; i++) list.push(F.input({ hospitalId: 'z-' + i }));
  const r = engine.computeRegion(list, { nowMs: F.NOW, explain: false, deadlineMs: 1 });
  assert.ok(r.stats.degraded >= 4, JSON.stringify(r.stats));
  assert.ok(r.results.every(function (x) { return x.ok; }));
});

test('dayanıklılık: gece yarısı geçişi, bayram başlangıcı, arife, 20:00 sınırı', function () {
  const cases = ['2026-10-13T23:58:00+03:00', '2026-03-20T00:01:00+03:00', '2026-03-19T13:05:00+03:00', '2026-10-13T19:59:00+03:00', '2026-10-13T20:00:00+03:00'];
  cases.forEach(function (iso) {
    const now = Date.parse(iso);
    const r = engine.computeHospital(F.input({ updatedAtMs: now - 2 * F.MIN }), Object.assign({ nowMs: now }, FAST));
    assert.equal(r.ok, true, iso);
    assert.ok(engine.toContract(r, 'now'), iso);
    if (iso.indexOf('T20:00') !== -1) assert.equal(r.evening.mode, 'passed', '20:00 tam: geçti');
    if (iso.indexOf('T19:59') !== -1) assert.equal(r.evening.mode, 'simulated', '19:59: 1 dk sonrası');
  });
});

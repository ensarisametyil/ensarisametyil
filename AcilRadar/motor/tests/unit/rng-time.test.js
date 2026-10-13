'use strict';
const { test, assert } = require('../lib/harness.js');
const rngLib = require('../../core/rng.js');
const time = require('../../core/time.js');

function mean(list) { return list.reduce(function (a, b) { return a + b; }, 0) / list.length; }
function sample(fn, n) { const out = []; for (let i = 0; i < n; i++) out.push(fn()); return out; }

test('rng: aynı tohum aynı dizi, farklı tohum farklı dizi', function () {
  const a = rngLib.create('x'); const b = rngLib.create('x'); const c = rngLib.create('y');
  const sa = sample(a.uniform, 5); const sb = sample(b.uniform, 5); const sc = sample(c.uniform, 5);
  assert.deepEqual(sa, sb);
  assert.ok(JSON.stringify(sa) !== JSON.stringify(sc));
});

test('rng: düzgün sayı (0,1) açık aralığında; fork tekrarlanabilir', function () {
  const r = rngLib.create(1);
  sample(r.uniform, 20000).forEach(function (u) { assert.ok(u > 0 && u < 1, 'aralık dışı ' + u); });
  assert.equal(rngLib.create('s').fork('a').uniform(), rngLib.create('s').fork('a').uniform());
});

test('rng: dağılım ortalamaları (üstel, gamma, Poisson küçük/büyük, log-normal)', function () {
  const r = rngLib.create('moments');
  assert.near(mean(sample(function () { return r.exponential(0.5); }, 40000)), 2, 0.05);
  assert.near(mean(sample(function () { return r.gamma(3, 2); }, 40000)), 6, 0.1);
  assert.near(mean(sample(function () { return r.gamma(0.5, 1); }, 40000)), 0.5, 0.02);
  assert.near(mean(sample(function () { return r.poisson(4); }, 40000)), 4, 0.05);
  assert.near(mean(sample(function () { return r.poisson(120); }, 40000)), 120, 0.4);
  assert.near(mean(sample(function () { return r.lognormal(Math.log(10), 0.5); }, 40000)), 10 * Math.exp(0.125), 0.2);
});

test('rng: sınır değerleri (λ ≤ 0, oran ≤ 0, NaN) güvenli', function () {
  const r = rngLib.create(2);
  assert.equal(r.poisson(0), 0);
  assert.equal(r.poisson(-3), 0);
  assert.equal(r.poisson(NaN), 0);
  assert.equal(r.exponential(0), Infinity);
  assert.equal(r.gamma(0, 1), 0);
});

test('time: UTC+3 sabit; yerel parçalar, gece yarısı geçişi', function () {
  const ms = Date.parse('2026-10-13T20:59:00Z');   // yerel 23:59
  const p = time.parts(ms);
  assert.equal(p.hour, 23); assert.equal(p.dateKey, '2026-10-13'); assert.equal(p.weekday, 1);
  const next = time.parts(ms + 60000);
  assert.equal(next.hour, 0); assert.equal(next.dateKey, '2026-10-14'); assert.equal(next.weekday, 2);
  // Yaz saati yok: Temmuz ve Ocak aynı fark
  assert.equal(time.parts(Date.parse('2026-07-01T00:00:00Z')).hour, 3);
  assert.equal(time.parts(Date.parse('2026-01-01T00:00:00Z')).hour, 3);
});

test('time: akşam 20:00 hedefi; 20:00 ve sonrası "geçti"', function () {
  const at = function (iso) { return time.eveningTarget(Date.parse(iso)); };
  const e = at('2026-10-13T14:00:00+03:00');
  assert.ok(e.available); assert.equal(e.leadMinutes, 360); assert.equal(e.longLead, false);
  assert.equal(at('2026-10-13T20:00:00+03:00').available, false);
  assert.equal(at('2026-10-13T23:30:00+03:00').reason, 'PASSED');
  assert.ok(at('2026-10-13T03:00:00+03:00').longLead, '17 saat ileri → uzun');
});

test('time: takvim — resmî tatil, dini bayram, arife (13:00 sonrası), bayram ertesi', function () {
  const info = function (iso) { return time.dayInfo(Date.parse(iso)).type; };
  assert.equal(info('2026-10-29T10:00:00+03:00'), 'official');
  assert.equal(info('2026-10-28T10:00:00+03:00'), null, '28 Ekim sabah normal');
  assert.equal(info('2026-10-28T14:00:00+03:00'), 'arife', '28 Ekim öğleden sonra yarım gün');
  assert.equal(info('2026-03-20T09:00:00+03:00'), 'religious');
  assert.equal(info('2026-03-19T12:59:00+03:00'), null);
  assert.equal(info('2026-03-19T13:00:00+03:00'), 'arife');
  assert.equal(info('2026-05-31T09:00:00+03:00'), 'postReligious');
  assert.equal(info('2026-06-02T09:00:00+03:00'), null);
  assert.equal(info('2026-10-13T09:00:00+03:00'), null);
});

test('time: takvimde olmayan yıl → dini bayram bilinmiyor, resmî tatil yine uygulanır', function () {
  const d = time.dayInfo(Date.parse('2030-01-01T10:00:00+03:00'));
  assert.equal(d.calendarKnown, false);
  assert.equal(d.type, 'official');
  assert.equal(time.isSchoolTerm(Date.now()), null);
});

test('time: saat dilimi (gece/gündüz/akşam)', function () {
  assert.equal(time.daypart(Date.parse('2026-10-13T03:00:00+03:00')), 'night');
  assert.equal(time.daypart(Date.parse('2026-10-13T08:00:00+03:00')), 'day');
  assert.equal(time.daypart(Date.parse('2026-10-13T23:00:00+03:00')), 'evening');
});

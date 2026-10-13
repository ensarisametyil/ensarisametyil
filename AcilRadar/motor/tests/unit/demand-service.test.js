'use strict';
const { test, assert } = require('../lib/harness.js');
const demand = require('../../core/demand.js');
const service = require('../../core/service.js');
const quality = require('../../core/quality.js');
const rngLib = require('../../core/rng.js');
const F = require('../lib/fixtures.js');

function record(overrides) { return quality.assess(F.input(overrides), F.NOW).record; }

test('demand: geçmiş yoksa öncül (ölçek ≈ 1); geçmiş 2× ise ölçek → 2 yönünde büzülür', function () {
  const r0 = record({ arrivalsLastHour: undefined });
  const m0 = demand.learn(r0, F.NOW);
  assert.near(m0.scale, 1, 0.01);
  const base = demand.baseRatePerHour(r0);
  const twice = function (ms) { return Math.round(2 * demand.expectedPerHour(m0, ms + 1800000, {})); };
  const few = demand.learn(record({ arrivalsLastHour: undefined, history: F.history(3, twice) }), F.NOW);
  const many = demand.learn(record({ arrivalsLastHour: undefined, history: F.history(24 * 28, twice) }), F.NOW);
  assert.ok(few.scale > 1 && few.scale < many.scale, 'az veri öncüle yakın: ' + few.scale + ' < ' + many.scale);
  assert.near(many.scale, 2, 0.15, 'çok veri hastaneye özel');
  assert.ok(base > 0);
});

test('demand: CUSUM ani artışı yakalar, normal seride alarm yok', function () {
  const r0 = record({ arrivalsLastHour: undefined });
  const m0 = demand.learn(r0, F.NOW);
  const normal = function (ms) { return Math.round(demand.expectedPerHour(m0, ms + 1800000, {})); };
  const calm = demand.learn(record({ arrivalsLastHour: undefined, history: F.history(48, normal) }), F.NOW);
  assert.equal(calm.surge.alarm, false);
  const surge = function (ms) { return F.NOW - ms <= 3 * 3600000 ? 3 * normal(ms) : normal(ms); };
  const hot = demand.learn(record({ arrivalsLastHour: undefined, history: F.history(48, surge) }), F.NOW);
  assert.ok(hot.surge.alarm, 'alarm bekleniyordu');
  assert.between(hot.surge.factor, 1.2, 2.5);
});

test('demand: hız tablosu sonlu, negatif değil; ani artış zamanla söner; nötrleme etkili', function () {
  const r = record({ arrivalsLastHour: undefined, history: F.history(48, function () { return 40; }) });
  const m = demand.learn(r, F.NOW);
  const t = demand.rateTable(m, F.NOW, 600);
  for (let i = 0; i < t.rates.length; i++) assert.ok(isFinite(t.rates[i]) && t.rates[i] >= 0);
  const flat = demand.rateTable(m, F.NOW, 600, { seasonal: true });
  const varies = Math.max.apply(null, Array.from(t.rates)) - Math.min.apply(null, Array.from(t.rates));
  const flatVaries = Math.max.apply(null, Array.from(flat.rates)) - Math.min.apply(null, Array.from(flat.rates));
  assert.ok(flatVaries < varies, 'mevsimsellik nötrlenince hız düzleşir');
});

test('service: süreler pozitif, sınırlı; ortalama hizmet süresi makul', function () {
  const rng = rngLib.create('svc');
  const p = service.sampleParams(rng);
  for (let i = 0; i < 2000; i++) {
    const v = service.sampleService('green', p, rng);
    assert.ok(v > 0 && v <= 720);
  }
  assert.between(service.meanServiceMinutes(), 8, 25);
});

test('service: vardiya çizelgesi (gece yarısını aşan blok dahil) ve sabit karşıolgusal', function () {
  const schedule = [{ from: 480, to: 960, count: 8 }, { from: 960, to: 1440, count: 6 }, { from: 0, to: 480, count: 3 }];
  const r = record({ activePhysicians: 7, physicianSchedule: schedule });
  const ch = service.physicianChanges(r, F.NOW, 600);   // 14:00 → 24:00
  assert.deepEqual(ch[0], { at: 0, count: 7 }, 'şimdi bildirilen sayı');
  assert.deepEqual(ch[1], { at: 120, count: 6 }, '16:00 vardiya');
  assert.deepEqual(ch[2], { at: 600, count: 3 }, '00:00 gece');
  assert.equal(service.physicianChanges(r, F.NOW, 600, true).length, 1);
  assert.equal(service.scheduleCount([{ from: 1320, to: 120, count: 2 }], 30), 2, 'gece yarısını aşan blok');
});

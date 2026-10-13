'use strict';
const { test, assert } = require('../lib/harness.js');
const queue = require('../../core/queue.js');
const occupancy = require('../../core/occupancy.js');
const service = require('../../core/service.js');
const rngLib = require('../../core/rng.js');

function table(perMinute, slots) { return { slotMinutes: 15, rates: new Float64Array(slots || 200).fill(perMinute) }; }

function sim(o) {
  const rng = rngLib.create(o.seed || 'q');
  return queue.simulate(Object.assign({
    initial: { waiting: { red: 0, yellow: 0, green: 0 }, inService: 0, boarding: 0 },
    rng: rng, rateTable: table(0.2), scale: 1, serviceParams: { logShift: 0 },
    physicianChanges: [{ at: 0, count: 4 }], snapshots: [0, 60, 120], bedCapacity: null, tagClasses: ['green', 'yellow']
  }, o));
}

test('queue: 0. dakikadaki anlık görüntü gözlenen durumu aynen verir', function () {
  const r = sim({ initial: { waiting: { red: 1, yellow: 3, green: 7 }, inService: 4, boarding: 2 }, bedCapacity: 20 });
  const s = r.snapshots[0];
  assert.deepEqual(s.waiting, { red: 1, yellow: 3, green: 7 });
  assert.equal(s.inService, 4); assert.equal(s.boarding, 2); assert.equal(s.occupants, 17);
});

test('queue: başvuru yok + hekim var → bekleyenler erir; hekim yok → kimse muayene olmaz', function () {
  const drain = sim({ rateTable: table(0), initial: { waiting: { red: 0, yellow: 2, green: 10 }, inService: 0, boarding: 0 } });
  assert.equal(drain.snapshots[2].waiting.green + drain.snapshots[2].waiting.yellow, 0);
  const none = sim({ rateTable: table(0), physicianChanges: [{ at: 0, count: 0 }], initial: { waiting: { red: 0, yellow: 2, green: 10 }, inService: 0, boarding: 0 } });
  assert.equal(none.snapshots[1].waiting.yellow, 2, 'sarı vazgeçmeyebilir ama muayene de olmaz');
  assert.ok(none.tagWaits[0].green.censored, 'ölçüm hastası muayeneye alınamadı → sansürlü');
});

test('queue: yatak dolu → yatak gerektiren sınıf bekler, yeşil (hızlı alan) ilerler', function () {
  const r = sim({ rateTable: table(0), bedCapacity: 2, initial: { waiting: { red: 0, yellow: 3, green: 3 }, inService: 0, boarding: 2 }, physicianChanges: [{ at: 0, count: 4 }], snapshots: [0, 5] });
  assert.equal(r.snapshots[1].waiting.yellow, 3, 'yatak yok: sarı bekliyor');
  assert.equal(r.snapshots[1].waiting.green, 0, 'yeşil muayeneye alındı');
});

test('queue: olay sayısı sınırı ve sonlu çıktı (aşırı başvuru)', function () {
  const r = sim({ rateTable: table(5), snapshots: [0, 240] });
  assert.ok(r.events <= 50001);
  r.snapshots.forEach(function (s) { assert.ok(isFinite(s.occupants)); });
});

test('queue: aynı tohum aynı sonuç', function () {
  assert.deepEqual(sim({ seed: 'z' }), sim({ seed: 'z' }));
});

test('occupancy: kapasite, ham yüzde, seviye, yüzdelik, özet', function () {
  assert.equal(occupancy.capacity(40, 5), 40);
  assert.equal(occupancy.capacity(null, 5), 30);
  assert.equal(occupancy.capacity(null, 0), 1, 'sıfıra bölme yok');
  assert.equal(occupancy.rawPercent(15, 30), 50);
  assert.equal(occupancy.rawPercent(NaN, 30), 0);
  assert.equal(occupancy.level(49.9), 'low'); assert.equal(occupancy.level(50), 'medium'); assert.equal(occupancy.level(80), 'high');
  assert.equal(occupancy.quantile([], 0.5), null);
  assert.equal(occupancy.quantile([1, 2, 3, 4], 0.5), 2.5);
  const s = occupancy.summarize([10, 50, 90, 150]);
  assert.equal(s.overCapacityShare, 0.25);
  assert.ok(s.p90 <= 100, 'gösterilen değer en çok 100');
  assert.equal(occupancy.definitionInfo().index.applied, false);
});

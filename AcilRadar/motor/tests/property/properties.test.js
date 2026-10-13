'use strict';
/* Özellik tabanlı testler: rastgele (tohumlu) girdilerde her zaman doğru olması
 * gereken kurallar. Karşılaştırmalar ortak tohumla ve koşu ortalamasıyla yapılır;
 * Monte Carlo gürültüsü için küçük bir tolerans (TOL) vardır. */
const { test, assert } = require('../lib/harness.js');
const { forAll, int } = require('../lib/property.js');
const forecast = require('../../core/forecast.js');
const demand = require('../../core/demand.js');
const quality = require('../../core/quality.js');
const engine = require('../../core/index.js');
const F = require('../lib/fixtures.js');

const RUNS = 200;
const TOL = 1.5;   // dk / puan

function genInput(rng) {
  return F.input({
    activePhysicians: int(rng, 2, 12),
    greenWaiting: int(rng, 0, 60),
    yellowWaiting: int(rng, 0, 20),
    inService: int(rng, 0, 10),
    boarding: int(rng, 0, 8),
    bedCapacity: rng.uniform() < 0.5 ? null : int(rng, 15, 60),
    arrivalsLastHour: int(rng, 0, 40)
  });
}

function meanWait(input, offset, cls, bedless) {
  const rec = quality.assess(input, F.NOW).record;
  if (bedless) rec.bedCapacity = null;
  const m = demand.learn(rec, F.NOW);
  const r = forecast.run(rec, m, { startMs: F.NOW, offsets: [offset], seed: 'prop', maxRuns: RUNS, adaptive: false });
  return r.horizons[0][cls === 'green' ? 'waitGreen' : 'waitYellow'].mean;
}

test('özellik: bekleyen sayısı artınca yeşil bekleme azalmaz', function () {
  forAll(genInput, function (inp) {
    const a = meanWait(inp, 0, 'green');
    const b = meanWait(Object.assign({}, inp, { greenWaiting: inp.greenWaiting + 15 }), 0, 'green');
    return b >= a - TOL;
  }, { runs: 12, seed: 'p-queue' });
});

test('özellik: hekim sayısı artınca yeşil bekleme artmaz', function () {
  forAll(genInput, function (inp) {
    const a = meanWait(inp, 60, 'green');
    const b = meanWait(Object.assign({}, inp, { activePhysicians: inp.activePhysicians + 3 }), 60, 'green');
    return b <= a + TOL;
  }, { runs: 12, seed: 'p-phys' });
});

test('özellik: yatak kısıtı yokken öncelikli (sarı) sınıf yeşilden uzun beklemez', function () {
  forAll(genInput, function (inp) {
    return meanWait(inp, 60, 'yellow', true) <= meanWait(inp, 60, 'green', true) + TOL;
  }, { runs: 12, seed: 'p-prio' });
});

test('özellik: sözleşme çıktısı — doluluk 0–100, aralıklar sıralı, seviye eşikle tutarlı, 0. dk gözlemle aynı', function () {
  forAll(genInput, function (inp) {
    const r = engine.computeHospital(inp, { nowMs: F.NOW, maxRuns: 150, explain: false });
    return ['now', '2h', 'evening'].every(function (slot) {
      const c = engine.toContract(r, slot);
      if (!c) return true;
      const ordered = function (a) { return a[0] <= a[1]; };
      const lvl = c.occupancyPercent >= 80 ? 'high' : c.occupancyPercent >= 50 ? 'medium' : 'low';
      return c.occupancyPercent >= 0 && c.occupancyPercent <= 100 && ordered(c.occupancyRange) && ordered(c.estimatedGreenWaitMinutes) &&
        ordered(c.estimatedYellowWaitMinutes) && c.crowdingLevel === lvl && c.occupancyRange[0] <= c.occupancyPercent && c.occupancyPercent <= c.occupancyRange[1];
    }) && (function () {
      const rec = quality.assess(inp, F.NOW).record;
      const cap = rec.bedCapacity || rec.activePhysicians * 6;
      const observed = Math.min(100, (rec.greenWaiting + rec.yellowWaiting + rec.redWaiting + Math.min(rec.inService, rec.activePhysicians) + rec.boarding) / cap * 100);
      return Math.abs(r.horizons['0'].occupancy.p50 - observed) < 1e-6;
    })();
  }, { runs: 15, seed: 'p-contract' });
});

test('özellik: ufuklar arası tutarlılık — 0. dk aralığı en dar, yüzdelikler sıralı', function () {
  forAll(genInput, function (inp) {
    const r = engine.computeHospital(inp, { nowMs: F.NOW, maxRuns: 150, explain: false });
    const w0 = r.horizons['0'].occupancy.p90 - r.horizons['0'].occupancy.p10;
    return Object.keys(r.horizons).every(function (k) {
      const o = r.horizons[k].occupancy;
      return o.p10 <= o.p50 && o.p50 <= o.p90 && (o.p90 - o.p10) >= w0 - 1e-9;
    });
  }, { runs: 12, seed: 'p-horizon' });
});

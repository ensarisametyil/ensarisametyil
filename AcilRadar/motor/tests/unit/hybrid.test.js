'use strict';
/* Hibrit yöntem seçimi (core/hybrid.js + index.toContract): hangi çıktı hangi yöntemden gelir. */
const { test, assert } = require('../lib/harness.js');
const hybrid = require('../../core/hybrid.js');
const quality = require('../../core/quality.js');
const engine = require('../../core/index.js');
const config = require('../../core/config.js');
const F = require('../lib/fixtures.js');

const FAST = { nowMs: F.NOW, maxRuns: 200, minRuns: 200 };
const DAY = 86400000;
// Küçük kuyruk: gözlenen doluluk = (6 yeşil + 2 sarı + 0 kırmızı + 3 muayenede + 1 yatış) ÷ 30 = %40
const CALM = { greenWaiting: 6, yellowWaiting: 2, inService: 3, boarding: 1, bedCapacity: 30 };

test('hibrit: yöntem seçimi — ≤ +60 dk süreklilik, sonrası mevsimsel', function () {
  [0, 30, 60].forEach(function (m) { assert.equal(hybrid.occupancyMethod(m), 'persistence', String(m)); });
  [61, 120, 180, 240].forEach(function (m) { assert.equal(hybrid.occupancyMethod(m), 'seasonal', String(m)); });
});

test('hibrit: mevsimsel ortalama — aynı saat-gün dilimi, gelecek ve eski kayıt hariç, en az örnek', function () {
  const target = F.NOW + 120 * F.MIN;     // Salı 16:00
  const week = 7 * DAY;
  const hist = [{ ms: target - week, percent: 40 }, { ms: target - 2 * week, percent: 60 },
    { ms: target - week + DAY, percent: 99 },                 // başka gün (Çarşamba 16:00)
    { ms: target - week + 30 * F.MIN, percent: 99 },          // aynı gün, başka yarım saat
    { ms: target - 13 * week, percent: 99 },                  // 12 haftadan eski
    { ms: F.NOW + week, percent: 99 }];                       // gelecek
  const s = hybrid.seasonalMean(hist, target, F.NOW);
  assert.equal(s.percent, 50); assert.equal(s.samples, 2);
  assert.equal(hybrid.seasonalMean(hist.slice(0, 1), target, F.NOW), null, 'tek örnek yetmez (≥ 2)');
  assert.equal(hybrid.seasonalMean(hist.slice(0, 1), target, F.NOW, 1).percent, 40, 'eşik parametreyle gevşetilebilir (geriye dönük test)');
  assert.equal(hybrid.seasonalMean(null, target, F.NOW), null);
});

test('hibrit: doluluk — şimdi ve +60 dk bildirilen doluluk; 2 saat ve akşam geçmiş ortalama', function () {
  const hist = F.occupancyHistory(3, 70);     // her dilimde %70
  const r = engine.computeHospital(F.input(Object.assign({ occupancyHistory: hist }, CALM)), FAST);
  assert.deepEqual(engine.methodsFor(r, 'now').occupancy, 'persistence');
  assert.equal(engine.toContract(r, 'now').occupancyPercent, 40, 'şimdi = bildirilen doluluk');
  assert.deepEqual(engine.methodsFor(r, '2h').occupancy, 'seasonal');
  assert.equal(engine.toContract(r, '2h').occupancyPercent, 70);
  assert.equal(engine.methodsFor(r, 'evening').occupancy, 'seasonal');
  assert.equal(engine.toContract(r, 'evening').occupancyPercent, 70);
  assert.equal(r.hybrid.occupancy['30'].method, 'persistence');
  assert.equal(r.hybrid.occupancy['60'].percent, r.hybrid.occupancy['0'].percent, '+30/+60 aynen kalır');
});

test('hibrit: akşam — ufuk 60 dk\'dan kısa olsa da mevsimsel (19:30\'da sorulunca)', function () {
  const now = Date.parse('2026-10-13T19:30:00+03:00');
  const r = engine.computeHospital(F.input(Object.assign({ updatedAtMs: now - 3 * F.MIN, occupancyHistory: F.occupancyHistory(3, 66, now) }, CALM)), { nowMs: now, maxRuns: 150, minRuns: 150, explain: false });
  assert.equal(engine.methodsFor(r, 'evening').occupancy, 'seasonal');
  assert.equal(engine.toContract(r, 'evening').occupancyPercent, 66);
});

test('hibrit: geçmiş yoksa — 2 saat süreklilik + occupancyHistory varsayıldı; akşam sayı üretilmez', function () {
  const r = engine.computeHospital(F.input(CALM), Object.assign({ explain: false }, FAST));
  const c2 = engine.toContract(r, '2h');
  assert.equal(c2.occupancyPercent, 40);
  assert.ok(c2.assumedFields.indexOf('occupancyHistory') !== -1);
  assert.equal(engine.toContract(r, 'evening'), null);
  assert.ok(!('assumedFields' in engine.toContract(r, 'now')) || engine.toContract(r, 'now').assumedFields.indexOf('occupancyHistory') === -1, '"şimdi" geçmişe ihtiyaç duymaz');
});

test('hibrit: bekleme — "şimdi" motor (aralık, ≥ 5 dk), ileri ufuk bugünkü formül', function () {
  const hist = F.occupancyHistory(3, 50);
  const inp = F.input(Object.assign({ occupancyHistory: hist }, { greenWaiting: 30, yellowWaiting: 4, activePhysicians: 6, inService: 5, boarding: 1, bedCapacity: 40 }));
  const r = engine.computeHospital(inp, FAST);
  assert.deepEqual(engine.methodsFor(r, 'now'), { occupancy: 'persistence', greenWait: 'engine', yellowWait: 'engine' });
  assert.deepEqual(engine.methodsFor(r, '2h'), { occupancy: 'seasonal', greenWait: 'formula', yellowWait: 'formula' });
  const f = hybrid.formulaWait(30, 6);      // 30 ÷ 6 × 9 = 45 → [45, 63]
  assert.deepEqual(engine.toContract(r, '2h').estimatedGreenWaitMinutes, [Math.round(f.green[0]), Math.round(f.green[1])]);
  assert.deepEqual(engine.toContract(r, '2h').estimatedYellowWaitMinutes, [5, 20]);
  const now = engine.toContract(r, 'now');
  assert.ok(now.estimatedGreenWaitMinutes[1] - now.estimatedGreenWaitMinutes[0] >= 5);
});

test('hibrit: güven ve etkenler YALNIZ "şimdi" diliminde, bekleme için; doluluk aralığı yok', function () {
  const r = engine.computeHospital(F.input(Object.assign({ occupancyHistory: F.occupancyHistory(3, 60), greenWaiting: 40, boarding: 5 })), FAST);
  const now = engine.toContract(r, 'now');
  assert.ok(['low', 'medium', 'high'].indexOf(now.confidence) !== -1);
  assert.ok(now.factors.length >= 1 && now.factors.length <= 3);
  now.factors.forEach(function (f) {
    assert.equal(f.target, 'greenWait', 'etken bekleme içindir');
    assert.ok(/bekleme yaklaşık [+−]\d+ dk\.$|beklemeyi yaklaşık −\d+ dk etkiliyor\.$|bekleme için yaklaşık −\d+ dk\.$/.test(f.text), f.text);
  });
  ['2h', 'evening'].forEach(function (slot) {
    const c = engine.toContract(r, slot);
    ['confidence', 'factors', 'occupancyRange', 'overCapacityShare'].forEach(function (k) { assert.ok(!(k in c), slot + ' diliminde ' + k + ' olmamalı'); });
  });
  ['occupancyRange', 'overCapacityShare'].forEach(function (k) { assert.ok(!(k in now), k); });
});

test('hibrit: modelVersion ve dataSource çıktıya doğru yansır; örnek veri işaretlenir', function () {
  ['simulated', 'hospital', 'official'].forEach(function (src) {
    const r = engine.computeHospital(F.input(Object.assign({ dataSource: src, occupancyHistory: F.occupancyHistory(3, 50) })), Object.assign({ explain: false }, FAST));
    ['now', '2h', 'evening'].forEach(function (slot) {
      const c = engine.toContract(r, slot);
      assert.equal(c.dataSource, src, slot);
      assert.equal(c.modelVersion, config.MODEL_VERSION);
      assert.equal(c.simulated === true, src === 'simulated');
      assert.equal(c.isForecast, slot !== 'now' || src === 'simulated');
    });
  });
  assert.ok(/^\d+\.\d+\.\d+$/.test(config.MODEL_VERSION));
});

test('hibrit: ileri ufukta hekim sayısı vardiya çizelgesinden; kuyruk sayıları bildirilen güncel değer', function () {
  const schedule = [{ from: 0, to: 960, count: 6 }, { from: 960, to: 1440, count: 3 }];   // 16:00'dan sonra 3 hekim
  const r = engine.computeHospital(F.input(Object.assign({ occupancyHistory: F.occupancyHistory(3, 50), physicianSchedule: schedule, activePhysicians: 6 })), Object.assign({ explain: false }, FAST));
  assert.equal(engine.toContract(r, 'now').activePhysicians, 6);
  assert.equal(engine.toContract(r, '2h').activePhysicians, 3, '16:00 vardiyası');
  assert.equal(engine.toContract(r, '2h').greenWaiting, 20, 'bildirilen güncel sayı');
});

test('hibrit: kuyruk bilgisi yoksa (mevsimsel basamak) motor çıktısı; güven ve etken yazılmaz', function () {
  const r = engine.computeHospital(F.input({ greenWaiting: undefined, yellowWaiting: undefined, occupancyHistory: F.occupancyHistory(3, 50) }), Object.assign({ explain: false }, FAST));
  assert.equal(r.tier, 'seasonal');
  assert.deepEqual(engine.methodsFor(r, 'now'), { occupancy: 'engine', greenWait: 'engine', yellowWait: 'engine' });
  const c = engine.toContract(r, 'now');
  assert.ok(!('confidence' in c) && !('factors' in c));
});

test('kalite: geçmiş doluluk gözlemleri temizlenir (gelecek, NaN, negatif atılır; aşırı değer sınırlanır)', function () {
  const a = quality.assess(F.input({ occupancyHistory: [{ ms: F.NOW - DAY, percent: 50 }, { ms: F.NOW + DAY, percent: 50 }, { ms: 'x', percent: 5 }, { ms: F.NOW - 2 * DAY, percent: -1 }, { ms: F.NOW - 3 * DAY, percent: 1e9 }, null] }), F.NOW);
  assert.equal(a.record.occupancyHistory.length, 2);   // geçerli: −1 gün (50) ve −3 gün (sınırlanmış)
  assert.equal(a.record.occupancyHistory[1].percent, config.LIMITS.OCCUPANCY_PERCENT_MAX);
  assert.ok(a.warnings.some(function (w) { return w.code === 'OCCUPANCY_HISTORY_ROWS_DROPPED' && w.count === 4; }));
  assert.deepEqual(quality.assess(F.input({ occupancyHistory: 'x' }), F.NOW).record.occupancyHistory, []);
});

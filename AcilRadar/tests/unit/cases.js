/* =============================================================================
 * tests/unit/cases.js
 * NE İŞE YARAR : Birim test vakaları. Aynı dosya hem Node'da (tests/run-unit.js)
 *                hem tarayıcıda (tests/unit.html) çalışır. dom:true olan vakalar
 *                yalnız tarayıcıda koşar.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: yeni vaka → CASES.push({ name, run })
 * ========================================================================== */
(function (root) {
  'use strict';

  const CASES = [];
  function test(name, run, options) {
    CASES.push({ name: name, run: run, dom: Boolean(options && options.dom) });
  }

  const T = Date.parse('2026-10-12T22:00:00+03:00');
  const MIN = 60000;
  const ORIGIN = { lat: 40.8028, lng: 29.4307 };

  function timing(over) {
    return Object.assign({ generatedAtMs: T, receivedAtMs: T }, over || {});
  }

  function hospital(over) {
    return Object.assign({
      id: 'h1', name: 'Örnek Devlet Hastanesi A', district: 'Gebze', lat: 40.80, lng: 29.43, childER: false,
      occupancyPercent: 50, crowdingLevel: 'medium', nonUrgentWaiting: 10, urgentWaiting: 2, activePhysicians: 4,
      nonUrgentWaitMinutes: [20, 30], urgentWaitMinutes: [5, 10], updatedAtMs: T - 5 * MIN, isForecast: false, dataSource: 'simulated', ownership: 'public'
    }, over || {});
  }

  function raw(over) {
    return Object.assign({
      hospitalId: 'h1', name: 'Örnek Devlet Hastanesi A', district: 'Gebze', lat: 40.8, lng: 29.43, childER: true,
      occupancyPercent: 62, crowdingLevel: 'medium', greenWaiting: 34, yellowWaiting: 9, activePhysicians: 6,
      estimatedGreenWaitMinutes: [58, 82], estimatedYellowWaitMinutes: [7, 15],
      updatedAt: '2026-10-12T21:55:00+03:00', isForecast: false, dataSource: 'simulated', ownership: 'public'
    }, over || {});
  }

  function envelope(hospitals, over) {
    return Object.assign({ schemaVersion: '1.0', generatedAt: '2026-10-12T22:00:00+03:00', region: 'gebze', notice: null, hospitals: hospitals }, over || {});
  }

  function expectCode(assert, fn, code) {
    try {
      fn();
    } catch (error) {
      assert.equal(error.code, code, 'hata kodu');
      return;
    }
    assert.ok(false, code + ' hatası bekleniyordu');
  }

  /* ---- Calc --------------------------------------------------------------- */

  test('Calc: haversine Gebze–Darıca ≈ 5,9 km; aynı nokta 0', function (AR, assert) {
    const km = AR.Calc.haversineKm({ lat: 40.8028, lng: 29.4307 }, { lat: 40.7694, lng: 29.3753 });
    assert.ok(km > 5.5 && km < 6.3, 'gelen ' + km);
    assert.equal(AR.Calc.haversineKm(ORIGIN, ORIGIN), 0);
  });

  test('Calc: yol süresi aralığı, en az süre ve trafik payı', function (AR, assert) {
    const tr = { ROAD_FACTOR: 1, AVERAGE_SPEED_KMH: 35, TRAFFIC_FACTOR_MAX: 1.5, MIN_TRAVEL_MINUTES: 2 };
    assert.deepEqual(AR.Calc.estimateTravelMinutes(35, tr), [60, 90]);
    assert.deepEqual(AR.Calc.estimateTravelMinutes(0, tr), [2, 3]);
  });

  test('Calc: aralık toplama (alt+alt, üst+üst)', function (AR, assert) {
    assert.deepEqual(AR.Calc.addRanges([1, 2], [3, 4], [10, 20]), [14, 26]);
  });

  test('Calc: toplam = yol + kayıt + bekleme; daima aralık', function (AR, assert) {
    const row = AR.Calc.buildRow(hospital(), ORIGIN, timing(), T, AR.Config);
    assert.deepEqual(row.totalMinutes, AR.Calc.addRanges(row.travelMinutes, AR.Config.REGISTRATION_MINUTES, [20, 30]));
    assert.ok(row.totalMinutes[0] <= row.totalMinutes[1]);
  });

  test('Calc: eşik sınırı — 30 dk güncel, 31 dk eski (sayısal tahmin gizlenir)', function (AR, assert) {
    const fresh = AR.Calc.buildRow(hospital({ updatedAtMs: T - 30 * MIN }), ORIGIN, timing(), T, AR.Config);
    const old = AR.Calc.buildRow(hospital({ updatedAtMs: T - 31 * MIN }), ORIGIN, timing(), T, AR.Config);
    assert.ok(!fresh.isStale);
    assert.ok(old.isStale);
    assert.equal(old.totalMinutes, null);
    assert.equal(old.waitMinutes, null);
    assert.equal(old.staleReason, 'age');
  });

  test('Calc: yaş SUNUCU saatiyle hesaplanır (cihaz saati yıllarca yanlış olsa da)', function (AR, assert) {
    const wrongBrowserClock = Date.parse('2035-01-01T00:00:00Z');
    const tm = timing({ receivedAtMs: wrongBrowserClock });
    const row = AR.Calc.buildRow(hospital({ updatedAtMs: T - 10 * MIN }), ORIGIN, tm, wrongBrowserClock + 5 * MIN, AR.Config);
    assert.ok(!row.isStale, 'eski sayılmamalı');
    assert.ok(Math.abs(row.ageMinutes - 15) < 0.001, 'yaş 15 dk olmalı: ' + row.ageMinutes);
  });

  test('Calc: gelecekteki tarih (tolerans dışı) güvenilmez sayılır', function (AR, assert) {
    const within = AR.Calc.buildRow(hospital({ updatedAtMs: T + 3 * MIN }), ORIGIN, timing(), T, AR.Config);
    const beyond = AR.Calc.buildRow(hospital({ updatedAtMs: T + 60 * MIN }), ORIGIN, timing(), T, AR.Config);
    assert.ok(!within.isStale);
    assert.equal(within.ageMinutes, 0);
    assert.ok(beyond.isStale);
    assert.equal(beyond.staleReason, 'future');
  });

  test('Calc: Türkçe arama sadeleştirme', function (AR, assert) {
    assert.equal(AR.Calc.normalizeForSearch('  ÇAYIROVA  Şube '), 'cayirova sube');
    assert.equal(AR.Calc.normalizeForSearch('İSTANBUL'), 'istanbul');
    assert.equal(AR.Calc.normalizeForSearch('ığüşöç'), 'igusoc');
  });

  function rows(AR) {
    return AR.Calc.buildRows([
      hospital({ id: 'a', name: 'Örnek A', district: 'Çayırova', lat: 40.83, lng: 29.37, crowdingLevel: 'high', occupancyPercent: 90, nonUrgentWaitMinutes: [80, 100] }),
      hospital({ id: 'b', name: 'Örnek B', childER: true, crowdingLevel: 'low', occupancyPercent: 30, nonUrgentWaitMinutes: [10, 15] }),
      hospital({ id: 'c', name: 'Örnek C', updatedAtMs: T - 120 * MIN }),
      hospital({ id: 'd', name: 'Örnek D', lat: 40.95, lng: 29.60, occupancyPercent: 60, nonUrgentWaitMinutes: [10, 15] })
    ], ORIGIN, timing(), T, AR.Config);
  }

  function ids(list) {
    return list.map(function (r) { return r.id; });
  }

  test('Calc: filtre — arama (aksansız), çocuk acili, yoğunluk (eski hariç)', function (AR, assert) {
    const base = { query: '', childOnly: false, levels: new Set() };
    assert.deepEqual(ids(AR.Calc.filterRows(rows(AR), Object.assign({}, base, { query: 'cayirova' }))), ['a']);
    assert.deepEqual(ids(AR.Calc.filterRows(rows(AR), Object.assign({}, base, { childOnly: true }))), ['b']);
    assert.deepEqual(ids(AR.Calc.filterRows(rows(AR), Object.assign({}, base, { levels: new Set(['medium']) }))), ['d']);
    assert.ok(!AR.Calc.hasActiveFilters(base));
  });

  test('Calc: sıralama — toplam süre, eski en sonda, girdi değişmez', function (AR, assert) {
    const list = rows(AR);
    const before = ids(list);
    const sorted = ids(AR.Calc.sortRows(list, 'total'));
    assert.equal(sorted[0], 'b');
    assert.equal(sorted[sorted.length - 1], 'c');
    assert.deepEqual(ids(list), before);
  });

  test('Calc: sıralama — en az yoğun ve en yakın', function (AR, assert) {
    assert.deepEqual(ids(AR.Calc.sortRows(rows(AR), 'crowding')), ['b', 'd', 'a', 'c']);
    const byDistance = AR.Calc.sortRows(rows(AR), 'distance');
    for (let i = 1; i < byDistance.length; i += 1) assert.ok(byDistance[i - 1].distanceKm <= byDistance[i].distanceKm);
  });

  test('Calc: aynı adlı hastaneler kararlı sıralanır (kimliğe göre)', function (AR, assert) {
    const same = AR.Calc.buildRows([hospital({ id: 'z' }), hospital({ id: 'a' })], ORIGIN, timing(), T, AR.Config);
    assert.deepEqual(ids(AR.Calc.sortRows(same, 'total')), ['a', 'z']);
  });

  test('Calc: en kısa süre seçimi eskiyi seçmez; hiç güncel yoksa null', function (AR, assert) {
    assert.equal(AR.Calc.pickShortest(rows(AR)).id, 'b');
    assert.equal(AR.Calc.pickShortest(rows(AR).filter(function (r) { return r.isStale; })), null);
    assert.equal(AR.Calc.pickShortest([]), null);
  });

  test('Calc: özet (sayı, en az yoğun güncel, en yakın)', function (AR, assert) {
    const s = AR.Calc.summarize(rows(AR));
    assert.equal(s.count, 4);
    assert.equal(s.leastCrowded.id, 'b');
    assert.equal(AR.Calc.summarize([]).nearest, null);
  });

  test('Calc: yol tarifi bağlantısı yalnız hedefi içerir', function (AR, assert) {
    const url = AR.Calc.buildDirectionsUrl(AR.Config.DIRECTIONS_URL_TEMPLATE, 40.8, 29.4);
    assert.ok(url.indexOf('destination=40.8,29.4') !== -1, url);
    assert.ok(url.indexOf('origin') === -1);
  });

  test('Calc: Akşam 20:00 — 19:59 açık, 20:00 ve 23:59 geçti, gece yarısından sonra yeniden açık', function (AR, assert) {
    const evening = AR.Config.TIME_SLOTS.find(function (s) { return s.id === 'evening'; });
    const minuteAt = function (iso) { return AR.Calc.minutesOfDay(Date.parse(iso), AR.Config.TIME_ZONE); };
    assert.ok(!AR.Calc.isSlotPassed(evening, minuteAt('2026-10-12T19:59:00+03:00')));
    assert.ok(AR.Calc.isSlotPassed(evening, minuteAt('2026-10-12T20:00:00+03:00')));
    assert.ok(AR.Calc.isSlotPassed(evening, minuteAt('2026-10-12T23:59:00+03:00')));
    assert.ok(!AR.Calc.isSlotPassed(evening, minuteAt('2026-10-13T00:00:00+03:00')));
    assert.ok(!AR.Calc.isSlotPassed({ id: 'now' }, 1439));
  });

  /* ---- Schema ------------------------------------------------------------- */

  test('Schema: geçerli yanıt iç modele çevrilir (alan adları eşlenir)', function (AR, assert) {
    const r = AR.Schema.normalizeResponse(envelope([raw()]), T);
    const h = r.hospitals[0];
    assert.equal(h.id, 'h1');
    assert.deepEqual(h.nonUrgentWaitMinutes, [58, 82]);
    assert.deepEqual(h.urgentWaitMinutes, [7, 15]);
    assert.equal(h.nonUrgentWaiting, 34);
    assert.equal(r.dataSource, 'simulated');
    assert.ok(r.isSimulated);
    assert.ok(r.serverClock);
    assert.equal(r.generatedAtMs, T);
  });

  test('Schema: küçük sürüm (1.7) ve bilinmeyen alanlar sessizce kabul', function (AR, assert) {
    const r = AR.Schema.normalizeResponse(envelope([raw({ newField: 1 })], { schemaVersion: '1.7', extra: { a: 1 } }), T);
    assert.equal(r.hospitals.length, 1);
    assert.ok(!('newField' in r.hospitals[0]));
  });

  test('Schema: ana sürüm uyuşmazlığı (2.0) → UNSUPPORTED_SCHEMA', function (AR, assert) {
    expectCode(assert, function () { AR.Schema.normalizeResponse(envelope([raw()], { schemaVersion: '2.0' }), T); }, 'UNSUPPORTED_SCHEMA');
  });

  test('Schema: schemaVersion yoksa 1.0 varsayılır', function (AR, assert) {
    const body = envelope([raw()]);
    delete body.schemaVersion;
    assert.equal(AR.Schema.normalizeResponse(body, T).schemaVersion, '1.0');
  });

  test('Schema: nesne olmayan / hospitals olmayan yanıt → INVALID_RESPONSE', function (AR, assert) {
    [null, [], 'metin', 42, { schemaVersion: '1.0' }, { schemaVersion: '1.0', hospitals: {} }].forEach(function (bad) {
      expectCode(assert, function () { AR.Schema.normalizeResponse(bad, T); }, 'INVALID_RESPONSE');
    });
  });

  test('Schema: boş liste geçerlidir', function (AR, assert) {
    const r = AR.Schema.normalizeResponse(envelope([]), T);
    assert.equal(r.hospitals.length, 0);
    assert.equal(r.dataSource, 'none');
  });

  test('Schema: tek bozuk kayıt sayfayı düşürmez, yalnız o kayıt atlanır', function (AR, assert) {
    const missingLat = raw({ hospitalId: 'x' });
    delete missingLat.lat;
    const r = AR.Schema.normalizeResponse(envelope([missingLat, raw({ hospitalId: 'ok' })]), T);
    assert.deepEqual(r.hospitals.map(function (h) { return h.id; }), ['ok']);
    assert.equal(r.skippedCount, 1);
  });

  test('Schema: tüm kayıtlar bozuksa INVALID_RESPONSE', function (AR, assert) {
    expectCode(assert, function () { AR.Schema.normalizeResponse(envelope([{ name: 'eksik' }, null]), T); }, 'INVALID_RESPONSE');
  });

  test('Schema: güvenli tür dönüşümü ve sınırlar', function (AR, assert) {
    const r = AR.Schema.normalizeResponse(envelope([
      raw({ hospitalId: 'a', occupancyPercent: '62', lat: '40.8' }),
      raw({ hospitalId: 'b', occupancyPercent: 135, greenWaiting: -5, activePhysicians: 1e9 }),
      raw({ hospitalId: 'c', occupancyPercent: 'yüksek' }),
      raw({ hospitalId: 'd', estimatedGreenWaitMinutes: [40, 10] }),
      raw({ hospitalId: 'e', estimatedGreenWaitMinutes: [10, 99999] }),
      raw({ hospitalId: 'f', updatedAt: 'dün' }),
      raw({ hospitalId: 'g', crowdingLevel: 'critical' }),
      raw({ hospitalId: 'h', lat: 95 }),
      raw({ hospitalId: 'i', isForecast: 'evet' }),
      raw({ hospitalId: 'j', childER: undefined, greenWaiting: null })
    ]), T);
    const byId = {};
    r.hospitals.forEach(function (h) { byId[h.id] = h; });
    assert.deepEqual(Object.keys(byId).sort(), ['a', 'b', 'j']);
    assert.equal(byId.a.occupancyPercent, 62);
    assert.equal(byId.a.lat, 40.8);
    assert.equal(byId.b.occupancyPercent, 100);
    assert.equal(byId.b.nonUrgentWaiting, 0);
    assert.equal(byId.b.activePhysicians, AR.Config.LIMITS.MAX_COUNT);
    assert.equal(byId.j.childER, false);
    assert.equal(byId.j.nonUrgentWaiting, null);
  });

  test('Schema: yalnız devlet hastaneleri gösterilir; özel hastane uyarısız ayıklanır', function (AR, assert) {
    const r = AR.Schema.normalizeResponse(envelope([raw({ hospitalId: 'devlet' }), raw({ hospitalId: 'ozel', ownership: 'private' })]), T);
    assert.deepEqual(r.hospitals.map(function (h) { return h.id; }), ['devlet']);
    assert.equal(r.excludedCount, 1);
    assert.equal(r.skippedCount, 0);
    assert.equal(r.hospitals[0].ownership, 'public');
  });

  test('Schema: kurum türü (ownership) yoksa ya da bilinmiyorsa kayıt atlanır', function (AR, assert) {
    const missing = raw({ hospitalId: 'x' });
    delete missing.ownership;
    const r = AR.Schema.normalizeResponse(envelope([missing, raw({ hospitalId: 'y', ownership: 'vakif' }), raw({ hospitalId: 'ok' })]), T);
    assert.deepEqual(r.hospitals.map(function (h) { return h.id; }), ['ok']);
    assert.equal(r.skippedCount, 2);
  });

  test('Schema: yanıtta yalnız özel hastane varsa hata değil, boş liste', function (AR, assert) {
    const r = AR.Schema.normalizeResponse(envelope([raw({ ownership: 'private' })]), T);
    assert.equal(r.hospitals.length, 0);
    assert.equal(r.excludedCount, 1);
  });

  test('Mock: örnek hastanelerin hepsi devlet hastanesi', function (AR, assert) {
    const body = AR.Mock.build('normal', { at: 'now', region: 'gebze' }, T).body;
    assert.ok(body.hospitals.every(function (h) { return h.ownership === 'public' && h.name.indexOf('Örnek Devlet Hastanesi') === 0; }));
  });

  test('Schema: yinelenen kimlik atlanır; aynı ad farklı kimlik kalır', function (AR, assert) {
    const r = AR.Schema.normalizeResponse(envelope([raw({ hospitalId: 'a' }), raw({ hospitalId: 'a' }), raw({ hospitalId: 'b' })]), T);
    assert.deepEqual(r.hospitals.map(function (h) { return h.id; }), ['a', 'b']);
  });

  test('Schema: çok uzun ad kısaltılır (160), boşluklar sadeleşir', function (AR, assert) {
    const r = AR.Schema.normalizeResponse(envelope([raw({ name: '  Örnek   ' + 'A'.repeat(300) })]), T);
    assert.equal(r.hospitals[0].name.length, AR.Config.LIMITS.MAX_TEXT_LENGTH);
    assert.ok(r.hospitals[0].name.indexOf('Örnek A') === 0);
  });

  test('Schema: üst sınırdan fazla kayıt kırpılır', function (AR, assert) {
    const list = [];
    for (let i = 0; i < 600; i += 1) list.push(raw({ hospitalId: 'k' + i }));
    assert.equal(AR.Schema.normalizeResponse(envelope(list), T).hospitals.length, AR.Config.LIMITS.MAX_HOSPITALS);
  });

  test('Schema: 0, 1, 2, 6, 50, 200 kayıt', function (AR, assert) {
    [0, 1, 2, 6, 50, 200].forEach(function (n) {
      const list = [];
      for (let i = 0; i < n; i += 1) list.push(raw({ hospitalId: 'n' + i }));
      assert.equal(AR.Schema.normalizeResponse(envelope(list), T).hospitals.length, n);
    });
  });

  test('Schema: generatedAt yoksa tarayıcı saati, duyuru doğrulanır', function (AR, assert) {
    const body = envelope([raw()], { notice: { level: 'warning', text: '  Bakım   çalışması ' } });
    delete body.generatedAt;
    const r = AR.Schema.normalizeResponse(body, T + 1000);
    assert.ok(!r.serverClock);
    assert.equal(r.generatedAtMs, T + 1000);
    assert.deepEqual(r.notice, { level: 'warning', text: 'Bakım çalışması' });
    assert.equal(AR.Schema.normalizeResponse(envelope([raw()], { notice: { level: 'alarm', text: 'x' } }), T).notice, null);
  });

  test('Schema: hata zarfı kodlara çevrilir; sunucu iletisi kullanılmaz', function (AR, assert) {
    const f = AR.Schema.normalizeErrorBody;
    assert.equal(f(429, { error: { code: 'RATE_LIMITED', message: '<b>x</b>' } }), 'RATE_LIMITED');
    assert.equal(f(500, { error: { code: 'BILINMEYEN', message: 'x' } }), 'INTERNAL');
    assert.equal(f(503, null), 'UNAVAILABLE');
    assert.equal(f(400, 'metin'), 'BAD_REQUEST');
    assert.equal(f(418, {}), 'UNKNOWN');
  });

  test('Mock: tüm başarılı senaryolar sözleşmeden geçer', function (AR, assert) {
    ['normal', 'empty', 'stale', 'broken', 'many', 'notice'].forEach(function (scenario) {
      const res = AR.Mock.build(scenario, { at: 'now', region: 'gebze' }, T);
      assert.equal(res.status, 200, scenario);
      const r = AR.Schema.normalizeResponse(JSON.parse(JSON.stringify(res.body)), T);
      assert.ok(Array.isArray(r.hospitals), scenario);
    });
    assert.equal(AR.Mock.build('normal', { at: 'yarin', region: null }, T).status, 400);
  });

  test('Mock: bozuk senaryoda beklenen kayıtlar kalır', function (AR, assert) {
    const r = AR.Schema.normalizeResponse(JSON.parse(JSON.stringify(AR.Mock.build('broken', { at: 'now', region: 'gebze' }, T).body)), T);
    const ids2 = r.hospitals.map(function (h) { return h.id; });
    assert.deepEqual(ids2, ['ornek-01', 'ornek-05', 'ornek-07', 'ornek-08', 'ornek-99']);
    assert.equal(r.hospitals[0].occupancyPercent, 100);
    assert.equal(r.hospitals[1].nonUrgentWaiting, 0);
  });

  /* ---- Strings ------------------------------------------------------------- */

  test('Strings: yer tutucu doldurma; eksik anahtar anahtarın kendisi', function (AR, assert) {
    assert.equal(AR.Strings.text('unit.minutesRange', { min: 10, max: 20 }), '10–20 dk.');
    assert.equal(AR.Strings.text('yok.boyle.bir.anahtar'), 'yok.boyle.bir.anahtar');
    AR.Strings.missingKeys.delete('yok.boyle.bir.anahtar');
  });

  test('Strings: tr-TR biçimleri', function (AR, assert) {
    const f = AR.Strings.format;
    assert.equal(f.km(3.42), '3,4 km');
    assert.equal(f.percent(62), '%62');
    assert.equal(f.minutesRange([15, 15]), '15 dk.');
    assert.equal(f.minutesRange([35, 50]), '35–50 dk.');
    assert.equal(f.number(1234), '1.234');
    assert.equal(f.ago(0.4), 'az önce');
    assert.equal(f.ago(5), '5 dakika önce');
    assert.equal(f.ago(120), '2 saat önce');
    assert.equal(f.clock(T), '22:00');
  });

  test('Strings: boş metin yok', function (AR, assert) {
    const empty = [];
    (function walk(node, prefix) {
      Object.keys(node).forEach(function (key) {
        const value = node[key];
        const p = prefix ? prefix + '.' + key : key;
        if (typeof value === 'string' && value.trim() === '') empty.push(p);
        else if (value && typeof value === 'object') walk(value, p);
      });
    })(AR.Strings.data, '');
    assert.deepEqual(empty, []);
  });

  test('Strings: config\'teki her seçeneğin ve hata kodunun etiketi var', function (AR, assert) {
    const cfg = AR.Config;
    const need = [];
    cfg.DISTRICTS.forEach(function (d) { need.push('districts.' + d.id); });
    cfg.TIME_SLOTS.forEach(function (s) { need.push('time.' + s.id); });
    cfg.SORT_KEYS.forEach(function (k) { need.push('sort.' + k); });
    cfg.CROWDING_LEVELS.concat(['stale']).forEach(function (l) { need.push('crowding.' + l); });
    cfg.DATA_SOURCES.forEach(function (s) { need.push('source.' + s); });
    ['simulated', 'hospital', 'official', 'mixed', 'none'].forEach(function (s) { need.push('info.source.' + s); });
    ['NETWORK', 'TIMEOUT', 'OFFLINE', 'RATE_LIMITED', 'BAD_REQUEST', 'UNAVAILABLE', 'INTERNAL', 'INVALID_RESPONSE', 'UNSUPPORTED_SCHEMA', 'UNKNOWN']
      .forEach(function (c) { need.push('errors.codes.' + c); });
    assert.deepEqual(need.filter(function (k) { return !AR.Strings.has(k); }), []);
  });

  test('Strings: yasak ifadeler ve yaş grubu ifadesi yok', function (AR, assert) {
    const all = JSON.stringify(AR.Strings.data).toLocaleLowerCase('tr-TR');
    ['canlı', 'anlık', 'gerçek zamanlı', 'en iyi', 'yaşlı', 'sponsorlu hastane', '!'].forEach(function (word) {
      assert.ok(all.indexOf(word) === -1, 'yasak ifade bulundu: ' + word);
    });
  });

  /* ---- Çizim (yalnız tarayıcı) ------------------------------------------------ */

  function ctx(AR) {
    return { expandedIds: new Set(), highlightedId: null, shortestId: null, mapAvailable: true,
      directionsTemplate: AR.Config.DIRECTIONS_URL_TEMPLATE, registrationMinutes: AR.Config.REGISTRATION_MINUTES, animate: false, maxAnimated: 8 };
  }

  function sandbox() {
    let box = document.getElementById('test-sandbox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'test-sandbox';
      box.className = 'visually-hidden';
      document.body.appendChild(box);
    }
    box.innerHTML = '';
    return box;
  }

  test('Çizim: sunucu metni HTML olarak yorumlanmaz (XSS)', function (AR, assert) {
    const evil = '<img src=x onerror="window.__xss=1"><script>window.__xss=1<\/script>';
    const r = AR.Schema.normalizeResponse(envelope([raw({ name: evil, district: '<b>ilçe</b>' })]), T);
    const list = document.createElement('ol');
    sandbox().appendChild(list);
    AR.UI.cards.renderList(list, AR.Calc.buildRows(r.hospitals, ORIGIN, r, T, AR.Config), ctx(AR));
    assert.equal(list.querySelectorAll('img, script, b').length, 0);
    assert.ok(list.textContent.indexOf('<img') !== -1);
    assert.ok(!window.__xss);
  }, { dom: true });

  test('Çizim: güncel kartta "Tahmini toplam süre" + aralık; eski kartta sayı yok', function (AR, assert) {
    const list = document.createElement('ol');
    sandbox().appendChild(list);
    const data = AR.Calc.buildRows([hospital(), hospital({ id: 'old', updatedAtMs: T - 999 * MIN })], ORIGIN, timing(), T, AR.Config);
    AR.UI.cards.renderList(list, data, ctx(AR));
    const cards = list.querySelectorAll('.card');
    assert.ok(cards[0].querySelector('.total__value').textContent.indexOf('–') !== -1);
    assert.ok(cards[0].textContent.indexOf(AR.Strings.text('card.totalLabel')) !== -1);
    assert.ok(cards[0].querySelector('.badge .icon') && cards[0].querySelector('.badge span').textContent.length > 0);
    assert.equal(cards[1].querySelectorAll('.total, .ring, .tiles').length, 0);
    assert.ok(cards[1].textContent.indexOf(AR.Strings.text('card.staleTitle')) !== -1);
  }, { dom: true });

  test('Çizim: hata kutusu sunucu iletisini değil, Türkçe kod metnini gösterir', function (AR, assert) {
    const box = sandbox();
    AR.UI.states.renderError(box, 'RATE_LIMITED', false, function () {});
    assert.ok(box.textContent.indexOf(AR.Strings.text('errors.codes.RATE_LIMITED')) !== -1);
    AR.UI.states.renderError(box, 'BILINMEYEN', false, function () {});
    assert.ok(box.textContent.indexOf(AR.Strings.text('errors.codes.UNKNOWN')) !== -1);
  }, { dom: true });

  test('Çizim: tüm durumlar çizildikten sonra eksik metin anahtarı yok', function (AR, assert) {
    const box = sandbox();
    AR.UI.states.renderEmpty(box, 'noData', null);
    AR.UI.states.renderEmpty(box, 'noMatch', function () {});
    const r = AR.Schema.normalizeResponse(JSON.parse(JSON.stringify(AR.Mock.build('broken', { at: '2h', region: 'gebze' }, T).body)), T);
    const list = document.createElement('ol');
    box.appendChild(list);
    const data = AR.Calc.buildRows(r.hospitals, ORIGIN, r, T, AR.Config);
    AR.UI.cards.renderList(list, data, Object.assign(ctx(AR), { expandedIds: new Set(data.map(function (d) { return d.id; })) }));
    assert.deepEqual(Array.from(AR.Strings.missingKeys), []);
  }, { dom: true });

  root.AcilRadarTests = CASES;
})(typeof window !== 'undefined' ? window : this);

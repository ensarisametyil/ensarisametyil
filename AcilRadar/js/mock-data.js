/* =============================================================================
 * js/mock-data.js
 * NE İŞE YARAR : Arka uç hazır olana kadar SÖZLEŞMEYE BİREBİR UYAN örnek yanıtlar
 *                üretir. Hem tarayıcıdaki 'mock' ortamı hem tools/mock-server.js
 *                bu dosyayı kullanır (tek kaynak). Hastaneler gerçek DEĞİLDİR.
 * VERDİĞİ      : AcilRadar.Mock → build(scenario, query, nowMs), respond(query, signal),
 *                SCENARIOS
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Örnek hastaneler: SAMPLES
 *   - Senaryolar (boş, eski, bozuk, 429 …): SCENARIOS
 * NOT: ENVIRONMENT 'mock' değilse tarayıcı bu dosyadaki respond()'u hiç çağırmaz.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.Config;
  const MS_PER_MINUTE = 60000;
  const TURKEY_UTC_OFFSET_MINUTES = 180;   // Türkiye 2016'dan beri sabit UTC+3
  const SCHEMA_VERSION = '1.0';

  // Örnek hastaneler. regions: hangi ?region= değerlerinde listelenir.
  // baseLoad: 0–1 arası olağan doluluk; physicians: hekim sayısı.
  const SAMPLES = [
    { id: 'ornek-01', name: 'Örnek Hastane Gebze Merkez', district: 'Gebze', lat: 40.7968, lng: 29.4415, childER: true, baseLoad: 0.72, physicians: 8, regions: ['gebze', 'kocaeli'] },
    { id: 'ornek-02', name: 'Örnek Hastane Gebze Kuzey', district: 'Gebze', lat: 40.8231, lng: 29.4198, childER: false, baseLoad: 0.48, physicians: 5, regions: ['gebze', 'kocaeli'] },
    { id: 'ornek-03', name: 'Örnek Hastane Darıca Sahil', district: 'Darıca', lat: 40.7631, lng: 29.3862, childER: true, baseLoad: 0.61, physicians: 6, regions: ['gebze', 'kocaeli'] },
    { id: 'ornek-04', name: 'Örnek Hastane Çayırova', district: 'Çayırova', lat: 40.8322, lng: 29.3816, childER: false, baseLoad: 0.38, physicians: 4, regions: ['gebze', 'kocaeli'] },
    { id: 'ornek-05', name: 'Örnek Eğitim ve Araştırma Hastanesi Dilovası Ek Hizmet Binası Acil Servisi', district: 'Dilovası', lat: 40.7852, lng: 29.5361, childER: false, baseLoad: 0.30, physicians: 3, regions: ['gebze', 'kocaeli'] },
    { id: 'ornek-06', name: 'Örnek Hastane Körfez', district: 'Körfez', lat: 40.7712, lng: 29.7245, childER: true, baseLoad: 0.55, physicians: 6, regions: ['gebze', 'kocaeli'] },
    { id: 'ornek-07', name: 'Örnek Hastane Tuzla', district: 'Tuzla', lat: 40.8227, lng: 29.3113, childER: true, baseLoad: 0.86, physicians: 9, regions: ['gebze', 'istanbul-anadolu'] },
    { id: 'ornek-08', name: 'Örnek Hastane Pendik', district: 'Pendik', lat: 40.8851, lng: 29.2461, childER: false, baseLoad: 0.66, physicians: 7, regions: ['gebze', 'istanbul-anadolu'] }
  ];

  const SLOT_LOAD_FACTOR = { now: 1, '2h': 1.08, evening: 1.2 };
  const CROWDING_FROM = { medium: 50, high: 80 };
  const NOISE = 0.16;
  const NON_URGENT_PER_LOAD = 48;
  const URGENT_SHARE = 0.25;
  const MINUTES_PER_PATIENT = 9;
  const RANGE_SPREAD = 1.4;
  const URGENT_WAIT = [5, 20];
  const MAX_FRESH_AGE_MINUTES = 8;
  const STALE_EXTRA_MINUTES = 65;
  const MANY_COUNT = 200;
  const MANY_SPREAD_DEG = 0.12;
  const RETRY_AFTER_SECONDS = 30;
  const FUTURE_SAMPLE_MINUTES = 60;
  const HTTP = { OK: 200, BAD_REQUEST: 400, TOO_MANY: 429, INTERNAL: 500, UNAVAILABLE: 503 };

  /* ---- Yardımcılar -------------------------------------------------------- */

  /** Tekrarlanabilir rastgele sayı üreteci (mulberry32). */
  function seeded(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** ms → "2026-10-12T22:00:00+03:00" (sözleşmedeki ofsetli biçim) */
  function istanbulIso(ms) {
    return new Date(ms + TURKEY_UTC_OFFSET_MINUTES * MS_PER_MINUTE).toISOString().slice(0, 19) + '+03:00';
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function crowdingFor(percent) {
    if (percent >= CROWDING_FROM.high) return 'high';
    if (percent >= CROWDING_FROM.medium) return 'medium';
    return 'low';
  }

  /* ---- Kayıt üretimi ------------------------------------------------------ */

  function buildHospital(sample, index, at, nowMs, ageMinutes) {
    const random = seeded(Math.floor(nowMs / MS_PER_MINUTE) * 31 + index * 7919 + at.length);
    const load = clamp(sample.baseLoad * (SLOT_LOAD_FACTOR[at] || 1) + (random() - 0.5) * NOISE, 0.05, 1);
    const occupancy = Math.round(load * 100);
    const nonUrgent = Math.round(load * NON_URGENT_PER_LOAD);
    const waitLow = Math.round((nonUrgent / sample.physicians) * MINUTES_PER_PATIENT);
    const age = ageMinutes != null ? ageMinutes : Math.round(random() * MAX_FRESH_AGE_MINUTES);
    return {
      hospitalId: sample.id,
      name: sample.name,
      district: sample.district,
      lat: sample.lat,
      lng: sample.lng,
      childER: sample.childER,
      occupancyPercent: occupancy,
      crowdingLevel: crowdingFor(occupancy),
      greenWaiting: nonUrgent,
      yellowWaiting: Math.round(nonUrgent * URGENT_SHARE),
      activePhysicians: sample.physicians,
      estimatedGreenWaitMinutes: [waitLow, Math.round(waitLow * RANGE_SPREAD)],
      estimatedYellowWaitMinutes: URGENT_WAIT.slice(),
      updatedAt: istanbulIso(nowMs - age * MS_PER_MINUTE),
      isForecast: at !== 'now',
      dataSource: 'simulated'
    };
  }

  function samplesFor(region) {
    return region ? SAMPLES.filter(function (s) { return s.regions.indexOf(region) !== -1; }) : SAMPLES;
  }

  function envelope(query, nowMs, hospitals, notice) {
    return {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: istanbulIso(nowMs),
      region: query.region || null,
      notice: notice || null,
      hospitals: hospitals
    };
  }

  function ok(body) {
    return { status: HTTP.OK, headers: {}, body: body };
  }

  function fail(status, code, extraHeaders) {
    return { status: status, headers: extraHeaders || {}, body: { error: { code: code, message: 'Örnek hata yanıtı (' + code + ')' } } };
  }

  function normalList(query, nowMs, ageFn) {
    return samplesFor(query.region).map(function (sample, index) {
      return buildHospital(sample, index, query.at, nowMs, ageFn ? ageFn(index) : null);
    });
  }

  /** 200 hastanelik büyük liste (performans ve harita denemesi). */
  function manyList(query, nowMs) {
    const random = seeded(Math.floor(nowMs / MS_PER_MINUTE));
    const result = [];
    for (let i = 0; i < MANY_COUNT; i += 1) {
      const base = SAMPLES[i % SAMPLES.length];
      const sample = Object.assign({}, base, {
        id: 'ornek-' + String(i + 1).padStart(3, '0'),
        name: 'Örnek Hastane ' + String(i + 1).padStart(3, '0'),
        lat: base.lat + (random() - 0.5) * MANY_SPREAD_DEG,
        lng: base.lng + (random() - 0.5) * MANY_SPREAD_DEG
      });
      result.push(buildHospital(sample, i, query.at, nowMs, null));
    }
    return result;
  }

  /** Sözleşmeyi zorlayan bozuk kayıtlar: atlanmalı ya da sınırlanmalı, sayfa düşmemeli. */
  function brokenList(query, nowMs) {
    const list = normalList(query, nowMs);
    list[0].occupancyPercent = '135';                       // metin sayı + sınır dışı → 100
    list[0].futureField = { anything: true };               // bilinmeyen alan → yok sayılır
    delete list[1].lat;                                     // zorunlu alan yok → atlanır
    list[2].estimatedGreenWaitMinutes = [40, 10];           // en az > en çok → atlanır
    list[3].updatedAt = 'dün akşam';                        // geçersiz tarih → atlanır
    list[4].greenWaiting = -12;                             // negatif → 0
    list[5].crowdingLevel = 'critical';                     // bilinmeyen değer → atlanır
    list.push(Object.assign({}, list[6]));                  // yinelenen kimlik → atlanır
    list.push(null, 'metin', 42);                           // nesne olmayan kayıtlar → atlanır
    list.push(Object.assign({}, list[7], { hospitalId: 'ornek-99', updatedAt: istanbulIso(nowMs + FUTURE_SAMPLE_MINUTES * MS_PER_MINUTE) })); // gelecekteki tarih
    return list;
  }

  /* ---- Senaryolar --------------------------------------------------------- */

  const SCENARIOS = {
    normal: function (q, now) { return ok(envelope(q, now, normalList(q, now))); },
    empty: function (q, now) { return ok(envelope(q, now, [])); },
    stale: function (q, now) {
      return ok(envelope(q, now, normalList(q, now, function (i) { return i % 2 === 0 ? cfg.STALE_AFTER_MINUTES + STALE_EXTRA_MINUTES : null; })));
    },
    broken: function (q, now) { return ok(envelope(q, now, brokenList(q, now))); },
    many: function (q, now) { return ok(envelope(q, now, manyList(q, now))); },
    notice: function (q, now) {
      return ok(envelope(q, now, normalList(q, now), { level: 'warning', text: 'Örnek duyuru: Bir hastanenin acil servisinde bakım çalışması var.' }));
    },
    unsupported: function (q, now) { return ok(Object.assign(envelope(q, now, normalList(q, now)), { schemaVersion: '2.0' })); },
    error: function () { return fail(HTTP.INTERNAL, 'INTERNAL'); },
    unavailable: function () { return fail(HTTP.UNAVAILABLE, 'UNAVAILABLE'); },
    ratelimit: function () { return fail(HTTP.TOO_MANY, 'RATE_LIMITED', { 'Retry-After': String(RETRY_AFTER_SECONDS) }); }
  };

  function isValidQuery(query) {
    const slotOk = cfg.TIME_SLOTS.some(function (slot) { return slot.id === query.at; });
    const regionOk = query.region == null || cfg.REGIONS.indexOf(query.region) !== -1;
    return slotOk && regionOk;
  }

  /**
   * Sözleşmeye uygun yanıt üretir.
   * @param {string} scenario  SCENARIOS anahtarı (bilinmiyorsa 'normal')
   * @param {{at:string, region:?string}} query
   * @param {number} nowMs
   * @returns {{status:number, headers:Object, body:Object}}
   */
  function build(scenario, query, nowMs) {
    if (!isValidQuery(query)) return fail(HTTP.BAD_REQUEST, 'BAD_REQUEST');
    const handler = SCENARIOS[scenario] || SCENARIOS.normal;
    return handler(query, nowMs);
  }

  /** Tarayıcı: ?mock=senaryo (yalnız 'mock' ortamında) ya da config'teki senaryo. */
  function currentScenario() {
    const fromUrl = new URLSearchParams(window.location.search).get('mock');
    return fromUrl && SCENARIOS[fromUrl] ? fromUrl : cfg.MOCK.SCENARIO;
  }

  /** Ağ gecikmesini taklit eder; JSON'dan geçirerek gerçek yanıt gibi düz veri döndürür. */
  function respond(query, signal) {
    return new Promise(function (resolve) {
      const timer = setTimeout(function () {
        const res = build(currentScenario(), query, Date.now());
        resolve({ status: res.status, headers: res.headers, body: JSON.parse(JSON.stringify(res.body)) });
      }, cfg.MOCK.DELAY_MS);
      if (signal) signal.addEventListener('abort', function () { clearTimeout(timer); resolve({ status: 0, headers: {}, body: null }); }, { once: true });
    });
  }

  AR.Mock = Object.freeze({
    build: build,
    respond: respond,
    SCENARIOS: Object.keys(SCENARIOS),
    istanbulIso: istanbulIso
  });
})(window.AcilRadar = window.AcilRadar || {});

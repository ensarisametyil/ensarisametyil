/* =============================================================================
 * DOSYA ADI    : js/mock-data.js
 * NE İŞE YARAR : Arka uç hazır olana kadar SAHTE veri üretir. Üretilen JSON,
 *                gerçek arka ucun göndereceği biçimin AYNISIDIR (README'deki sözleşme).
 *                Hastaneler gerçek DEĞİLDİR; adlar "Örnek Hastane …" biçimindedir,
 *                koordinatlar ilçe merkezlerinin çevresine rastgele yakın noktalardır.
 * NEYİ ALIR    : AcilRadar.config (USE_MOCK, MOCK_DELAY_MS, MOCK_SCENARIO, eşikler).
 * NEYİ VERİR   : AcilRadar.mock → respond(timeSlot): Promise<sunucu JSON'u>
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Örnek hastane eklemek/çıkarmak: SAMPLE_HOSPITALS listesi.
 *   - Boş / hata / bozuk yanıt denemek: config.js › MOCK_SCENARIO ya da adrese ?mock=empty
 * NOT: Gerçek veriye geçince (USE_MOCK: false) bu dosya hiç kullanılmaz;
 *      isterseniz index.html'den kaldırabilirsiniz.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.config;

  // Sahte hastaneler. baseLoad: 0–1 arası "olağan doluluk", physicians: hekim sayısı.
  const SAMPLE_HOSPITALS = [
    { id: 'ornek-01', name: 'Örnek Hastane Gebze Merkez', district: 'Gebze', lat: 40.7968, lng: 29.4415, childER: true, baseLoad: 0.72, physicians: 8 },
    { id: 'ornek-02', name: 'Örnek Hastane Gebze Kuzey', district: 'Gebze', lat: 40.8231, lng: 29.4198, childER: false, baseLoad: 0.48, physicians: 5 },
    { id: 'ornek-03', name: 'Örnek Hastane Darıca Sahil', district: 'Darıca', lat: 40.7631, lng: 29.3862, childER: true, baseLoad: 0.61, physicians: 6 },
    { id: 'ornek-04', name: 'Örnek Hastane Çayırova', district: 'Çayırova', lat: 40.8322, lng: 29.3816, childER: false, baseLoad: 0.38, physicians: 4 },
    { id: 'ornek-05', name: 'Örnek Hastane Dilovası', district: 'Dilovası', lat: 40.7852, lng: 29.5361, childER: false, baseLoad: 0.30, physicians: 3 },
    { id: 'ornek-06', name: 'Örnek Hastane Körfez', district: 'Körfez', lat: 40.7712, lng: 29.7245, childER: true, baseLoad: 0.55, physicians: 6 },
    { id: 'ornek-07', name: 'Örnek Hastane Tuzla Merkez', district: 'Tuzla', lat: 40.8227, lng: 29.3113, childER: true, baseLoad: 0.83, physicians: 9 },
    { id: 'ornek-08', name: 'Örnek Hastane Pendik', district: 'Pendik', lat: 40.8851, lng: 29.2461, childER: false, baseLoad: 0.66, physicians: 7 }
  ];

  // "Veri güncel değil" durumunu göstermek için bu örneğin verisi bilerek eski üretilir.
  const STALE_SAMPLE_ID = 'ornek-06';
  const STALE_EXTRA_MINUTES = 65;

  // Zaman dilimine göre yoğunluk çarpanı (akşam daha kalabalık varsayılır).
  const SLOT_LOAD_FACTOR = { now: 1, '2h': 1.08, evening: 1.2 };

  // Doluluk yüzdesinden yoğunluk seviyesine geçiş eşikleri.
  const CROWDING_THRESHOLDS = { mediumFrom: 50, highFrom: 80 };

  const MS_PER_MINUTE = 60000;
  const MAX_FRESH_AGE_MINUTES = 8;
  const NOISE_SPREAD = 0.16;
  const GREEN_PATIENTS_PER_LOAD = 48;
  const YELLOW_SHARE = 0.25;
  const MINUTES_PER_GREEN_PATIENT = 9;
  const WAIT_RANGE_SPREAD = 1.4;
  const YELLOW_WAIT_RANGE = [5, 20];

  /** Basit, tekrarlanabilir rastgele sayı üreteci (mulberry32). */
  function seededRandom(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function crowdingFor(occupancy) {
    if (occupancy >= CROWDING_THRESHOLDS.highFrom) return 'high';
    if (occupancy >= CROWDING_THRESHOLDS.mediumFrom) return 'medium';
    return 'low';
  }

  /** Tek bir örnek hastane için sunucu biçiminde kayıt üretir. */
  function buildHospital(sample, index, timeSlot, nowMs) {
    // Dakikada bir değişen tohum: yenileyince sayılar biraz oynar.
    const random = seededRandom(Math.floor(nowMs / MS_PER_MINUTE) * 31 + index * 7919 + timeSlot.length);
    const load = clamp(sample.baseLoad * SLOT_LOAD_FACTOR[timeSlot] + (random() - 0.5) * NOISE_SPREAD, 0.05, 1);
    const occupancy = Math.round(load * 100);
    const greenWaiting = Math.round(load * GREEN_PATIENTS_PER_LOAD);
    const waitBase = Math.round((greenWaiting / sample.physicians) * MINUTES_PER_GREEN_PATIENT);
    const ageMinutes = sample.id === STALE_SAMPLE_ID
      ? cfg.STALE_AFTER_MINUTES + STALE_EXTRA_MINUTES
      : Math.round(random() * MAX_FRESH_AGE_MINUTES);
    return {
      hospitalId: sample.id,
      name: sample.name,
      district: sample.district,
      lat: sample.lat,
      lng: sample.lng,
      childER: sample.childER,
      occupancyPercent: occupancy,
      crowdingLevel: crowdingFor(occupancy),
      greenWaiting: greenWaiting,
      yellowWaiting: Math.round(greenWaiting * YELLOW_SHARE),
      activePhysicians: sample.physicians,
      estimatedGreenWaitMinutes: [waitBase, Math.round(waitBase * WAIT_RANGE_SPREAD)],
      estimatedYellowWaitMinutes: YELLOW_WAIT_RANGE.slice(),
      updatedAt: new Date(nowMs - ageMinutes * MS_PER_MINUTE).toISOString(),
      isForecast: timeSlot !== 'now',
      dataSource: 'simulated'
    };
  }

  function buildBody(timeSlot, nowMs) {
    return {
      meta: { generatedAt: new Date(nowMs).toISOString(), dataSource: 'simulated' },
      hospitals: SAMPLE_HOSPITALS.map(function (sample, index) {
        return buildHospital(sample, index, timeSlot, nowMs);
      })
    };
  }

  /** Adres çubuğundaki ?mock=... değeri (yalnızca sahte veri açıkken dikkate alınır). */
  function currentScenario() {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('mock');
      return fromUrl || cfg.MOCK_SCENARIO;
    } catch (error) {
      return cfg.MOCK_SCENARIO;
    }
  }

  // Senaryolar: her biri gerçek arka ucun verebileceği bir yanıtı taklit eder.
  const SCENARIOS = {
    normal: function (slot, now) { return buildBody(slot, now); },
    legacy: function (slot, now) { return { hospitals: buildBody(slot, now).hospitals }; },
    empty: function (slot, now) { return { meta: buildBody(slot, now).meta, hospitals: [] }; },
    invalid: function () { return { results: [] }; },
    error: function () { throw new Error('mock-error'); }
  };

  /**
   * Sunucu yanıtını taklit eder (MOCK_DELAY_MS gecikmeyle).
   * @param {string} timeSlot
   * @returns {Promise<Object>}
   */
  function respond(timeSlot) {
    const scenario = SCENARIOS[currentScenario()] || SCENARIOS.normal;
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          // JSON'a çevirip geri okuyoruz: gerçek ağ yanıtı gibi yalnızca düz veri kalsın.
          resolve(JSON.parse(JSON.stringify(scenario(timeSlot, Date.now()))));
        } catch (error) {
          reject(error);
        }
      }, cfg.MOCK_DELAY_MS);
    });
  }

  AR.mock = Object.freeze({
    respond: respond,
    buildBody: buildBody
  });
})(window.AcilRadar = window.AcilRadar || {});

/* =============================================================================
 * js/config.js
 * NE İŞE YARAR : Uygulamanın TÜM ayarları. Kodun başka hiçbir yerinde sihirli
 *                sayı ya da adres yoktur.
 * VERDİĞİ      : window.AcilRadar.Config (dondurulmuş nesne)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Gerçek arka uca bağlanmak ........ ENVIRONMENT (tek satır) ve ENVIRONMENTS
 *   - Zaman seçenekleri (?at=) ......... TIME_SLOTS  (etiket: strings.js › time)
 *   - İlçe eklemek ...................... DISTRICTS   (ad: strings.js › districts)
 *   - Bölge (?region=) .................. REGION_ID, REGIONS
 *   - "Veri güncel değil" eşiği ......... STALE_AFTER_MINUTES
 *   - Süre formülü katsayıları ......... TRAVEL, REGISTRATION_MINUTES
 * NOT: Bu dosyada kullanıcıya görünen metin yoktur. Node araçları
 *      (tools/mock-server.js, tests/) da bu dosyayı okur; tarayıcıya özgü
 *      bir şey eklemeyin.
 * ========================================================================== */
(function (AR) {
  'use strict';

  function deepFreeze(value) {
    Object.values(value).forEach(function (child) {
      if (child && typeof child === 'object') deepFreeze(child);
    });
    return Object.freeze(value);
  }

  AR.Config = deepFreeze({
    /* ---- 1. Ortam ve arka uç ---------------------------------------------- */

    // 'mock'        → tarayıcı içi örnek veri (js/mock-data.js), ağa çıkılmaz.
    // 'development' → tools/mock-server.js ya da yerel arka uç.
    // 'production'  → canlı arka uç.
    ENVIRONMENT: 'mock',

    // apiBaseUrl: '' ise sayfa hangi adresten sunuluyorsa API de oradadır (same-origin).
    ENVIRONMENTS: {
      mock: { apiBaseUrl: null },
      development: { apiBaseUrl: 'http://localhost:8787' },
      production: { apiBaseUrl: '' }
    },

    API_PATHS: {
      hospitals: '/api/v1/hospitals'
    },

    // Desteklenen sözleşme ana sürümü (docs/SOZLESME.md). Uyuşmazsa hata ekranı çıkar.
    SCHEMA_MAJOR_VERSION: 1,

    REQUEST: {
      TIMEOUT_MS: 8000,
      MAX_RETRIES: 2,              // yalnız ağ hatası, zaman aşımı ve 5xx için
      RETRY_BASE_DELAY_MS: 1000,   // üstel bekleme: 1 sn, 2 sn, …
      RETRY_MAX_DELAY_MS: 8000,
      MAX_RETRY_AFTER_SECONDS: 900 // 429 › Retry-After için üst sınır
    },

    // Otomatik yenileme. Sekme gizliyken ve çevrimdışıyken durur.
    AUTO_REFRESH_SECONDS: 60,

    // "5 dakika önce" yazıları, veri eskimesi ve saat dilimi denetimi bu aralıkla tazelenir.
    CLOCK_TICK_SECONDS: 30,

    /* ---- 2. Veri geçerliliği ve sınırlar (js/schema.js, js/calc.js) ------ */

    STALE_AFTER_MINUTES: 30,
    // updatedAt, generatedAt'tan bu kadar ileride ise kayıt güvenilmez sayılır.
    FUTURE_TOLERANCE_MINUTES: 5,

    LIMITS: {
      MAX_HOSPITALS: 500,
      MAX_COUNT: 9999,          // bekleyen kişi, hekim sayısı üst sınırı
      MAX_WAIT_MINUTES: 1440,   // tahmini bekleme üst sınırı (24 saat)
      MAX_TEXT_LENGTH: 160,     // ad / ilçe
      MAX_ID_LENGTH: 64,
      MAX_NOTICE_LENGTH: 300
    },

    CROWDING_LEVELS: ['low', 'medium', 'high'],
    DATA_SOURCES: ['simulated', 'hospital', 'official'],
    NOTICE_LEVELS: ['info', 'warning'],

    /* ---- 3. Zaman seçici (?at=) ------------------------------------------- */

    // Yeni seçenek: bir satır ekleyin + strings.js › time içine etiketini yazın.
    // atHour/atMinute: o saat geçtiyse seçenek "bugün için geçti" olur (yarına kaymaz).
    TIME_SLOTS: [
      { id: 'now' },
      { id: '2h' },
      { id: 'evening', atHour: 20, atMinute: 0 }
    ],
    DEFAULT_TIME_SLOT: 'now',
    // Saat hesapları ve gösterimi bu saat dilimine göre yapılır.
    TIME_ZONE: 'Europe/Istanbul',

    /* ---- 4. Bölge ve ilçeler ---------------------------------------------- */

    // İsteğe ?region= olarak eklenir. null yapılırsa parametre gönderilmez.
    REGION_ID: 'gebze',
    REGIONS: ['gebze', 'kocaeli', 'istanbul-anadolu'],

    // İlçe merkezleri (yaklaşık, mesafe hesabının başlangıç noktası).
    DISTRICTS: [
      { id: 'gebze', lat: 40.8028, lng: 29.4307 },
      { id: 'darica', lat: 40.7694, lng: 29.3753 },
      { id: 'cayirova', lat: 40.8264, lng: 29.3728 },
      { id: 'dilovasi', lat: 40.7797, lng: 29.5440 },
      { id: 'korfez', lat: 40.7769, lng: 29.7378 },
      { id: 'tuzla', lat: 40.8161, lng: 29.3006 },
      { id: 'pendik', lat: 40.8775, lng: 29.2350 }
    ],
    DEFAULT_DISTRICT_ID: 'gebze',

    GEOLOCATION: {
      TIMEOUT_MS: 10000,
      MAX_AGE_MS: 60000,
      HIGH_ACCURACY: false
    },

    /* ---- 5. Süre formülü (js/calc.js) -------------------------------------- */

    TRAVEL: {
      ROAD_FACTOR: 1.3,          // kuş uçuşu → yaklaşık yol mesafesi
      AVERAGE_SPEED_KMH: 35,     // şehir içi ortalama hız
      TRAFFIC_FACTOR_MAX: 1.4,   // üst sınır = alt sınır × bu çarpan
      MIN_TRAVEL_MINUTES: 2
    },
    REGISTRATION_MINUTES: [5, 10],

    /* ---- 6. Liste ve görünüm ---------------------------------------------- */

    SORT_KEYS: ['total', 'distance', 'crowding'],
    DEFAULT_SORT: 'total',

    TEXT_SIZES: ['small', 'normal', 'large'],
    DEFAULT_TEXT_SIZE: 'normal',

    SEARCH_DEBOUNCE_MS: 200,
    SKELETON_CARD_COUNT: 3,
    MAX_ANIMATED_CARDS: 8,

    /* ---- 7. Harita ---------------------------------------------------------- */

    MAP: {
      // Yerel kopya (vendor/). Sürüm: Leaflet 1.9.4 — özet değeri docs/GUVENLIK.md'de.
      LEAFLET_SCRIPT: 'vendor/leaflet/leaflet.js',
      LEAFLET_STYLE: 'vendor/leaflet/leaflet.css',
      TILE_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      MAX_ZOOM: 19,
      DEFAULT_ZOOM: 12,
      FOCUS_ZOOM: 15,
      MAX_FIT_ZOOM: 14,
      FIT_PADDING_PX: 40,
      LOAD_TIMEOUT_MS: 10000,
      IDLE_TIMEOUT_MS: 2000,
      VISIBLE_MARGIN: '200px'
    },

    // Yalnız hedef koordinatı eklenir; kullanıcının konumu bağlantıya EKLENMEZ.
    DIRECTIONS_URL_TEMPLATE: 'https://www.google.com/maps/dir/?api=1&destination={lat},{lng}',

    /* ---- 8. Tarayıcı içi örnek veri (ENVIRONMENT: 'mock') ----------------- */

    MOCK: {
      SCRIPT: 'js/mock-data.js',
      DELAY_MS: 500,
      // normal | empty | stale | broken | many | error | ratelimit | unsupported
      // Adres çubuğunda ?mock=empty gibi de seçilebilir (yalnız 'mock' ortamında).
      SCENARIO: 'normal'
    },

    /* ---- 9. Genel ----------------------------------------------------------- */

    LOCALE: 'tr-TR',
    STORAGE_KEY_PREFIX: 'acilradar.'
  });
})(window.AcilRadar = window.AcilRadar || {});

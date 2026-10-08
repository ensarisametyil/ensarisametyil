/* =============================================================================
 * DOSYA ADI    : js/config.js
 * NE İŞE YARAR : Uygulamanın TÜM ayarlarını tek yerde toplar. Kodun başka hiçbir
 *                yerinde "sihirli sayı" yoktur; süreler, katsayılar, adresler ve
 *                özellik bayrakları buradan okunur.
 * NEYİ ALIR    : Hiçbir şey.
 * NEYİ VERİR   : window.AcilRadar.config (salt okunur nesne).
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Gerçek arka uca bağlanmak ............ API_URL ve USE_MOCK
 *   - Otomatik yenileme süresi .............. AUTO_REFRESH
 *   - "Veri güncel değil" eşiği ............. STALE_AFTER_MINUTES
 *   - Yol/kayıt süresi hesabı ............... TRAVEL ve REGISTRATION_MINUTES
 *   - İlçe listesi (konum seçimi) ........... DISTRICTS (adları js/strings.js › districts)
 *   - Özellikleri aç/kapat .................. FEATURES
 *   - Yol tarifi için kullanılan harita ..... DIRECTIONS_URL_TEMPLATE
 * NOT: Bu dosya yalnızca ayar içerir; kullanıcıya görünen metin YOKTUR
 *      (tüm metinler js/strings.js içindedir).
 * ========================================================================== */
(function (AR) {
  'use strict';

  AR.config = Object.freeze({
    /* ---- 1. Arka uç bağlantısı ------------------------------------------- */

    // Arka ucun adresi. Göreli (aynı sunucu) ya da tam adres olabilir.
    // İstek şu biçimde gider: GET {API_URL}?at=now|2h|evening
    API_URL: 'api/hospitals.php',

    // true  → sahte veri (js/mock-data.js) kullanılır, ağa hiç çıkılmaz.
    // false → API_URL adresine gerçek istek atılır.
    USE_MOCK: true,

    // Sahte verinin "sunucu gecikmesi" (yükleniyor iskeletini görmek için).
    MOCK_DELAY_MS: 600,

    // Sahte veri senaryosu: normal | empty | error | invalid | legacy
    // NOT: USE_MOCK açıkken adres çubuğuna ?mock=empty gibi yazarak da seçilebilir;
    // böylece boş/hata durumlarını kodu değiştirmeden deneyebilirsiniz.
    MOCK_SCENARIO: 'normal',

    // Tek isteğin en fazla bekleme süresi ve hata sonrası yeniden deneme sayısı.
    REQUEST_TIMEOUT_MS: 8000,
    REQUEST_RETRY_COUNT: 1,
    REQUEST_RETRY_DELAY_MS: 800,

    /* ---- 2. Zaman seçici -------------------------------------------------- */

    // Sunucuya ?at= olarak giden değerler. Etiketleri: js/strings.js › time
    TIME_SLOTS: ['now', '2h', 'evening'],
    DEFAULT_TIME_SLOT: 'now',

    /* ---- 3. Konum --------------------------------------------------------- */

    // İlçe merkezleri (yaklaşık). Görünen adları: js/strings.js › districts
    // Yeni ilçe eklemek için: buraya { id, lat, lng } ekleyin + strings.js'e adını yazın.
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

    // "Konumumu kullan" ayarları (tarayıcının Geolocation API'si).
    // NOT: Konum yalnızca tarayıcıda kullanılır, hiçbir isteğe eklenmez, saklanmaz.
    GEOLOCATION: {
      TIMEOUT_MS: 10000,
      MAX_AGE_MS: 60000,
      HIGH_ACCURACY: false
    },

    /* ---- 4. Süre hesabı (js/calc.js kullanır) ----------------------------- */

    TRAVEL: {
      // Kuş uçuşu mesafeyi yaklaşık yol mesafesine çeviren çarpan.
      ROAD_FACTOR: 1.3,
      // Şehir içi ortalama hız (km/sa).
      AVERAGE_SPEED_KMH: 35,
      // Trafik payı: üst sınır, alt sınırın bu katı alınır.
      TRAFFIC_FACTOR_MAX: 1.4,
      // Çok yakın hastanelerde bile en az bu kadar dakika yol varsayılır.
      MIN_TRAVEL_MINUTES: 2
    },

    // Kayıt (hasta kabul) için eklenen süre aralığı, dakika: [alt, üst]
    REGISTRATION_MINUTES: [5, 10],

    // Bir hastanenin verisi bu kadar dakikadan eskiyse süre ve yoğunluk GİZLENİR.
    // NOT: Yanıltıcı eski bilgi göstermemek için bilinçli bir güvenlik kuralıdır.
    STALE_AFTER_MINUTES: 30,

    /* ---- 5. Yenileme ve zamanlayıcılar ----------------------------------- */

    AUTO_REFRESH: {
      DEFAULT_SECONDS: 60,
      // 0 = kapalı. Seçenek etiketleri strings.js › refresh içinden üretilir.
      OPTIONS_SECONDS: [0, 30, 60, 120, 300]
    },

    // "5 dakika önce" yazılarını ve veri eskime denetimini tazeleme aralığı.
    CLOCK_TICK_SECONDS: 30,

    // Arama kutusuna yazarken listeyi yeniden çizmeden önce beklenen süre.
    SEARCH_DEBOUNCE_MS: 200,

    // Kısa bildirimlerin (ör. "panoya kopyalandı") ekranda kalma süresi.
    TOAST_DURATION_MS: 4000,

    // Yüklenirken gösterilen iskelet kart sayısı.
    SKELETON_CARD_COUNT: 4,

    /* ---- 6. Görünüm ve sıralama ------------------------------------------ */

    TEXT_SIZES: ['small', 'normal', 'large'],
    DEFAULT_TEXT_SIZE: 'normal',

    THEMES: ['auto', 'light', 'dark'],
    DEFAULT_THEME: 'auto',

    // NOT: Sıralama yalnızca bu ölçütlerle yapılır; sponsorlu/öne çıkarılmış sıralama YOKTUR.
    SORT_KEYS: ['total', 'distance', 'crowding'],
    DEFAULT_SORT: 'total',

    // Sunucunun gönderebileceği yoğunluk seviyeleri (azdan çoğa doğru).
    CROWDING_LEVELS: ['low', 'medium', 'high'],

    // Sunucunun gönderebileceği veri kaynakları.
    DATA_SOURCES: ['simulated', 'hospital', 'official'],

    /* ---- 7. Harita -------------------------------------------------------- */

    MAP: {
      TILE_URL: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      MAX_ZOOM: 19,
      DEFAULT_ZOOM: 12,
      FOCUS_ZOOM: 15,
      MAX_FIT_ZOOM: 14,
      FIT_PADDING_PX: 40
    },

    // "Yol tarifi al" bağlantısı. YALNIZCA hedef koordinat eklenir;
    // kullanıcının konumu bağlantıya EKLENMEZ (harita uygulaması kendisi sorar).
    DIRECTIONS_URL_TEMPLATE: 'https://www.google.com/maps/dir/?api=1&destination={lat},{lng}',

    EMERGENCY_PHONE: '112',

    /* ---- 8. Özellik bayrakları -------------------------------------------- */

    // false yapılan özellik arayüzden tamamen kalkar (düğmesi de görünmez).
    FEATURES: Object.freeze({
      favorites: true,
      share: true,
      autoRefresh: true,
      search: true
    }),

    /* ---- 9. Tarayıcı depolaması (js/storage.js kullanır) ----------------- */

    STORAGE_KEY_PREFIX: 'acilradar.',
    MAX_FAVORITES: 50,

    // Tarih/sayı biçimleri için yerel ayar (Intl API).
    LOCALE: 'tr-TR'
  });
})(window.AcilRadar = window.AcilRadar || {});

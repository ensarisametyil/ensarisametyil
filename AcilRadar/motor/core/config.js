/* =============================================================================
 * motor/core/config.js
 * NE İŞE YARAR : Motorun TÜM ayarları ve eşikleri. Başka dosyada sihirli sayı yoktur.
 *                Her ayarın birimi ve gerekçesi yanında yazılıdır.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Seviye eşikleri (az/orta/çok) ........ LEVELS
 *   - Bayatlık eşiği ...................... STALE_AFTER_MINUTES
 *   - Benzetim sayısı / yakınsama .......... SIMULATION
 *   - Varsayımlar ("DOĞRULANMALI") ......... SERVICE, CLASS_MIX, CAPACITY_PER_PHYSICIAN, DEMAND
 * UYARI: "DOĞRULANMALI" etiketli değerler gerçek veriyle ölçülmemiştir; pilot
 *        verisiyle yeniden öğrenilmeli ya da hastaneyle doğrulanmalıdır
 *        (docs/VERI_GEREKSINIMLERI.md).
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.AcilRadarMotor = root.AcilRadarMotor || {}).config = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function deepFreeze(object) {
    Object.keys(object).forEach(function (key) {
      if (object[key] && typeof object[key] === 'object') deepFreeze(object[key]);
    });
    return Object.freeze(object);
  }

  return deepFreeze({
    MODEL_VERSION: '2.2.0',

    // Bileşenler. Geriye dönük testte (docs/DOGRULAMA_RAPORU_2.0.0.md › kapatma deneyleri)
    // ölçülebilir kazanç getirmeyenler KAPALIDIR (görev kuralı: karmaşıklık hak edilmeli).
    // Kod yerinde durur; pilot verisi kazanç gösterirse açılabilir.
    FEATURES: {
      DEMAND_LEARNING: true,      // Gamma-Poisson öğrenme: doluluk MAE'de A/B'de küçük kazanç, C'de kayıp (karışık) — açık
      BED_BLOCKING: true,         // yatak tıkanması: ölçüde ≈ 0, ama yapısal (bedCapacity anlamı) — açık
      SURGE_DETECTION: false,     // CUSUM ani artış: Δ MAE ≈ 0 (A/B/C) — KAPALI
      HOLIDAY_EFFECT: false,      // gün türü etkisi: C'de kapatınca hata AZALDI — KAPALI
      PARAM_UNCERTAINTY: false    // parametre belirsizliği: Δ MAE ≈ 0, aralıklar zaten fazla geniş — KAPALI
    },

    // Hibrit yöntem seçimi (core/hybrid.js). Gerekçe: docs/MODEL_KARTI.md §8.
    HYBRID: {
      PERSISTENCE_UNTIL_MINUTES: 60,    // doluluk: bu ufka kadar güncel doluluk aynen kalır
      SEASONAL_MIN_SAMPLES: 2,          // mevsimsel ortalama için aynı saat-gün diliminde en az örnek (yoksa süreklilik + 'occupancyHistory' varsayıldı)
      SEASONAL_MAX_HISTORY_DAYS: 84,    // en çok 12 hafta geriye bakılır
      ENGINE_WAIT_HORIZON_MINUTES: 0,   // bekleme için motor YALNIZ "şimdi"de kullanılır
      YELLOW_NOW_ENGINE: true,          // sarı bekleme "şimdi": motor (4 rejimde bugünkü formülden iyi ölçüldü); false → sabit aralık
      // Bugünkü ürün formülü (js/mock-data.js ile aynı): ileri ufuklarda bekleme için
      FORMULA: { MINUTES_PER_PATIENT: 9, SPREAD: 1.4, YELLOW: [5, 20] }
    },

    TIME: {
      UTC_OFFSET_MINUTES: 180,   // Türkiye 2016'dan beri sabit UTC+3 (yaz saati yok)
      EVENING_HOUR: 20,          // "akşam" tahmini: yerel 20:00
      HALF_DAY_FROM_HOUR: 13,    // arife ve 28 Ekim: tatil 13:00'te başlar
      // Takvim kayıtlarının uygulanması için en düşük doğrulama düzeyi (holidays.js).
      // 'secondary' = resmî takvimi aktaran birden çok tutarlı kaynak. Yayından önce
      // birincil kaynakla karşılaştırılıp 'primary' yapılması önerilir.
      HOLIDAY_MIN_VERIFICATION: 'secondary'
    },

    // Ufuklar (dakika). Ürünün ana çıktısı: şimdi, +2 saat ve akşam 20:00.
    HORIZONS_MINUTES: [0, 30, 60, 120, 180, 240],
    // Akşam tahmini en çok bu kadar ileriye benzetilir (dk). Daha uzaksa (ör. sabah
    // 08:00'den önce sorulursa) şimdiki kuyruğun etkisi sönmüştür (kuyruk birkaç saatte
    // "unutur"); akşam yalnız mevsimsel öncülle verilir. 480 dk seçimi performans bütçesi
    // içindir; doğruluğa etkisi geriye dönük testte ölçülür (docs/DOGRULAMA_RAPORU.md).
    EVENING_MAX_LEAD_MINUTES: 480,

    // Sitedeki js/config.js ile AYNI olmalı (arayüz de bu eşikle "güncel bilgi yok" der).
    STALE_AFTER_MINUTES: 30,
    FUTURE_TOLERANCE_MINUTES: 5,  // sunucu saat kayması toleransı

    // Doluluk seviyesi eşikleri (yüzde). Mevcut örnek veriyle aynı başlangıç değerleri;
    // gerekçe ve ±5 puan hassasiyet analizi docs/MODEL_KARTI.md'de.
    LEVELS: { MEDIUM_FROM: 50, HIGH_FROM: 80 },

    // Triyaj sınıfları, öncelik sırasıyla. Sözleşmede: yellow = "daha acil", green = "acil olmayan".
    CLASSES: ['red', 'yellow', 'green'],
    // Gelenlerin sınıf payı — DOĞRULANMALI (hastane verisiyle öğrenilmeli).
    CLASS_MIX: { red: 0.05, yellow: 0.35, green: 0.60 },

    // Hekim muayene/müdahale süresi (dakika), sınıf başına log-normal — DOĞRULANMALI.
    // median: ortanca; sigma: log ölçekte standart sapma.
    SERVICE: {
      red: { median: 35, sigma: 0.5 },
      yellow: { median: 18, sigma: 0.55 },
      green: { median: 9, sigma: 0.6 }
    },
    SERVICE_PARAM_SIGMA: 0.15,     // ortanca sürenin kendi belirsizliği (log ölçek)

    // Beklemekten vazgeçip ayrılma (LWBS): sabır süresi üstel, ortalama (dk). null = ayrılmaz.
    PATIENCE_MEAN_MINUTES: { red: null, yellow: 480, green: 150 },
    // Muayene sonrası yatış kararı olasılığı — DOĞRULANMALI.
    ADMIT_PROBABILITY: { red: 0.45, yellow: 0.15, green: 0.02 },
    // Yatış bekleme (boarding) süresi, log-normal (dk) — DOĞRULANMALI.
    BOARDING: { median: 150, sigma: 0.7 },
    // Muayene sırasında yatak/gözlem alanı gerektiren sınıflar (yeşil: ayakta hızlı alan).
    NEEDS_BED: { red: true, yellow: true, green: false },

    // Kapasite tabanlı doluluk: hastane "bedCapacity" vermezse kapasite = hekim × bu değer.
    // VARSAYIMDIR — DOĞRULANMALI (bir hekim başına aynı anda yönetilebilen hasta sayısı).
    CAPACITY_PER_PHYSICIAN: 6,

    // Eksik alanlar için varsayılanlar (assumedFields listesine yazılır, güven düşer).
    DEFAULTS: {
      PHYSICIANS: 4,                  // hekim sayısı bilinmiyorsa
      RED_PER_YELLOW_WAITING: 0.1,    // bekleyen kırmızı ≈ bekleyen sarının %10'u
      IN_SERVICE_SHARE: 0.8,          // muayenedeki hasta ≈ hekimlerin %80'i
      BOARDING_PER_PHYSICIAN: 0.3     // yatış bekleyen ≈ hekim × 0,3
    },

    // ---- Talep (başvuru hızı) ---------------------------------------------------
    DEMAND: {
      // Geçmiş veri yokken bölge öncülü: hekim başına saatlik başvuru — DOĞRULANMALI.
      ARRIVALS_PER_PHYSICIAN_HOUR: 2.4,
      // Saatlik örüntü (yerel 00..23, göreli). Acil servislerde yaygın görülen gece düşük /
      // gündüz ve akşam yüksek şekil; değerler VARSAYIMDIR ve geçmiş veriyle öğrenilir.
      HOURLY_PROFILE: [0.55, 0.45, 0.38, 0.33, 0.31, 0.33, 0.45, 0.70, 1.00, 1.25, 1.35, 1.35,
        1.30, 1.25, 1.20, 1.18, 1.20, 1.25, 1.30, 1.35, 1.30, 1.15, 0.95, 0.75],
      // Haftanın günü (Pzt..Paz) göreli — VARSAYIM; şimdilik öğrenilmez (bkz. MODEL_KARTI).
      WEEKDAY_FACTOR: [1.10, 1.00, 0.98, 0.97, 0.98, 0.97, 1.00],
      // Hiyerarşik Gamma-Poisson büzülme: öncül gücü "sahte beklenen başvuru" cinsinden.
      // Küçük → veriye hızlı uyar; büyük → bölge öncülüne yakın kalır.
      SCALE_PRIOR_STRENGTH: 20,
      HOUR_PRIOR_STRENGTH: 40,
      DAYTYPE_PRIOR_STRENGTH: 30,
      LEARN_ITERATIONS: 3,
      MAX_HISTORY_HOURS: 2016,        // en çok 12 hafta saatlik geçmiş kullanılır
      // Gün türü etkileri öncül ortalaması 1 (etkisiz); yalnız veriyle öğrenilir.
      DAYTYPES: ['religious', 'official', 'arife', 'postReligious'],
      POST_RELIGIOUS_DAYS: 2,         // bayram ertesi kaç gün ayrı tür sayılır
      // Ani artış: standartlaştırılmış artıklar üzerinde tek yönlü CUSUM.
      CUSUM_K: 0.5,                   // tolerans (σ cinsinden)
      CUSUM_H: 4,                     // alarm eşiği (σ cinsinden)
      CUSUM_LOOKBACK_HOURS: 24,
      SURGE_WINDOW_HOURS: 3,          // artış katsayısı son kaç saatten hesaplanır
      SURGE_PRIOR: 10,                // artış katsayısını 1'e doğru büzme gücü
      SURGE_MAX_FACTOR: 2.5,
      SURGE_HALF_LIFE_MINUTES: 90     // artışın etkisi ileriye doğru yarılanır
    },

    // ---- Benzetim -----------------------------------------------------------------
    SIMULATION: {
      RUNS: 1500,                     // en çok benzetim sayısı
      MIN_RUNS: 300,                  // yakınsama denetimine başlamadan önce
      BATCH: 150,                     // yakınsama bu aralıkla denetlenir
      CONVERGENCE_POINTS: 1,          // yüzdelik kayması ≤ max(1 puan, bir hasta) → yeterli
      CONVERGENCE_STREAK: 2,          // art arda kaç denetimde sağlanmalı
      MAX_EVENTS_PER_RUN: 50000,      // sınırsız döngüye karşı üst sınır
      TAG_EXTENSION_MINUTES: 600,     // ölçüm hastası için son durum kesitinden sonra en çok
      MAX_ARRIVAL_RATE_PER_HOUR: 400  // akıl dışı hızlara karşı üst sınır
    },
    QUANTILES: { LOW: 0.1, MID: 0.5, HIGH: 0.9 },   // nominal %80 aralık

    // ---- Veri kalitesi ------------------------------------------------------------
    LIMITS: {
      COUNT_MAX: 9999,
      PHYSICIANS_MAX: 500,
      CAPACITY_MAX: 5000,
      ARRIVALS_HOUR_MAX: 2000,
      WAITING_PER_PHYSICIAN_MAX: 60,  // üstü aykırı sayılır, sınırlanır ve uyarı üretilir
      OCCUPANCY_PERCENT_MAX: 1000,    // geçmiş doluluk gözleminde ham yüzde üst sınırı (aşırı kuyruk)
      OCCUPANCY_HISTORY_MAX_ROWS: 4032 // 12 hafta × 336 yarım saat
    },
    SOURCE_TRUST: { simulated: 0, hospital: 1, official: 2 },
    // Güven düzeyi kural tablosu (docs/MODEL_KARTI.md › Güven düzeyi).
    CONFIDENCE: {
      FRESH_FULL_MINUTES: 10,         // ≤ 10 dk: 2 puan
      FRESH_PARTIAL_MINUTES: 20,      // ≤ 20 dk: 1 puan
      HIGH_FROM_POINTS: 7,            // 8 üzerinden
      MEDIUM_FROM_POINTS: 4
    },

    // ---- Doluluk tanımları ----------------------------------------------------------
    INDEX_DEFINITION: {
      ENABLED: false,
      REASON: 'Uygulanmadı: NEDOCS türü endeksler hastane yatak sayısı, solunum desteğindeki ' +
        'hasta sayısı ve en uzun yatış bekleme süresi gibi asgari veri setinde OLMAYAN girdiler ' +
        'ister; ayrıca endeks puanının yüzdeye dönüşümü literatürde tanımlı değildir. Katsayılar ' +
        'birincil kaynaktan doğrulanmadan ve girdiler sağlanmadan hesaplanmaz.'
    },

    // ---- Açıklama -----------------------------------------------------------------
    EXPLAIN: {
      RUNS: 300,                      // karşıolgusal benzetim sayısı (ortak rastgele sayılar)
      MAX_FACTORS: 3,
      MIN_POINTS: 2,                  // doluluk: |katkı| < 2 puan ise cümle kurulmaz
      MIN_WAIT_POINTS: 3              // bekleme: |katkı| < 3 dk ise cümle kurulmaz
    },

    // ---- Kalibrasyon ve kayma -----------------------------------------------------
    CALIBRATION: {
      TARGET_COVERAGE: 0.8,
      MIN_CELL_SIZE: 40,              // ufuk × saat dilimi hücresinde en az örnek
      MIN_POOLED_SIZE: 60,            // hücre yetersizse ufuk geneli için en az örnek
      // Saat dilimleri (yerel saat, [başlangıç, bitiş)).
      DAYPARTS: [
        { id: 'night', from: 0, to: 8 },
        { id: 'day', from: 8, to: 16 },
        { id: 'evening', from: 16, to: 24 }
      ]
    },
    DRIFT: { DELTA: 0.5, LAMBDA: 60 },  // Page-Hinkley (hata birimi: puan)

    // ---- Sözleşme çıktısı ----------------------------------------------------------
    CONTRACT: {
      // Ürün kuralı: süre DAİMA aralıktır, tek sayıya inmez. Kuyruk benzetimi muayeneye
      // çağrılma, sedyeye yerleşme gibi kısa gecikmeleri içermez; bu nedenle gösterilen
      // bekleme aralığının üst ucu en az alt uç + 5 dk'dır (VARSAYIM; pilotta gözden geçirilir).
      MIN_WAIT_SPREAD_MINUTES: 5
    },

    // ---- Bölge hesabı ---------------------------------------------------------------
    REGION: {
      MAX_HOSPITALS: 200,
      CACHE_SIZE: 64,
      DEADLINE_MS: 4000               // aşılırsa kalan hastaneler MIN_RUNS ile hesaplanır
    }
  });
});

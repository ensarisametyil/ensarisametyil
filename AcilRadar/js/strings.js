/* =============================================================================
 * js/strings.js
 * NE İŞE YARAR : Arayüzde görünen TÜM Türkçe metinler (tek dil) ve bunları
 *                üreten yardımcılar; sayı/tarih biçimleri (Intl, tr-TR).
 * VERDİĞİ      : AcilRadar.Strings → { data, text, list, has, extend, missingKeys, format }
 *                text('card.totalLabel')
 *                text('unit.minutesRange', { min: 10, max: 20 })  → "10–20 dk."
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Bir cümleyi değiştirmek: metni bulun, tırnak içini değiştirin.
 *     {name} gibi süslü parantezli parçaları silmeyin (kod doldurur).
 *   - index.html'deki sabit metinler de buradan gelir: data-text="anahtar".
 *   - Sunucu hata kodlarının Türkçe karşılıkları: errors.codes
 * NOT: İmla TDK'ye göredir: kesme işareti ’, aralık çizgisi –, "dk." kısaltması.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const STRINGS = {
    app: {
      name: 'AcilRadar',
      documentTitle: 'AcilRadar · Acil servis yoğunluk ve süre tahmini',
      metaDescription: 'Gebze ve çevresindeki devlet hastanesi acil servislerinin tahmini yoğunluğunu ve yol, kayıt, bekleme dâhil tahmini toplam süresini karşılaştırın. Tıbbi karar aracı değildir.',
      tagline: 'Acil servis süre tahmini'
    },

    a11y: {
      skipLink: 'İçeriğe atla',
      newTab: '(yeni sekmede açılır)',
      loading: 'Acil servis bilgileri yükleniyor.'
    },

    banner: {
      simulationTag: 'ÖRNEK VERİ',
      simulation: 'Örnek veri — gerçek değildir. Hastane adları ve sayılar yalnızca örnektir.',
      offline: 'İnternet bağlantısı yok. Son alınan bilgiler gösteriliyor; bağlantı gelince yenilenecek.',
      noticeInfo: 'Duyuru',
      noticeWarning: 'Önemli duyuru'
    },

    topbar: {
      homeLabel: 'AcilRadar, sayfanın başına git',
      textSizeLabel: 'Yazı boyutu',
      textSmall: 'A−',
      textSmallLabel: 'Küçük yazı',
      textNormal: 'A',
      textNormalLabel: 'Normal yazı',
      textLarge: 'A+',
      textLargeLabel: 'Büyük yazı',
      call: '112’yi Ara',
      callShort: '112',
      callLabel: '112 Acil Çağrı Merkezini ara'
    },

    hero: {
      title: 'Yakınınızdaki devlet hastanesi acil servislerinin tahmini yoğunluğunu ve toplam süresini karşılaştırın.',
      lead: 'Yalnız devlet hastaneleri listelenir. Yol, kayıt ve bekleme süreleri birlikte hesaplanır; sıralama tarafsızdır.',
      statsLabel: 'Bölge özeti'
    },

    stats: {
      hospitals: 'Acil servis',
      hospitalsNote: 'Bilgisi gelen',
      leastCrowded: 'En az yoğun',
      nearest: 'En yakın',
      none: '—',
      noFresh: 'Güncel bilgi yok',
      occupancy: 'Doluluk {value}',
      distance: 'Yaklaşık {value}'
    },

    disclaimer: {
      short: 'Bu bilgiler tahminidir. Muayene sırasını triyaj belirler. Tıbbi karar aracı değildir.'
    },

    emergency: {
      title: 'Hayati tehlike mi? Hemen 112’yi arayın.',
      call: '112’yi Ara',
      toggle: 'Hangi durumlarda 112 aranmalı?',
      intro: 'Aşağıdakilerden biri varsa hastaneye kendiniz gitmeye çalışmayın; 112’yi arayın:',
      symptoms: [
        'Göğüs ağrısı, göğüste baskı veya sıkışma',
        'Ani nefes darlığı ya da nefes alamama',
        'Bilinç kaybı, bayılma veya uyandırılamama',
        'Yüzde kayma, kol ya da bacakta ani güçsüzlük, konuşma bozukluğu',
        'Durdurulamayan kanama',
        'Trafik kazası, yüksekten düşme veya ciddi yaralanma',
        'Nöbet geçirme',
        'Zehirlenme ya da yüzde ve dilde şişmeyle gelen ağır alerjik tepki'
      ],
      note: 'Emin değilseniz 112’yi arayıp danışabilirsiniz.'
    },

    controls: {
      title: 'Seçimleriniz',
      step1: 'Bulunduğunuz yer',
      districtLabel: 'İlçe',
      deviceOption: 'Cihazımın konumu',
      useLocation: 'Konumumu kullan',
      locating: 'Konumunuz alınıyor…',
      locationDevice: 'Cihazınızın konumu kullanılıyor.',
      locationDistrict: 'Mesafeler {district} merkezine göre hesaplanır.',
      locationDenied: 'Konum izni verilmedi. Lütfen bulunduğunuz yeri listeden seçin.',
      locationUnavailable: 'Konum alınamadı. Lütfen bulunduğunuz yeri listeden seçin.',
      locationTimeout: 'Konum zamanında alınamadı. Lütfen bulunduğunuz yeri listeden seçin.',
      locationUnsupported: 'Tarayıcınız konum özelliğini desteklemiyor. Lütfen bulunduğunuz yeri listeden seçin.',
      locationPrivacy: 'Konumunuz yalnızca bu cihazda kullanılır; hiçbir yere gönderilmez.',
      step2: 'Zaman',
      timePassed: '{label} (bugün için geçti)',
      timeForecastNote: 'İleri saatler için gösterilenler öngörüdür.',
      timeSlotExpired: '{label} saati geçti; şu anki tahminler gösteriliyor.',
      step3: 'Sıralama ve filtre',
      sortLabel: 'Sıralama',
      sortNote: 'Sıralama tarafsızdır; ücretli ya da öne çıkarılmış hastane yoktur.',
      searchLabel: 'Hastane adıyla ara',
      searchHint: 'Örneğin bir ilçe ya da hastane adı yazın.',
      childOnly: 'Yalnız çocuk acili olanlar',
      crowdingLabel: 'Yoğunluk',
      clearFilters: 'Filtreleri temizle'
    },

    districts: {
      gebze: 'Gebze',
      darica: 'Darıca',
      cayirova: 'Çayırova',
      dilovasi: 'Dilovası',
      korfez: 'Körfez',
      tuzla: 'Tuzla',
      pendik: 'Pendik'
    },

    time: {
      now: 'Şimdi',
      '2h': '2 saat sonra',
      evening: 'Akşam 20:00',
      justNow: 'az önce'
    },

    sort: {
      total: 'En kısa toplam süre',
      distance: 'En yakın',
      crowding: 'En az yoğun'
    },

    crowding: {
      low: 'Az yoğun',
      medium: 'Orta yoğun',
      high: 'Çok yoğun',
      stale: 'Güncel bilgi yok'
    },

    results: {
      title: 'Acil servisler',
      listLabel: 'Acil servis listesi',
      count: '{count} acil servis listeleniyor. Sıralama: {sort}.',
      countZero: 'Seçimlerinize uyan acil servis yok.',
      lastUpdated: 'Son güncelleme: {time} ({relative})',
      notUpdated: 'Bilgi bekleniyor',
      refresh: 'Bilgileri yenile',
      refreshing: 'Bilgiler yenileniyor…'
    },

    pick: {
      title: 'Seçimlerinize göre tahmini toplam süresi en kısa',
      totalLabel: 'Tahmini toplam süre',
      basis: 'Yol, kayıt ve bekleme sürelerinin toplamıdır. Tavsiye değil, tahmindir.',
      none: 'Şu an güncel bilgisi olan acil servis yok; karşılaştırma yapılamıyor.'
    },

    card: {
      rank: 'Sıra {rank}',
      separator: ' · ',
      travelMeta: '{range} yol',
      childER: 'Çocuk acili var',
      sample: 'Örnek veri',
      forecast: 'Öngörü',
      shortest: 'En kısa toplam süre',
      occupancy: 'Doluluk {value}',
      totalLabel: 'Tahmini toplam süre',
      totalNote: 'Yol + kayıt + bekleme',
      tileTravel: 'Yol',
      tileWait: 'Bekleme',
      tilePhysicians: 'Hekim',
      unknown: 'Bilinmiyor',
      staleTitle: 'Bu hastane için güncel bilgi yok.',
      staleAge: 'Son güncelleme {relative}. Yanıltmamak için süre ve yoğunluk gösterilmiyor.',
      staleFuture: 'Güncelleme zamanı tutarsız. Yanıltmamak için süre ve yoğunluk gösterilmiyor.',
      details: 'Ayrıntılar',
      directions: 'Yol tarifi al',
      directionsLabel: '{name} için yol tarifi al (harici harita, yeni sekmede açılır)',
      showOnMap: 'Haritada göster',
      showOnMapLabel: '{name} haritada göster'
    },

    details: {
      nonUrgentWaiting: 'Acil olmayan başvurularda bekleyen',
      nonUrgentWait: 'Acil olmayan başvurular için tahmini bekleme',
      urgentWaiting: 'Daha acil başvurularda bekleyen',
      urgentWait: 'Daha acil başvurular için tahmini bekleme',
      physicians: 'Görevdeki hekim',
      registration: 'Kayıt için eklenen süre',
      distance: 'Tahmini yol mesafesi',
      updated: 'Son güncelleme',
      kind: 'Tahmin türü',
      kindNow: 'Şu anki durum tahmini',
      kindForecast: 'İleri saat öngörüsü',
      source: 'Veri kaynağı',
      people: '{count} kişi'
    },

    source: {
      simulated: 'Örnek veri (simülasyon)',
      hospital: 'Hastane bildirimi',
      official: 'Resmî kaynak'
    },

    map: {
      title: 'Harita',
      label: 'Acil servislerin haritası',
      show: 'Haritayı göster',
      hide: 'Haritayı gizle',
      fitAll: 'Hepsini göster',
      legendTitle: 'Renk açıklaması',
      legendOrigin: 'Başlangıç noktası',
      loading: 'Harita yükleniyor…',
      unavailable: 'Harita şu an yüklenemedi. Liste ve süre bilgileri kullanılabilir.',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      markerLabel: '{rank}. {name}: {status}',
      popupTotal: 'Tahmini toplam süre: {range}',
      popupGoToCard: 'Karta git',
      originDevice: 'Cihazınızın konumu',
      originDistrict: '{district} merkezi'
    },

    empty: {
      noDataTitle: 'Bu bölge için şu an acil servis bilgisi yok.',
      noDataBody: 'Bilgiler geldiğinde burada görünecek. Biraz sonra tekrar deneyin.',
      noMatchTitle: 'Seçimlerinize uyan acil servis yok.',
      noMatchBody: 'Filtreleri değiştirmeyi ya da temizlemeyi deneyin.'
    },

    errors: {
      title: 'Bilgiler şu an alınamadı.',
      retry: 'Tekrar dene',
      keptOld: 'Bilgiler yenilenemedi; son alınan bilgiler gösteriliyor.',
      // Sunucunun "message" alanı kullanıcıya GÖSTERİLMEZ; yalnız bu kodlar kullanılır.
      codes: {
        NETWORK: 'Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.',
        TIMEOUT: 'Sunucu zamanında yanıt vermedi. Lütfen tekrar deneyin.',
        OFFLINE: 'İnternet bağlantısı yok. Bağlantı gelince bilgiler yenilenecek.',
        RATE_LIMITED: 'Kısa sürede çok sayıda istek yapıldı. Lütfen biraz sonra tekrar deneyin.',
        BAD_REQUEST: 'İstek anlaşılamadı. Lütfen sayfayı yenileyin.',
        UNAVAILABLE: 'Hizmet şu an kullanılamıyor. Lütfen biraz sonra tekrar deneyin.',
        INTERNAL: 'Sunucuda bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.',
        INVALID_RESPONSE: 'Sunucudan gelen bilgiler okunamadı. Lütfen biraz sonra tekrar deneyin.',
        UNSUPPORTED_SCHEMA: 'Hizmet güncellemesi gerekiyor. Sayfa, sunucunun bilgi biçimini tanımıyor; lütfen daha sonra tekrar deneyin.',
        UNKNOWN: 'Bilgiler şu an alınamadı. Lütfen tekrar deneyin.'
      }
    },

    // Yalnız geliştirici konsolunda görünür (kullanıcı görmez).
    dev: {
      prefix: '[AcilRadar]',
      skippedHospital: '{index}. kayıt ({id}) atlandı. Eksik/hatalı alanlar: {fields}',
      duplicateId: '{index}. kayıt atlandı: "{id}" kimliği daha önce kullanılmış.',
      clamped: '{index}. kayıt ({id}): "{field}" sınır dışıydı ({value}); {min}–{max} aralığına çekildi.',
      tooMany: 'Yanıtta {count} kayıt var; ilk {max} kayıt kullanıldı.',
      notObject: 'Yanıt bir JSON nesnesi değil.',
      noHospitals: 'Yanıtta "hospitals" dizisi yok. Sözleşme: docs/SOZLESME.md',
      schemaMissing: '"schemaVersion" yok; 1.0 varsayıldı.',
      schemaMajor: 'Sözleşme sürümü uyumsuz: sunucu {server}, arayüz {client}.x bekliyor.',
      generatedAtMissing: '"generatedAt" yok ya da geçersiz; tarayıcı saati kullanıldı.',
      badNotice: '"notice" alanı geçersiz; yok sayıldı.',
      missingKey: 'js/strings.js içinde olmayan metin anahtarı: {key}',
      leafletFailed: 'Leaflet yüklenemedi; harita yerine bilgi kutusu gösteriliyor.',
      requestFailed: 'İstek başarısız: {code} (HTTP {status})'
    },

    info: {
      formulaTitle: 'Süre nasıl hesaplanıyor?',
      formulaIntro: 'Tahmini toplam süre üç parçanın toplamıdır ve her zaman bir aralık olarak gösterilir.',
      formulaTravel: 'Yol: Başlangıç noktanızla hastane arasındaki kuş uçuşu mesafe {roadFactor} ile çarpılarak yol mesafesi tahmin edilir. Ortalama {speed} km/sa hızla süre bulunur; trafik payı için üst sınır bunun {traffic} katıdır. En az {minTravel} dk. kabul edilir.',
      formulaRegistration: 'Kayıt: Hasta kabul işlemleri için {min}–{max} dk. eklenir.',
      formulaWait: 'Bekleme: Hastanenin bildirdiği, acil olmayan başvurular için tahmini bekleme aralığı kullanılır. Daha acil durumlarda sırayı triyaj belirler.',
      formulaTotal: 'Toplam = Yol + Kayıt + Bekleme. Alt sınırlar kendi aralarında, üst sınırlar kendi aralarında toplanır.',
      formulaStale: 'Bir hastanenin bilgisi {minutes} dakikadan eskiyse süre ve yoğunluk gösterilmez.',
      formulaCrowding: 'Yoğunluk düzeyini (az, orta, çok) veri kaynağı, acil servisin doluluk oranına göre belirler.',

      howtoTitle: 'Nasıl kullanılır?',
      howto1Title: 'Bulunduğunuz yeri seçin',
      howto1Body: 'İlçenizi listeden seçin ya da “Konumumu kullan” düğmesine basın.',
      howto2Title: 'Zamanı ve filtreleri belirleyin',
      howto2Body: 'Şimdi, 2 saat sonra ya da akşam için tahminleri görün; gerekirse çocuk acili veya yoğunluğa göre süzün.',
      howto3Title: 'Karşılaştırın',
      howto3Body: 'Tahmini toplam süreleri karşılaştırın; “Yol tarifi al” ile harita uygulamanızı açın.',

      sourceTitle: 'Veriler nereden geliyor?',
      source: {
        simulated: 'Şu an gösterilen bilgiler örnek veridir (simülasyon). Gerçek hastanelere ait değildir ve yalnızca arayüzü tanıtmak içindir.',
        hospital: 'Bilgiler hastanelerin kendi bildirimlerinden gelir. Hastaneler bilgilerini belirli aralıklarla günceller.',
        official: 'Bilgiler resmî kaynaktan gelir ve belirli aralıklarla güncellenir.',
        mixed: 'Bilgiler birden fazla kaynaktan gelir. Her kartın ayrıntılarında o hastanenin veri kaynağı yazar.',
        none: 'Bilgi geldiğinde kaynağı burada açıklanacaktır.'
      },
      sourceCommon: 'Listede yalnız devlet hastanelerinin acil servisleri yer alır. Bilgiler tahmindir; gerçek durum farklı olabilir. Bir hastanenin bilgisi eskiyse o hastanenin süre ve yoğunluğu gösterilmez.',

      legalTitle: 'Sorumluluk reddi',
      legal: [
        'AcilRadar tıbbi karar aracı değildir; teşhis veya tedavi önerisi sunmaz.',
        'Gösterilen yoğunluk ve süreler tahminidir; gerçek durum farklı olabilir. Muayene sırasını triyaj belirler.',
        'AcilRadar herhangi bir resmî kurum ya da hastaneyle bağlantılı değildir. Hastaneler reklam amacıyla listelenmez; ücretli ya da öne çıkarılmış sıralama yoktur.',
        'Hayati tehlike durumunda beklemeyin, 112’yi arayın.'
      ],

      privacyTitle: 'Gizlilik',
      privacy: [
        'Konumunuz yalnızca bu cihazda, mesafe hesabı için kullanılır; sunucuya gönderilmez ve saklanmaz.',
        'Çerez kullanılmaz. Reklam, analitik veya izleme aracı yoktur.',
        'Bu tarayıcıda yalnızca iki tercih saklanır: yazı boyutu ve seçtiğiniz ilçe.',
        'Harita görselleri OpenStreetMap sunucularından yüklenir; tarayıcınız bunun için standart bir istek gönderir.'
      ]
    },

    footer: {
      about: 'Gebze ve çevresindeki devlet hastanesi acil servislerinin tahmini yoğunluğunu ve toplam süresini karşılaştırmanıza yardımcı olur.',
      navTitle: 'Bu sayfada',
      emergencyTitle: 'Acil durumda',
      emergencyBody: 'Hayati tehlike varsa beklemeyin; 112’yi arayın.',
      copyright: '© {year} AcilRadar',
      mapData: 'Harita verisi: © OpenStreetMap contributors',
      backToTop: 'Başa dön'
    },

    unit: {
      km: '{value} km',
      minutes: '{value} dk.',
      minutesRange: '{min}–{max} dk.'
    }
  };

  /* ---- Metin yardımcıları ------------------------------------------------ */

  const missingKeys = new Set();

  function lookup(key) {
    return String(key).split('.').reduce(function (node, part) {
      return node != null && Object.prototype.hasOwnProperty.call(node, part) ? node[part] : undefined;
    }, STRINGS);
  }

  function reportMissing(key) {
    if (missingKeys.has(key)) return;
    missingKeys.add(key);
    console.warn(STRINGS.dev.prefix + ' ' + STRINGS.dev.missingKey.replace('{key}', key));
  }

  /**
   * Metni döndürür, {ad} yer tutucularını doldurur. Anahtar yoksa anahtarın
   * kendisi döner (sayfa bozulmaz) ve konsola yazılır.
   * @param {string} key
   * @param {Object<string,(string|number)>} [params]
   * @returns {string}
   */
  function text(key, params) {
    const template = lookup(key);
    if (typeof template !== 'string') {
      reportMissing(key);
      return String(key);
    }
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match;
    });
  }

  /** Dizi biçimindeki metinler (ör. 'emergency.symptoms'). */
  function list(key) {
    const value = lookup(key);
    if (!Array.isArray(value)) {
      reportMissing(key);
      return [];
    }
    return value.slice();
  }

  /**
   * Ayrı bir uygulamanın (ör. panel/) kendi metin grubunu ekler: extend('panel', {...}).
   * Var olan bir grubun üzerine YAZMAZ (yanlışlıkla site metinleri bozulmasın).
   */
  function extend(namespace, group) {
    if (Object.prototype.hasOwnProperty.call(STRINGS, namespace)) throw new Error(namespace);
    STRINGS[namespace] = group;
  }

  function has(key) {
    const value = lookup(key);
    return typeof value === 'string' || Array.isArray(value);
  }

  /* ---- Biçimlendirme (Intl, tr-TR) ---------------------------------------- */

  const cfg = AR.Config;
  const MS_PER_MINUTE = 60000;
  const MINUTES_PER_HOUR = 60;
  const HOURS_PER_DAY = 24;

  const numberFormats = {};
  const percentFormat = new Intl.NumberFormat(cfg.LOCALE, { style: 'percent', maximumFractionDigits: 0 });
  const clockFormat = new Intl.DateTimeFormat(cfg.LOCALE, { hour: '2-digit', minute: '2-digit', timeZone: cfg.TIME_ZONE });
  const dateTimeFormat = new Intl.DateTimeFormat(cfg.LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: cfg.TIME_ZONE });
  const relativeFormat = new Intl.RelativeTimeFormat(cfg.LOCALE, { numeric: 'auto' });

  function number(value, maxFractionDigits) {
    const digits = maxFractionDigits || 0;
    if (!numberFormats[digits]) numberFormats[digits] = new Intl.NumberFormat(cfg.LOCALE, { maximumFractionDigits: digits });
    return numberFormats[digits].format(value);
  }

  /** 62 → "%62" */
  function percent(value) {
    return percentFormat.format(value / 100);
  }

  /** 3.42 → "3,4 km" */
  function km(value) {
    return text('unit.km', { value: number(value, 1) });
  }

  /** [10, 20] → "10–20 dk." ; [15, 15] → "15 dk." ; null → "Bilinmiyor" */
  function minutesRange(range) {
    if (!range) return text('card.unknown');
    if (range[0] === range[1]) return text('unit.minutes', { value: number(range[0]) });
    return text('unit.minutesRange', { min: number(range[0]), max: number(range[1]) });
  }

  /** Zaman damgası (ms) → "13:35" (Türkiye saati) */
  function clock(ms) {
    return clockFormat.format(new Date(ms));
  }

  /** Zaman damgası (ms) → "12.10.2026 21:30" (Türkiye saati) */
  function dateTime(ms) {
    return dateTimeFormat.format(new Date(ms));
  }

  /** Geçen süre (dakika) → "az önce" / "5 dakika önce" / "2 saat önce" / "dün" */
  function ago(minutes) {
    const value = Math.max(0, minutes);
    if (value < 1) return text('time.justNow');
    if (value < MINUTES_PER_HOUR) return relativeFormat.format(-Math.round(value), 'minute');
    const hours = value / MINUTES_PER_HOUR;
    if (hours < HOURS_PER_DAY) return relativeFormat.format(-Math.round(hours), 'hour');
    return relativeFormat.format(-Math.round(hours / HOURS_PER_DAY), 'day');
  }

  /** İki zaman damgası arasındaki fark (dakika). */
  function minutesBetween(fromMs, toMs) {
    return (toMs - fromMs) / MS_PER_MINUTE;
  }

  AR.Strings = Object.freeze({
    data: STRINGS,
    text: text,
    list: list,
    has: has,
    extend: extend,
    missingKeys: missingKeys,
    format: Object.freeze({
      number: number,
      percent: percent,
      km: km,
      minutesRange: minutesRange,
      clock: clock,
      dateTime: dateTime,
      ago: ago,
      minutesBetween: minutesBetween
    })
  });
})(window.AcilRadar = window.AcilRadar || {});

/* =============================================================================
 * DOSYA ADI    : js/strings.js
 * NE İŞE YARAR : Arayüzde görünen TÜM Türkçe metinler burada, tek bir STRINGS
 *                nesnesinde durur. Ayrıca metinleri ve sayı/tarih biçimlerini
 *                üreten küçük yardımcılar burada tanımlıdır.
 * NEYİ ALIR    : window.AcilRadar.config (yalnızca LOCALE için).
 * NEYİ VERİR   : AcilRadar.STRINGS   → ham metin nesnesi
 *                AcilRadar.text()    → text('card.totalLabel') ya da
 *                                      text('unit.minutesRange', { min: 10, max: 20 })
 *                AcilRadar.textList()→ dizi biçimindeki metinler (ör. belirti listesi)
 *                AcilRadar.format    → tr-TR sayı, yüzde, saat, "5 dakika önce" biçimleri
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Bir cümleyi değiştirmek: aşağıda metni bulun, tırnak içini değiştirin. Bitti.
 *     Süslü parantezli yerler ({name}, {min} gibi) kod tarafından doldurulur;
 *     cümleyi değiştirirken bu parçaları silmeyin, istediğiniz yere taşıyabilirsiniz.
 *   - Yeni metin eklemek: buraya yeni bir anahtar ekleyin, kodda text('anahtar') ile çağırın.
 *   - HTML'deki sabit metinler de buradan gelir: index.html'de data-text="anahtar".
 * NOT: Yazımda TDK imlası esas alınmıştır (kesme işareti: ’, aralık çizgisi: –).
 * ========================================================================== */
(function (AR) {
  'use strict';

  const STRINGS = {
    app: {
      name: 'AcilRadar',
      documentTitle: 'AcilRadar · Acil servis yoğunluk ve süre tahmini',
      metaDescription: 'Gebze ve çevresindeki acil servislerin tahmini yoğunluğunu ve yol, kayıt, bekleme dâhil toplam süresini karşılaştırın.',
      tagline: 'Acil servis süre tahmini'
    },

    a11y: {
      skipLink: 'İçeriğe atla',
      newTab: '(yeni sekmede açılır)',
      loading: 'Hastane bilgileri yükleniyor…'
    },

    banner: {
      simulationTag: 'SİMÜLASYON',
      simulation: 'Gerçek veri değildir. Hastane adları ve sayılar örnek amaçlıdır.',
      offline: 'İnternet bağlantınız yok. Gösterilen bilgiler son bağlantıdaki verilerdir; bağlantı gelince otomatik yenilenir.'
    },

    header: {
      homeLabel: 'AcilRadar, sayfanın başına git',
      settingsToggle: 'Görünüm',
      settingsToggleLabel: 'Görünüm ayarları: yazı boyutu ve tema',
      textSizeLabel: 'Yazı boyutu',
      textSmall: 'A−',
      textSmallLabel: 'Küçük yazı',
      textNormal: 'A',
      textNormalLabel: 'Normal yazı',
      textLarge: 'A+',
      textLargeLabel: 'Büyük yazı',
      themeLabel: 'Tema',
      themeAuto: 'Otomatik',
      themeLight: 'Açık',
      themeDark: 'Koyu',
      call: '112',
      callLabel: '112 Acil Çağrı Merkezini ara'
    },

    hero: {
      eyebrow: 'Gebze ve çevresi',
      title: 'Yakınınızdaki acil servislerin tahmini yoğunluğunu ve toplam süresini tek bakışta karşılaştırın.',
      lead: 'AcilRadar; yol, kayıt ve bekleme sürelerini birlikte tahmin eder. Sıralama tarafsızdır: ücretli ya da öne çıkarılmış hastane yoktur.'
    },

    stats: {
      label: 'Özet',
      hospitals: 'Hastane sayısı',
      hospitalsNote: 'Bu bölgede veri gelen',
      leastCrowded: 'En az yoğun',
      nearest: 'En yakın',
      none: '—',
      noneNote: 'Güncel veri yok',
      occupancyNote: 'Doluluk {value}',
      distanceNote: 'Yaklaşık {value}'
    },

    disclaimer: {
      triage: 'Muayene sırasını triyaj belirler. Bu bilgiler tahminidir. Tıbbi karar aracı değildir.'
    },

    emergency: {
      title: 'Hayati tehlike varsa beklemeyin, 112’yi arayın',
      toggle: 'Hangi durumlarda 112 aranmalı?',
      intro: 'Aşağıdaki durumlardan biri varsa hastaneye kendiniz gitmeye çalışmayın; hemen 112’yi arayın:',
      symptoms: [
        'Göğüs ağrısı, göğüste baskı veya sıkışma hissi',
        'Ani nefes darlığı ya da nefes alamama',
        'Bilinç kaybı, bayılma veya uyandırılamama',
        'Yüzde kayma, kol ya da bacakta ani güçsüzlük, konuşma bozukluğu',
        'Durdurulamayan kanama',
        'Trafik kazası, yüksekten düşme veya ciddi yaralanma',
        'Nöbet geçirme',
        'Zehirlenme ya da yüzde ve dilde şişmeyle gelen ağır alerjik tepki'
      ],
      call: '112’yi ara',
      note: 'Emin değilseniz 112’yi arayıp danışabilirsiniz.'
    },

    controls: {
      title: 'Seçimleriniz',
      locationLegend: 'Konum',
      districtLabel: 'İlçe',
      deviceOption: 'Cihaz konumum',
      useLocation: 'Konumumu kullan',
      locationLocating: 'Konumunuz alınıyor…',
      locationDevice: 'Cihazınızın konumu kullanılıyor. Konumunuz yalnızca bu tarayıcıda kalır; hiçbir yere gönderilmez.',
      locationDistrict: 'Mesafeler {district} ilçe merkezine göre hesaplanıyor.',
      locationDenied: 'Konum izni verilmedi. Sorun değil; listeden ilçenizi seçebilirsiniz.',
      locationUnavailable: 'Konumunuz şu anda belirlenemedi. Listeden ilçenizi seçebilirsiniz.',
      locationTimeout: 'Konum alma zaman aşımına uğradı. Tekrar deneyebilir ya da ilçenizi seçebilirsiniz.',
      locationUnsupported: 'Tarayıcınız konum özelliğini desteklemiyor. Listeden ilçenizi seçebilirsiniz.',
      timeLegend: 'Ne zaman?',
      timeForecastNote: 'İleri saatler için gösterilen bilgiler öngörüdür.',
      filtersLegend: 'Filtreler',
      searchLabel: 'Hastane ara',
      searchPlaceholder: 'Hastane adı veya ilçe',
      childOnly: 'Çocuk acili olanlar',
      crowdingLabel: 'Yoğunluk',
      favoritesOnly: 'Sık kullandıklarım',
      clearFilters: 'Filtreleri temizle',
      sortLegend: 'Sıralama',
      sortNote: 'Sıralama tarafsızdır; ücretli veya öne çıkarılmış sıralama yoktur.',
      refreshLegend: 'Güncelleme',
      refreshLabel: 'Otomatik yenileme',
      refreshNow: 'Şimdi yenile'
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
      stale: 'Veri güncel değil'
    },

    refresh: {
      off: 'Kapalı',
      seconds: '{value} saniyede bir',
      minutes: '{value} dakikada bir'
    },

    status: {
      lastUpdated: 'Son güncelleme: {time} ({relative})',
      neverUpdated: 'Henüz güncellenmedi',
      refreshing: 'Güncelleniyor…',
      resultCount: '{count} hastane listeleniyor. Sıralama: {sort}.',
      resultCountZero: 'Seçimlerinize uyan hastane yok.'
    },

    results: {
      title: 'Acil servisler',
      listLabel: 'Hastane listesi'
    },

    recommend: {
      title: 'Seçimlerinize göre tahmini toplam süresi en kısa olan',
      totalLabel: 'Tahmini toplam süre',
      basis: 'Yol, kayıt ve bekleme sürelerinin toplamıdır. Bu bir tavsiye değil, tahmindir.',
      none: 'Güncel veri olmadığı için şu anda öneri gösterilemiyor.'
    },

    card: {
      rankLabel: 'Sıra {rank}',
      metaSeparator: ' · ',
      childER: 'Çocuk acili',
      simulation: 'SİMÜLASYON',
      forecast: 'Öngörü',
      occupancy: 'Doluluk',
      totalLabel: 'Tahmini toplam süre',
      totalNote: 'Yol + kayıt + bekleme',
      tileTravel: 'Yol',
      tileWait: 'Bekleme',
      tilePhysicians: 'Hekim',
      unknown: 'Bilinmiyor',
      travelMeta: '{range} yol',
      staleTitle: 'Veri güncel değil',
      staleBody: 'Son güncelleme {relative}. Yanıltmamak için süre ve yoğunluk bilgisi gösterilmiyor.',
      staleUnknown: 'Güncelleme zamanı bilinmiyor. Yanıltmamak için süre ve yoğunluk bilgisi gösterilmiyor.',
      detailsToggle: 'Ayrıntılar',
      updatedAgo: 'Güncellendi: {relative}',
      directions: 'Yol tarifi al',
      showOnMap: 'Haritada göster',
      share: 'Paylaş',
      favoriteAdd: 'Sık kullandıklarıma ekle: {name}',
      favoriteRemove: 'Sık kullandıklarımdan çıkar: {name}',
      directionsLabel: '{name} için yol tarifi al (harici harita, yeni sekmede açılır)',
      shareLabel: '{name} bilgisini paylaş',
      showOnMapLabel: '{name} hastanesini haritada göster',
      detailsLabel: '{name} ayrıntıları'
    },

    details: {
      greenWaiting: 'Yeşil alanda bekleyen',
      yellowWaiting: 'Sarı alanda bekleyen',
      greenWait: 'Yeşil alan tahmini bekleme',
      yellowWait: 'Sarı alan tahmini bekleme',
      physicians: 'Görevdeki hekim',
      registration: 'Kayıt için eklenen süre',
      distance: 'Tahmini yol mesafesi',
      updated: 'Son güncelleme',
      source: 'Veri kaynağı',
      patients: '{count} hasta',
      updatedValue: '{time} ({relative})'
    },

    source: {
      simulated: 'Simülasyon',
      hospital: 'Hastane bildirimi',
      official: 'Resmî kaynak',
      unknown: 'Belirtilmemiş'
    },

    share: {
      title: '{name} · AcilRadar',
      text: '{name} ({district}) acil servisi için tahmini toplam süre: {range}. Bu bilgiler tahminidir; muayene sırasını triyaj belirler.',
      textStale: '{name} ({district}) acil servisi. Şu anda güncel süre bilgisi yok.',
      copied: 'Bağlantı panoya kopyalandı.',
      failed: 'Paylaşılamadı. Sayfa adresini adres çubuğundan kopyalayabilirsiniz.'
    },

    favorite: {
      added: '{name} sık kullandıklarınıza eklendi.',
      removed: '{name} sık kullandıklarınızdan çıkarıldı.'
    },

    map: {
      title: 'Harita',
      label: 'Hastanelerin haritası',
      legendTitle: 'Renk açıklaması',
      legendOrigin: 'Hesaplamada kullanılan nokta',
      showAll: 'Hepsini göster',
      unavailable: 'Harita şu anda yüklenemedi. Liste ve süre bilgileri kullanılabilir.',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar',
      markerLabel: '{rank}. {name}: {status}',
      popupTotal: 'Tahmini toplam: {range}',
      popupGoToCard: 'Karta git',
      originDevice: 'Cihaz konumunuz',
      originDistrict: '{district} ilçe merkezi'
    },

    empty: {
      noDataTitle: 'Gösterilecek hastane bulunamadı',
      noDataBody: 'Sunucu bu seçim için hastane bilgisi göndermedi. Biraz sonra tekrar deneyin.',
      noMatchTitle: 'Seçimlerinize uyan hastane yok',
      noMatchBody: 'Filtreleri gevşetmeyi ya da temizlemeyi deneyin.'
    },

    error: {
      title: 'Bilgiler alınamadı',
      retry: 'Tekrar dene',
      keptOld: 'Son yenileme başarısız oldu; önceki bilgiler gösteriliyor.',
      network: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
      timeout: 'Sunucu zamanında yanıt vermedi. Biraz sonra tekrar deneyin.',
      server: 'Sunucu bir hata bildirdi (kod {status}).',
      serverDetail: 'Sunucu iletisi: {message}',
      invalidJson: 'Sunucudan gelen yanıt okunamadı (JSON biçiminde değil).',
      invalidShape: 'Sunucudan gelen yanıt beklenen biçimde değil.',
      noValidHospital: 'Sunucudan gelen hastane kayıtlarının hiçbiri geçerli değil.',
      mock: 'Simülasyon sunucusu bir hata döndürdü (deneme senaryosu).'
    },

    // Yalnızca geliştirici konsolunda görünen iletiler (kullanıcı görmez).
    dev: {
      skippedHospital: '[AcilRadar] {index}. hastane kaydı ({id}) atlandı. Eksik veya hatalı alanlar: {fields}',
      missingHospitals: '[AcilRadar] Yanıtta "hospitals" dizisi yok. Beklenen biçim için README.md › "Arka uca bağlama" bölümüne bakın.',
      badMeta: '[AcilRadar] "meta" alanı nesne değil; yok sayıldı.',
      missingKey: '[AcilRadar] js/strings.js içinde olmayan metin anahtarı: {key}',
      leafletMissing: '[AcilRadar] Leaflet yüklenemedi; harita gösterilmiyor.'
    },

    formula: {
      title: 'Süre nasıl hesaplanıyor?',
      intro: 'Tahmini toplam süre üç parçanın toplamıdır ve her zaman bir aralık olarak gösterilir:',
      travel: 'Yol: Seçtiğiniz nokta ile hastane arasındaki kuş uçuşu mesafe {roadFactor} ile çarpılarak yol mesafesi tahmin edilir. Ortalama {speed} km/sa hızla süre bulunur; trafik payı için üst sınır bunun {traffic} katıdır. En az {minTravel} dk. kabul edilir.',
      registration: 'Kayıt: Hasta kabul işlemleri için {min}–{max} dk. eklenir.',
      wait: 'Bekleme: Hastanenin bildirdiği yeşil alan tahmini bekleme aralığı kullanılır. Sarı ve kırmızı alanda sırayı triyaj belirler.',
      total: 'Toplam = Yol + Kayıt + Bekleme. Alt sınırlar kendi aralarında, üst sınırlar kendi aralarında toplanır.',
      stale: 'Bir hastanenin verisi {minutes} dakikadan eskiyse o hastanenin süre ve yoğunluk bilgisi gizlenir.',
      crowding: 'Yoğunluk düzeyini (az, orta, çok) veri kaynağı, acil servisin doluluk oranına göre belirler.'
    },

    howto: {
      title: 'Nasıl kullanılır?',
      step1Title: 'Konumunuzu seçin',
      step1Body: 'İlçenizi listeden seçin ya da “Konumumu kullan” düğmesine basın.',
      step2Title: 'Zamanı ve filtreleri belirleyin',
      step2Body: 'Şimdi, 2 saat sonra ya da akşam için tahminleri görün; çocuk acili veya yoğunluğa göre süzün.',
      step3Title: 'Karşılaştırın ve yola çıkın',
      step3Body: 'Kartlardaki tahmini toplam süreye bakın, “Yol tarifi al” ile harita uygulamanızı açın.'
    },

    privacy: {
      title: 'Gizlilik',
      location: 'Konumunuz yalnızca bu tarayıcıda, mesafe hesabı için kullanılır; sunucuya gönderilmez ve saklanmaz.',
      cookies: 'Çerez kullanılmaz. Reklam, analitik veya izleme aracı yoktur.',
      storedTitle: 'Yalnızca şu tercihler bu tarayıcıda saklanır:',
      stored: [
        'Yazı boyutu',
        'Tema',
        'Son seçtiğiniz ilçe',
        'Sık kullandığınız hastanelerin kimlikleri'
      ],
      tiles: 'Harita görselleri OpenStreetMap sunucularından yüklenir; bu sırada tarayıcınız, gösterilen harita bölgesi için standart bir istek gönderir.',
      clear: 'Saklanan tercihlerimi sil',
      cleared: 'Saklanan tercihleriniz silindi.'
    },

    legal: {
      title: 'Sorumluluk reddi',
      items: [
        'AcilRadar tıbbi karar aracı değildir; teşhis veya tedavi önerisi sunmaz.',
        'Gösterilen yoğunluk ve süreler tahminidir; gerçek durum farklı olabilir. Muayene sırasını triyaj belirler.',
        'AcilRadar herhangi bir resmî kurum veya hastaneyle bağlantılı değildir. Hastaneler reklam amacıyla listelenmez.',
        'Hayati tehlike durumunda beklemeyin, 112’yi arayın.'
      ]
    },

    footer: {
      copyright: '© {year} AcilRadar',
      mapData: 'Harita verisi: OpenStreetMap katkıda bulunanlar',
      backToTop: 'Başa dön'
    },

    unit: {
      km: '{value} km',
      minutes: '{value} dk.',
      minutesRange: '{min}–{max} dk.'
    }
  };

  /* ---- Metin yardımcıları ------------------------------------------------ */

  // Eksik anahtarlar burada birikir; tests/smoke-test.html bunu denetler.
  const missingKeys = new Set();

  /** 'card.totalLabel' gibi noktalı yolu STRINGS içinde arar. */
  function lookup(key) {
    return String(key).split('.').reduce(function (node, part) {
      return node != null && Object.prototype.hasOwnProperty.call(node, part) ? node[part] : undefined;
    }, STRINGS);
  }

  function reportMissing(key) {
    if (missingKeys.has(key)) return;
    missingKeys.add(key);
    const template = lookup('dev.missingKey');
    console.warn(typeof template === 'string' ? template.replace('{key}', key) : key);
  }

  /**
   * Metni döndürür; {ad} yer tutucularını params ile doldurur.
   * Anahtar yoksa anahtarın kendisini döndürür (sayfa bozulmasın diye) ve konsola yazar.
   * @param {string} key
   * @param {Object<string, (string|number)>} [params]
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

  /** Dizi biçimindeki metinleri döndürür (ör. 'emergency.symptoms'). */
  function textList(key) {
    const list = lookup(key);
    if (!Array.isArray(list)) {
      reportMissing(key);
      return [];
    }
    return list.slice();
  }

  /** Anahtar var mı? (Test sayfası kullanır.) */
  function hasText(key) {
    const value = lookup(key);
    return typeof value === 'string' || Array.isArray(value);
  }

  /* ---- Biçimlendirme (Intl, tr-TR) ---------------------------------------- */

  const LOCALE = (AR.config && AR.config.LOCALE) || 'tr-TR';
  const SECONDS_PER_MINUTE = 60;
  const MINUTES_PER_HOUR = 60;
  const HOURS_PER_DAY = 24;
  const MS_PER_SECOND = 1000;

  const numberFormatters = {};
  const percentFormatter = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 });
  const timeFormatter = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' });
  const relativeFormatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

  function number(value, maxFractionDigits) {
    const digits = maxFractionDigits || 0;
    if (!numberFormatters[digits]) {
      numberFormatters[digits] = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: digits });
    }
    return numberFormatters[digits].format(value);
  }

  /** 62 → "%62" */
  function percent(value) {
    return percentFormatter.format(value / 100);
  }

  /** 3.42 → "3,4 km" */
  function km(value) {
    return text('unit.km', { value: number(value, 1) });
  }

  /** [10, 20] → "10–20 dk." ; [10, 10] → "10 dk." */
  function minutesRange(range) {
    if (!range) return text('card.unknown');
    if (range[0] === range[1]) return text('unit.minutes', { value: number(range[0]) });
    return text('unit.minutesRange', { min: number(range[0]), max: number(range[1]) });
  }

  /** Date → "13:35" */
  function clock(date) {
    return timeFormatter.format(date);
  }

  /** Date → "5 dakika önce" / "2 saat önce" / "az önce" */
  function relative(date, nowMs) {
    const diffSeconds = Math.round((date.getTime() - nowMs) / MS_PER_SECOND);
    const absSeconds = Math.abs(diffSeconds);
    if (absSeconds < SECONDS_PER_MINUTE) return text('time.justNow');
    const minutes = Math.round(diffSeconds / SECONDS_PER_MINUTE);
    if (Math.abs(minutes) < MINUTES_PER_HOUR) return relativeFormatter.format(minutes, 'minute');
    const hours = Math.round(minutes / MINUTES_PER_HOUR);
    if (Math.abs(hours) < HOURS_PER_DAY) return relativeFormatter.format(hours, 'hour');
    return relativeFormatter.format(Math.round(hours / HOURS_PER_DAY), 'day');
  }

  AR.STRINGS = STRINGS;
  AR.text = text;
  AR.textList = textList;
  AR.hasText = hasText;
  AR.missingTextKeys = missingKeys;
  AR.format = Object.freeze({
    number: number,
    percent: percent,
    km: km,
    minutesRange: minutesRange,
    clock: clock,
    relative: relative
  });
})(window.AcilRadar = window.AcilRadar || {});

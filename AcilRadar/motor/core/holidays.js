/* =============================================================================
 * motor/core/holidays.js
 * NE İŞE YARAR : Resmî tatil ve dini bayram takvimi (VERİ dosyası). Kod içermez.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: yeni yıl eklemek → RELIGIOUS içine yıl ekleyin,
 *   "verification" ve "sources" alanlarını doldurun.
 *
 * DOĞRULAMA DÜZEYLERİ:
 *   'law'       : kanunla sabit (2429 sayılı Ulusal Bayram ve Genel Tatiller Hakkında Kanun)
 *   'primary'   : Diyanet İşleri Başkanlığı / Cumhurbaşkanlığı resmî ilanından doğrudan
 *   'secondary' : resmî takvimi aktaran birden çok haber kaynağı tutarlı (birincil kaynak
 *                 bu çalışma ortamından erişilemedi — diyanet.gov.tr çözümlenemedi)
 *   Motor, config'te izin verilen en düşük düzeyin altındaki kayıtları UYGULAMAZ.
 *
 * UYARI: Dini bayram tarihleri yayından önce diyanet.gov.tr "Dini Günler Takvimi" ile
 *        karşılaştırılmalıdır. Takvimde olmayan yıllar için dini bayram etkisi uygulanmaz.
 * NOT: Hükümetin ek idari izin kararları (ör. "9 gün tatil") burada YOKTUR; resmî karar
 *      çıktıkça ayrı satır olarak eklenmelidir.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.AcilRadarMotor = root.AcilRadarMotor || {}).holidays = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SECONDARY_2025 = [
    'https://www.ntv.com.tr/turkiye/galeri-2025-resmi-tatiller-takvimi-2025te-kac-gun-tatil-var,LWWbyIrRs0C756jIhf3v4A',
    'https://www.istiklal.com.tr/2025-kurban-bayrami-ve-ramazan-bayrami-ne-zaman'
  ];
  const SECONDARY_2026 = [
    'https://www.milliyet.com.tr/haberleri/2026-bayram-tarihleri',
    'https://www.gazetevatan.com/galeri/bugun-ramazanin-kacinci-gunu-2026-ramazan-bayrami-ve-kurban-bayrami-ne-zaman-diyanet-takvimi-2353004'
  ];
  const SECONDARY_2027 = [
    'https://www.evrensel.net/haber/5997565/diyanet-2027-takvimini-duyurdu-ramazan-ne-zaman-basliyor',
    'https://www.cnnturk.com/turkiye/2027-resmi-tatiller-takvimi-dini-bayramlar-resmi-tatil-gunler-ne-zaman-2027-ramazan-ve-kurban-bayrami-tarihleri-3447415'
  ];

  return Object.freeze({
    // Her yıl aynı (AA-GG). halfDay: o gün 13:00'ten itibaren tatil.
    FIXED: Object.freeze([
      { monthDay: '01-01', name: 'Yılbaşı', verification: 'law' },
      { monthDay: '04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı', verification: 'law' },
      { monthDay: '05-01', name: 'Emek ve Dayanışma Günü', verification: 'law' },
      { monthDay: '05-19', name: 'Atatürk’ü Anma, Gençlik ve Spor Bayramı', verification: 'law' },
      { monthDay: '07-15', name: 'Demokrasi ve Millî Birlik Günü', verification: 'law' },
      { monthDay: '08-30', name: 'Zafer Bayramı', verification: 'law' },
      { monthDay: '10-28', name: 'Cumhuriyet Bayramı arifesi', halfDay: true, verification: 'law' },
      { monthDay: '10-29', name: 'Cumhuriyet Bayramı', verification: 'law' }
    ]),

    // Dini bayramlar: arife (yarım gün) + bayram günleri (YYYY-AA-GG).
    RELIGIOUS: Object.freeze({
      2025: Object.freeze({
        verification: 'secondary',
        sources: SECONDARY_2025,
        feasts: Object.freeze([
          { name: 'Ramazan Bayramı', arife: '2025-03-29', days: ['2025-03-30', '2025-03-31', '2025-04-01'] },
          { name: 'Kurban Bayramı', arife: '2025-06-05', days: ['2025-06-06', '2025-06-07', '2025-06-08', '2025-06-09'] }
        ])
      }),
      2026: Object.freeze({
        verification: 'secondary',
        sources: SECONDARY_2026,
        feasts: Object.freeze([
          { name: 'Ramazan Bayramı', arife: '2026-03-19', days: ['2026-03-20', '2026-03-21', '2026-03-22'] },
          { name: 'Kurban Bayramı', arife: '2026-05-26', days: ['2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30'] }
        ])
      }),
      2027: Object.freeze({
        verification: 'secondary',
        sources: SECONDARY_2027,
        feasts: Object.freeze([
          { name: 'Ramazan Bayramı', arife: '2027-03-08', days: ['2027-03-09', '2027-03-10', '2027-03-11'] },
          { name: 'Kurban Bayramı', arife: '2027-05-15', days: ['2027-05-16', '2027-05-17', '2027-05-18', '2027-05-19'] }
        ])
      })
    }),

    // Okul dönemleri (MEB çalışma takvimi). Doğrulanmış kayıt EKLENMEDİ: bu nedenle
    // "okul dönemi" bayrağı şimdilik bilinmiyor (null) döner ve modelde kullanılmaz.
    SCHOOL_TERMS: Object.freeze([])
  });
});

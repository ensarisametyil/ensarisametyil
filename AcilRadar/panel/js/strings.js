/* =============================================================================
 * panel/js/strings.js
 * NE İŞE YARAR : Hastane panelinde görünen TÜM Türkçe metinler. Sitenin metin
 *                sistemine "panel" grubu olarak eklenir; kullanımı aynıdır:
 *                text('panel.login.title'), text('panel.validation.max', { max: 100 })
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: bir cümleyi değiştirmek için metni bulun,
 *                tırnak içini değiştirin. {ad} parçalarını silmeyin.
 * NOT: Panel metinleri sitenin js/strings.js dosyasına eklenmedi; böylece halka açık
 *      sitenin indirdiği dosya büyümez. Ortak metinler (yoğunluk adları, birimler)
 *      js/strings.js'ten kullanılır.
 * ========================================================================== */
(function (AR) {
  'use strict';

  AR.Strings.extend('panel', {
    app: {
      name: 'AcilRadar Panel',
      documentTitle: '{page} · AcilRadar Panel',
      tagline: 'Hastane veri paneli'
    },

    a11y: {
      skipLink: 'İçeriğe atla',
      mainNav: 'Panel menüsü',
      loading: 'Yükleniyor…'
    },

    banner: {
      mockTag: 'ÖRNEK SUNUCU',
      mock: 'Panel örnek verilerle çalışıyor; girilen bilgiler gerçek sisteme kaydedilmez.'
    },

    nav: {
      dashboard: 'Özet',
      entry: 'Veri girişi',
      history: 'Geçmiş kayıtlar',
      users: 'Kullanıcılar',
      audit: 'Denetim kaydı'
    },

    header: {
      homeLabel: 'AcilRadar Panel, özet sayfasına git',
      signedInAs: '{name} · {role}',
      logout: 'Çıkış yap',
      publicSite: 'Halka açık site',
      call: '112’yi Ara',
      callLabel: '112 Acil Çağrı Merkezini ara'
    },

    roles: {
      hospital_staff: 'Hastane personeli',
      hospital_admin: 'Hastane yöneticisi',
      province_viewer: 'İl görüntüleyici',
      system_admin: 'Sistem yöneticisi'
    },

    login: {
      title: 'Panele giriş',
      lead: 'Bu panel yalnız yetkili personel içindir. Acil servis verileri buradan girilir ve izlenir.',
      email: 'E-posta adresi',
      password: 'Parola',
      showPassword: 'Parolayı göster',
      submit: 'Giriş yap',
      forgot: 'Parolamı unuttum',
      invalid: 'E-posta adresi ya da parola hatalı.',
      locked: 'Çok fazla deneme yapıldı. Lütfen {seconds} saniye sonra tekrar deneyin.',
      inactive: 'Hesabınız etkin değil. Lütfen kurum yöneticinize başvurun.',
      sessionExpired: 'Oturumunuz sona erdi. Lütfen yeniden giriş yapın.',
      loggedOut: 'Çıkış yaptınız.',
      mockTitle: 'Örnek hesaplar (yalnız örnek sunucuda)',
      mockPassword: 'Tüm örnek hesapların parolası: {password}'
    },

    forgot: {
      title: 'Parolamı unuttum',
      lead: 'Parola sıfırlama henüz çevrim içi yapılamıyor.',
      body: 'Parolanızı yenilemek için kurum yöneticinize ya da sistem yöneticisine başvurun.',
      submit: 'Sıfırlama bağlantısı gönder',
      disabled: 'Bu özellik henüz etkin değil.',
      back: 'Giriş ekranına dön'
    },

    twoFactor: {
      title: 'İki adımlı doğrulama',
      lead: 'Etkinleştirildiğinde, girişten sonra telefonunuzdaki uygulamanın ürettiği kod bu ekranda istenecek.',
      code: 'Doğrulama kodu',
      submit: 'Doğrula',
      disabled: 'İki adımlı doğrulama henüz etkin değil.'
    },

    session: {
      warning: 'Oturumunuz {seconds} saniye içinde sona erecek.',
      extend: 'Oturumu uzat',
      extended: 'Oturum uzatıldı.'
    },

    common: {
      hospital: 'Hastane',
      selectHospital: 'Hastane seçin',
      retry: 'Tekrar dene',
      empty: 'Kayıt bulunamadı.',
      exportCsv: 'CSV olarak indir',
      exported: '{count} satır indirildi.',
      exportLimited: 'En fazla {max} satır indirilebilir; ilk {max} satır indirildi.',
      from: 'Başlangıç tarihi',
      to: 'Bitiş tarihi',
      filter: 'Süz',
      clearFilter: 'Süzgeci temizle',
      prev: 'Önceki sayfa',
      next: 'Sonraki sayfa',
      pageOf: 'Sayfa {page} / {pages}',
      totalRows: 'Toplam {count} kayıt',
      active: 'Etkin',
      inactive: 'Pasif',
      never: 'Hiç',
      none: '—',
      forbidden: 'Bu sayfayı görüntüleme yetkiniz yok.',
      notFound: 'Aradığınız sayfa bulunamadı.'
    },

    errors: {
      summaryTitle: 'Lütfen işaretli alanları düzeltin:',
      codes: {
        NETWORK: 'Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.',
        TIMEOUT: 'Sunucu zamanında yanıt vermedi. Lütfen tekrar deneyin.',
        OFFLINE: 'İnternet bağlantısı yok. Bağlantı gelince tekrar deneyin.',
        RATE_LIMITED: 'Kısa sürede çok sayıda istek yapıldı. Lütfen biraz sonra tekrar deneyin.',
        BAD_REQUEST: 'İstek anlaşılamadı. Lütfen sayfayı yenileyin.',
        UNAUTHORIZED: 'Oturumunuz sona erdi. Lütfen yeniden giriş yapın.',
        FORBIDDEN: 'Bu işlem için yetkiniz yok.',
        NOT_FOUND: 'İstenen kayıt bulunamadı.',
        CONFLICT: 'Kayıt başka bir işlemle çakıştı. Lütfen sayfayı yenileyip tekrar deneyin.',
        VALIDATION: 'Gönderilen bilgiler kabul edilmedi. Lütfen işaretli alanları düzeltin.',
        UNAVAILABLE: 'Hizmet şu an kullanılamıyor. Lütfen biraz sonra tekrar deneyin.',
        INTERNAL: 'Sunucuda bir sorun oluştu. Lütfen biraz sonra tekrar deneyin.',
        INVALID_RESPONSE: 'Sunucudan gelen bilgiler okunamadı. Lütfen biraz sonra tekrar deneyin.',
        UNKNOWN: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'
      }
    },

    validation: {
      required: 'Bu alan zorunludur.',
      integer: 'Tam sayı girin (ör. 12).',
      min: 'En az {min} olabilir.',
      max: 'En çok {max} olabilir.',
      rangeOrder: 'En az değer, en çok değerden büyük olamaz.',
      outOfRange: 'İzin verilen aralığın dışında.',
      rangeOrderDate: 'Başlangıç tarihi, bitiş tarihinden sonra olamaz.',
      email: 'Geçerli bir e-posta adresi girin.',
      tooLong: 'En çok {max} karakter olabilir.',
      roleNotAllowed: 'Bu rolü atama yetkiniz yok.',
      hospitalRequired: 'Bu rol için hastane seçilmelidir.',
      emailTaken: 'Bu e-posta adresiyle bir kullanıcı zaten var.',
      generic: 'Bu değer kabul edilmedi.'
    },

    dashboard: {
      title: 'Özet',
      lead: 'Hastanenizin panelde ve halka açık sitede görünen son durumu.',
      allTitle: 'Tüm hastaneler',
      allLead: 'Her hastanenin son veri girişi. Bilgi {minutes} dakikadan eskiyse halka açık sitede “güncel bilgi yok” görünür.',
      lastUpdate: 'Son veri girişi',
      noRecord: 'Bu hastane için henüz veri girilmedi.',
      stale: 'Son giriş {age} yapıldı. Halka açık sitede bu hastanenin bilgisi “güncel bilgi yok” olarak görünüyor.',
      fresh: 'Bilgiler halka açık sitede güncel görünüyor.',
      occupancy: 'Doluluk',
      goEntry: 'Veri gir',
      goHistory: 'Geçmiş kayıtlar',
      statusFresh: 'Güncel',
      statusStale: 'Güncel değil',
      statusNone: 'Veri yok',
      columns: {
        hospital: 'Hastane',
        district: 'İlçe',
        lastUpdate: 'Son giriş',
        occupancy: 'Doluluk',
        status: 'Durum',
        actions: 'İşlem'
      }
    },

    entry: {
      title: 'Veri girişi',
      lead: 'Acil servisin şu anki durumunu girin. Kaydedilen bilgiler halka açık sitede tahmin olarak gösterilir.',
      privacy: 'Bu formda yalnız toplu sayılar girilir. Hasta adı, T.C. kimlik numarası gibi kişisel veri girilmez.',
      occupancy: 'Doluluk oranı (%)',
      occupancyHint: '0 ile 100 arasında tam sayı.',
      nonUrgentWaiting: 'Acil olmayan başvurularda bekleyen kişi sayısı',
      urgentWaiting: 'Daha acil başvurularda bekleyen kişi sayısı',
      physicians: 'Görevdeki hekim sayısı',
      countHint: 'Tam sayı.',
      nonUrgentWait: 'Acil olmayan başvurular için tahmini bekleme (dakika)',
      urgentWait: 'Daha acil başvurular için tahmini bekleme (dakika)',
      min: 'En az',
      max: 'En çok',
      rangeHint: 'Dakika olarak; en az değer, en çok değerden büyük olamaz.',
      copyLast: 'Son kaydı forma kopyala',
      reset: 'Formu temizle',
      submit: 'Kaydet',
      success: 'Kayıt eklendi ({time}). Halka açık sitede bir sonraki yenilemede görünür.',
      readOnly: 'Bu hastane için veri girme yetkiniz yok.'
    },

    history: {
      title: 'Geçmiş kayıtlar',
      lead: 'Girilen kayıtlar, en yenisi üstte.',
      columns: {
        time: 'Kayıt zamanı',
        occupancy: 'Doluluk',
        crowding: 'Yoğunluk',
        waiting: 'Bekleyen (acil olmayan / daha acil)',
        physicians: 'Hekim',
        waits: 'Tahmini bekleme (acil olmayan / daha acil)',
        by: 'Giren'
      },
      pair: '{a} / {b}',
      csvName: 'kayitlar'
    },

    users: {
      title: 'Kullanıcılar',
      lead: 'Panel kullanıcıları ve rolleri.',
      addTitle: 'Yeni kullanıcı',
      name: 'Ad soyad',
      email: 'E-posta adresi',
      role: 'Rol',
      hospital: 'Hastane',
      add: 'Kullanıcıyı ekle',
      added: '{name} eklendi.',
      updated: '{name} güncellendi.',
      deactivate: 'Pasif yap',
      activate: 'Etkinleştir',
      roleSelectLabel: '{name} için rol',
      saveRole: 'Rolü kaydet',
      deactivateLabel: '{name} hesabını pasif yap',
      activateLabel: '{name} hesabını etkinleştir',
      self: 'Kendi hesabınız',
      columns: {
        name: 'Ad soyad',
        email: 'E-posta',
        role: 'Rol',
        hospital: 'Hastane',
        status: 'Durum',
        lastLogin: 'Son giriş',
        actions: 'İşlem'
      }
    },

    audit: {
      title: 'Denetim kaydı',
      lead: 'Panelde yapılan işlemler: kim, ne zaman, neyi değiştirdi.',
      columns: {
        time: 'Zaman',
        actor: 'Kullanıcı',
        action: 'İşlem',
        target: 'Hedef',
        changes: 'Değişiklikler'
      },
      // Sunucudaki işlem kodu → anahtar: record.create → recordCreate (bkz. screens/audit.js)
      actions: {
        recordCreate: 'Veri girişi',
        userCreate: 'Kullanıcı eklendi',
        userUpdate: 'Kullanıcı güncellendi',
        authLogin: 'Giriş',
        authLogout: 'Çıkış'
      },
      change: '{field}: {from} → {to}',
      unknownAction: 'Diğer işlem',
      csvName: 'denetim'
    },

    // Denetim kaydında ve CSV'de alan adlarının Türkçe karşılıkları.
    fields: {
      occupancyPercent: 'Doluluk',
      nonUrgentWaiting: 'Acil olmayan bekleyen',
      urgentWaiting: 'Daha acil bekleyen',
      activePhysicians: 'Hekim',
      nonUrgentWaitMinutes: 'Acil olmayan bekleme (dk.)',
      urgentWaitMinutes: 'Daha acil bekleme (dk.)',
      role: 'Rol',
      active: 'Durum',
      name: 'Ad soyad',
      email: 'E-posta',
      hospitalId: 'Hastane'
    },

    dev: {
      requestFailed: 'Panel isteği başarısız: {method} {path} → {code} (HTTP {status})',
      skipped: 'Panel yanıtında geçersiz kayıt atlandı ({kind}).'
    }
  });
})(window.AcilRadar = window.AcilRadar || {});

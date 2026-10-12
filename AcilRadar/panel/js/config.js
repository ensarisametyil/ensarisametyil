/* =============================================================================
 * panel/js/config.js
 * NE İŞE YARAR : Hastane panelinin TÜM ayarları (ortam, uç noktalar, oturum
 *                süreleri, sayfa boyutu, roller ve yetkiler, form sınırları).
 * VERDİĞİ      : AcilRadar.Panel.Config
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Gerçek arka uca bağlanmak ...... ENVIRONMENT (tek satır). Adresler sitenin
 *                                      js/config.js › ENVIRONMENTS tablosundan gelir.
 *   - Rol → yetki tablosu ............ ROLE_CAPABILITIES
 *   - Oturum uyarısı ne zaman çıksın . SESSION_WARNING_SECONDS
 *   - Form alanlarının sınırları ..... RECORD_LIMITS
 * NOT (GÜVENLİK): Buradaki yetki tablosu YALNIZ arayüzde neyin gösterileceğini
 *      belirler. Asıl yetki denetimi her istekte SUNUCUDA yapılır (docs/GUVENLIK.md).
 * ========================================================================== */
(function (AR) {
  'use strict';

  AR.Panel = AR.Panel || {};

  function deepFreeze(value) {
    Object.values(value).forEach(function (child) {
      if (child && typeof child === 'object') deepFreeze(child);
    });
    return Object.freeze(value);
  }

  AR.Panel.Config = deepFreeze({
    /* ---- 1. Ortam ----------------------------------------------------------- */

    // 'mock' → tarayıcı içi örnek sunucu (panel/js/mock.js); 'development' | 'production'
    // → gerçek ağ. Adres: js/config.js › ENVIRONMENTS[ortam].apiBaseUrl
    ENVIRONMENT: 'mock',

    PATHS: {
      login: '/api/v1/auth/login',
      logout: '/api/v1/auth/logout',
      me: '/api/v1/auth/me',
      hospitals: '/api/v1/panel/hospitals',
      records: '/api/v1/panel/hospitals/{id}/records',
      audit: '/api/v1/panel/audit',
      users: '/api/v1/panel/users',
      user: '/api/v1/panel/users/{id}'
    },

    // Oturum çerezi gönderilsin (sunucu HttpOnly çerezle oturum açar).
    CREDENTIALS: 'include',
    // Durum değiştiren isteklere eklenen başlık (CSRF'e karşı ek önlem; sunucu da denetler).
    CLIENT_HEADER: { name: 'X-AcilRadar-Client', value: 'panel' },

    REQUEST: {
      TIMEOUT_MS: 10000,
      MAX_RETRIES: 2,              // yalnız GET ve Idempotency-Key taşıyan yazma istekleri
      RETRY_BASE_DELAY_MS: 1000,
      RETRY_MAX_DELAY_MS: 8000,
      MAX_RETRY_AFTER_SECONDS: 900
    },

    /* ---- 2. Oturum ---------------------------------------------------------- */

    // Oturumun bitmesine bu kadar saniye kala uyarı bandı çıkar.
    SESSION_WARNING_SECONDS: 120,
    SESSION_TICK_SECONDS: 1,

    // Şimdilik kapalı özellikler: ekranları vardır ama çalışmaz.
    TWO_FACTOR_ENABLED: false,
    PASSWORD_RESET_ENABLED: false,

    /* ---- 3. Roller ve yetkiler (yalnız arayüz) ------------------------------ */

    ROLES: ['hospital_staff', 'hospital_admin', 'province_viewer', 'system_admin'],
    // Hastaneye bağlı roller (kullanıcının hospitalId'si olur).
    HOSPITAL_ROLES: ['hospital_staff', 'hospital_admin'],

    // Yetenekler:
    //   records.create   veri girişi           records.view   geçmiş kayıtlar
    //   hospitals.all    tüm hastaneleri görür  users.manage   kendi hastanesinin kullanıcıları
    //   users.all        tüm kullanıcılar       audit.view     denetim kaydı
    //   export.csv       CSV dışa aktarım
    ROLE_CAPABILITIES: {
      hospital_staff: ['records.create', 'records.view'],
      hospital_admin: ['records.create', 'records.view', 'users.manage', 'audit.view', 'export.csv'],
      province_viewer: ['records.view', 'hospitals.all', 'audit.view', 'export.csv'],
      system_admin: ['records.create', 'records.view', 'hospitals.all', 'users.manage', 'users.all', 'audit.view', 'export.csv']
    },

    // Kim hangi rolü atayabilir.
    ASSIGNABLE_ROLES: {
      hospital_admin: ['hospital_staff', 'hospital_admin'],
      system_admin: ['hospital_staff', 'hospital_admin', 'province_viewer', 'system_admin']
    },

    /* ---- 4. Veri girişi sınırları (panel/js/rules.js) ---------------------- */

    // NOT: Formda YALNIZ toplu sayılar vardır; kişisel/hasta verisi alanı YOKTUR (KVKK).
    RECORD_LIMITS: {
      PERCENT_MAX: 100,
      COUNT_MAX: 9999,
      PHYSICIANS_MAX: 500,
      WAIT_MAX_MINUTES: 1440
    },

    USER_LIMITS: {
      NAME_MAX: 80,
      EMAIL_MAX: 254
    },

    /* ---- 5. Listeler ---------------------------------------------------------- */

    PAGE_SIZE: 20,
    EXPORT_PAGE_SIZE: 100,
    EXPORT_MAX_ROWS: 5000,
    // Son girişin üzerinden bu kadar dakika geçtiyse özet ekranı uyarır
    // (halka açık sitede de aynı eşikle "güncel bilgi yok" görünür).
    STALE_AFTER_MINUTES: AR.Config.STALE_AFTER_MINUTES,

    /* ---- 6. Tarayıcı içi örnek sunucu (ENVIRONMENT: 'mock') ---------------- */

    MOCK: {
      SCRIPTS: ['../js/mock-data.js', 'js/mock.js'],
      DELAY_MS: 350,
      SESSION_STORAGE_KEY: 'acilradar.panel.mockSession'
    },

    CSV: {
      SEPARATOR: ';',          // Türkçe Excel ondalık virgül kullandığı için noktalı virgül
      FILE_PREFIX: 'acilradar'
    }
  });
})(window.AcilRadar = window.AcilRadar || {});

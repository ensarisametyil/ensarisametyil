/* =============================================================================
 * DOSYA ADI    : js/storage.js
 * NE İŞE YARAR : Tarayıcı depolamasını (localStorage) GÜVENLİ biçimde kullanır.
 *                Gizli pencere, kapalı çerez/site verisi ya da dolu depolama gibi
 *                durumlarda hata fırlatmaz; o oturum için bellekte tutar.
 * NEYİ ALIR    : AcilRadar.config (anahtar öneki, izinli değerler).
 * NEYİ VERİR   : AcilRadar.storage → getPrefs, savePrefs, getFavorites,
 *                saveFavorites, clearAll
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Yeni bir tercih saklamak: PREF_VALIDATORS'a bir satır ekleyin ve
 *     js/strings.js › privacy.stored listesine adını yazın (gizlilik metni).
 * NOT: Burada YALNIZCA tercihler saklanır: yazı boyutu, tema, ilçe ve favori
 *      hastane kimlikleri. Konum ASLA saklanmaz.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.config;
  const PREFS_KEY = 'prefs';
  const FAVORITES_KEY = 'favorites';

  // localStorage erişilemezse değerler sayfa açık kaldığı sürece burada tutulur.
  const memoryFallback = {};

  function fullKey(key) {
    return cfg.STORAGE_KEY_PREFIX + key;
  }

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(fullKey(key));
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (error) {
      return Object.prototype.hasOwnProperty.call(memoryFallback, key) ? memoryFallback[key] : fallback;
    }
  }

  function writeJson(key, value) {
    memoryFallback[key] = value;
    try {
      window.localStorage.setItem(fullKey(key), JSON.stringify(value));
    } catch (error) {
      // NOT: Bilerek sessiz geçiyoruz; tercih yalnızca bu oturumda geçerli olur.
    }
  }

  function removeKey(key) {
    delete memoryFallback[key];
    try {
      window.localStorage.removeItem(fullKey(key));
    } catch (error) {
      // Erişilemiyorsa silinecek bir şey de yoktur.
    }
  }

  // Her tercih için: izinli mi? Değilse varsayılan kullanılır (bozuk veriye karşı).
  const PREF_VALIDATORS = {
    textSize: function (value) { return cfg.TEXT_SIZES.indexOf(value) !== -1; },
    theme: function (value) { return cfg.THEMES.indexOf(value) !== -1; },
    districtId: function (value) {
      return cfg.DISTRICTS.some(function (district) { return district.id === value; });
    }
  };

  const PREF_DEFAULTS = {
    textSize: cfg.DEFAULT_TEXT_SIZE,
    theme: cfg.DEFAULT_THEME,
    districtId: cfg.DEFAULT_DISTRICT_ID
  };

  /** @returns {{textSize: string, theme: string, districtId: string}} */
  function getPrefs() {
    const stored = readJson(PREFS_KEY, {}) || {};
    const prefs = {};
    Object.keys(PREF_DEFAULTS).forEach(function (name) {
      prefs[name] = PREF_VALIDATORS[name](stored[name]) ? stored[name] : PREF_DEFAULTS[name];
    });
    return prefs;
  }

  /** Yalnızca verilen alanları günceller: savePrefs({ theme: 'dark' }) */
  function savePrefs(patch) {
    const next = getPrefs();
    Object.keys(patch).forEach(function (name) {
      if (PREF_VALIDATORS[name] && PREF_VALIDATORS[name](patch[name])) next[name] = patch[name];
    });
    writeJson(PREFS_KEY, next);
  }

  /** @returns {Set<string>} favori hastane kimlikleri */
  function getFavorites() {
    const stored = readJson(FAVORITES_KEY, []);
    if (!Array.isArray(stored)) return new Set();
    return new Set(stored.filter(function (id) { return typeof id === 'string'; }).slice(0, cfg.MAX_FAVORITES));
  }

  /** @param {Set<string>} favorites */
  function saveFavorites(favorites) {
    writeJson(FAVORITES_KEY, Array.from(favorites).slice(0, cfg.MAX_FAVORITES));
  }

  /** Gizlilik bölümündeki "Saklanan tercihlerimi sil" düğmesi kullanır. */
  function clearAll() {
    removeKey(PREFS_KEY);
    removeKey(FAVORITES_KEY);
  }

  AR.storage = Object.freeze({
    getPrefs: getPrefs,
    savePrefs: savePrefs,
    getFavorites: getFavorites,
    saveFavorites: saveFavorites,
    clearAll: clearAll
  });
})(window.AcilRadar = window.AcilRadar || {});

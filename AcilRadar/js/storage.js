/* =============================================================================
 * js/storage.js
 * NE İŞE YARAR : Tercihleri tarayıcıda GÜVENLE saklar. localStorage kapalı,
 *                dolu ya da erişilemezse hata fırlatmaz; o oturum için bellekte tutar.
 * VERDİĞİ      : AcilRadar.Storage → getPrefs(), savePrefs(patch)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Yeni tercih saklamak: VALIDATORS ve DEFAULTS'a ekleyin; gizlilik metnini
 *     (strings.js › info.privacy) güncelleyin.
 * NOT: Yalnızca yazı boyutu ve ilçe saklanır. Konum ASLA saklanmaz.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.Config;
  const PREFS_KEY = cfg.STORAGE_KEY_PREFIX + 'prefs';
  let memoryCopy = null;

  const VALIDATORS = {
    textSize: function (value) { return cfg.TEXT_SIZES.indexOf(value) !== -1; },
    districtId: function (value) {
      return cfg.DISTRICTS.some(function (district) { return district.id === value; });
    }
  };

  const DEFAULTS = {
    textSize: cfg.DEFAULT_TEXT_SIZE,
    districtId: cfg.DEFAULT_DISTRICT_ID
  };

  function readRaw() {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      return raw === null ? memoryCopy : JSON.parse(raw);
    } catch (error) {
      return memoryCopy;
    }
  }

  /** Bozuk ya da eski değerler yerine varsayılan kullanılır. */
  function getPrefs() {
    const stored = readRaw();
    const source = stored && typeof stored === 'object' ? stored : {};
    const prefs = {};
    Object.keys(DEFAULTS).forEach(function (name) {
      prefs[name] = VALIDATORS[name](source[name]) ? source[name] : DEFAULTS[name];
    });
    return prefs;
  }

  /** savePrefs({ textSize: 'large' }) — yalnız geçerli alanlar yazılır. */
  function savePrefs(patch) {
    const next = getPrefs();
    Object.keys(patch).forEach(function (name) {
      if (VALIDATORS[name] && VALIDATORS[name](patch[name])) next[name] = patch[name];
    });
    memoryCopy = next;
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch (error) {
      // NOT: Depolama yoksa/doluysa tercih yalnız bu oturumda geçerli olur.
    }
  }

  AR.Storage = Object.freeze({ getPrefs: getPrefs, savePrefs: savePrefs });
})(window.AcilRadar = window.AcilRadar || {});

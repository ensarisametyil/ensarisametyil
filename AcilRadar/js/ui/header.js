/* =============================================================================
 * DOSYA ADI    : js/ui/header.js
 * NE İŞE YARAR : Üst çubuk: yazı boyutu (A− / A / A+), tema (Otomatik / Açık / Koyu)
 *                ve küçük ekranlarda "Görünüm" panelini aç/kapa.
 *                Ayrıca sayfa ilk çizilmeden ÖNCE kayıtlı görünümü uygular
 *                (koyu tema seçen kullanıcı bir an beyaz ekran görmesin diye).
 * NEYİ ALIR    : AcilRadar.storage (kayıtlı tercihler), app.js'ten olay işleyicileri.
 * NEYİ VERİR   : AcilRadar.ui.header → applyAppearance, init, setTextSize, setTheme
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Yazı boyutlarının piksel karşılıkları: css/tokens.css › [data-text-size]
 *   - Tema renkleri: css/tokens.css
 * NOT: Bu dosya <head> içinde yüklenir ve en altta applyAppearance() hemen çalışır.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const root = document.documentElement;

  /** <html> öğesine data-text-size ve data-theme yazar; CSS gerisini halleder. */
  function applyAppearance(textSize, theme) {
    root.setAttribute('data-text-size', textSize);
    root.setAttribute('data-theme', theme);
  }

  /** Bir düğme grubunda yalnızca seçili olanı aria-pressed="true" yapar. */
  function setPressed(groupSelector, attribute, value) {
    document.querySelectorAll(groupSelector + ' [' + attribute + ']').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute(attribute) === value));
    });
  }

  function setTextSize(size) {
    root.setAttribute('data-text-size', size);
    setPressed('#text-size-group', 'data-text-size-value', size);
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    setPressed('#theme-group', 'data-theme-value', theme);
  }

  function bindGroup(groupId, attribute, handler) {
    const group = document.getElementById(groupId);
    if (!group) return;
    group.addEventListener('click', function (event) {
      const button = event.target.closest('[' + attribute + ']');
      if (button) handler(button.getAttribute(attribute));
    });
  }

  function bindSettingsToggle() {
    const toggle = document.getElementById('appearance-toggle');
    const panel = document.getElementById('appearance-panel');
    if (!toggle || !panel) return;
    toggle.addEventListener('click', function () {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
    });
  }

  /**
   * @param {{textSize:string, theme:string}} prefs
   * @param {{onTextSize:function(string), onTheme:function(string)}} handlers
   */
  function init(prefs, handlers) {
    setTextSize(prefs.textSize);
    setTheme(prefs.theme);
    bindGroup('text-size-group', 'data-text-size-value', handlers.onTextSize);
    bindGroup('theme-group', 'data-theme-value', handlers.onTheme);
    bindSettingsToggle();
  }

  AR.ui = AR.ui || {};
  AR.ui.header = Object.freeze({
    applyAppearance: applyAppearance,
    init: init,
    setTextSize: setTextSize,
    setTheme: setTheme
  });

  // İlk boyamadan önce kayıtlı görünümü uygula ve "JS açık" işaretini koy.
  root.classList.remove('no-js');
  root.classList.add('js');
  if (AR.storage) {
    const saved = AR.storage.getPrefs();
    applyAppearance(saved.textSize, saved.theme);
  }
})(window.AcilRadar = window.AcilRadar || {});

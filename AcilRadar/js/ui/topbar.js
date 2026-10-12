/* =============================================================================
 * js/ui/topbar.js
 * NE İŞE YARAR : Yapışkan üst çubuk: yazı boyutu kontrolü (A− / A / A+).
 *                Ayrıca sayfa ilk çizilmeden ÖNCE kayıtlı yazı boyutunu uygular ve
 *                <html> üzerindeki "no-js" işaretini "js" yapar.
 * VERDİĞİ      : AcilRadar.UI.topbar → init(textSize, onChange), setTextSize(size)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Kademelerin piksel karşılıkları: css/tokens.css › [data-text-size]
 * NOT: Bu dosya <head> içinde yüklenir ve BİLEREK ES5 sözdizimiyle yazılmıştır:
 *      çok eski bir tarayıcı diğer dosyaları çalıştıramasa bile bu dosya çalışır ve
 *      index.html'deki sade yedek içerik (112 bilgisi) görünür hale gelir.
 *      "112'yi Ara" bağlantısı düz HTML'dir; JavaScript gerektirmez.
 * ========================================================================== */
(function (AR) {
  'use strict';

  var root = document.documentElement;

  function setTextSize(size) {
    root.setAttribute('data-text-size', size);
    var buttons = document.querySelectorAll('#text-size-group [data-size]');
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-size') === size));
    }
  }

  /**
   * @param {string} textSize
   * @param {function(string)} onChange  app.js'e bildirilir (kaydetme orada).
   */
  function init(textSize, onChange) {
    setTextSize(textSize);
    var group = document.getElementById('text-size-group');
    if (!group) return;
    group.addEventListener('click', function (event) {
      var button = event.target.closest('[data-size]');
      if (button) onChange(button.getAttribute('data-size'));
    });
  }

  AR.UI = AR.UI || {};
  AR.UI.topbar = { init: init, setTextSize: setTextSize };

  // İlk boyamadan önce: "JS çalışıyor" işareti ve kayıtlı yazı boyutu.
  root.className = root.className.replace(/\bno-js\b/, 'js');
  if (AR.Storage) root.setAttribute('data-text-size', AR.Storage.getPrefs().textSize);
})(window.AcilRadar = window.AcilRadar || {});

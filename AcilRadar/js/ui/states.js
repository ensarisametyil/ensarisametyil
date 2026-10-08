/* =============================================================================
 * DOSYA ADI    : js/ui/states.js
 * NE İŞE YARAR : Liste dışındaki "durum" görünümleri: yükleniyor iskeletleri,
 *                boş sonuç, hata + "Tekrar dene", çevrimdışı ve simülasyon bantları,
 *                ekran okuyucu duyuruları ve kısa bildirimler (toast).
 * NEYİ ALIR    : Çizilecek durum bilgisi (app.js'ten). Veri GETİRMEZ.
 * NEYİ VERİR   : AcilRadar.ui.states → showSkeleton, renderEmpty, renderError,
 *                clearError, setBanner, announce, toast, setBusy
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Durum metinleri: js/strings.js › empty, error, banner
 *   - İskelet kartın görünümü: css/components.css › .skeleton
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.dom;
  const text = AR.text;
  let toastTimer = null;

  /** Yükleniyor iskeletleri (ekran okuyucudan gizli; yerine tek bir duyuru yapılır). */
  function showSkeleton(listEl, count) {
    dom.clear(listEl);
    for (let i = 0; i < count; i += 1) {
      listEl.appendChild(dom.el('li', { className: 'skeleton', attrs: { 'aria-hidden': 'true' } }, [
        dom.el('div', { className: 'skeleton__line skeleton__line--title' }),
        dom.el('div', { className: 'skeleton__line skeleton__line--meta' }),
        dom.el('div', { className: 'skeleton__block' }),
        dom.el('div', { className: 'skeleton__line skeleton__line--meta' })
      ]));
    }
  }

  function setBusy(listEl, busy) {
    listEl.setAttribute('aria-busy', String(busy));
  }

  /**
   * Boş sonuç.
   * @param {HTMLElement} container
   * @param {'noData'|'noMatch'} kind
   * @param {?function} onClearFilters  yalnızca 'noMatch' için düğme gösterilir
   */
  function renderEmpty(container, kind, onClearFilters) {
    dom.clear(container);
    const box = dom.el('div', { className: 'state-box' }, [
      dom.icon(kind === 'noMatch' ? 'search' : 'info', 'state-box__icon'),
      dom.el('h3', { className: 'state-box__title', text: text('empty.' + kind + 'Title') }),
      dom.el('p', { text: text('empty.' + kind + 'Body') })
    ]);
    if (kind === 'noMatch' && onClearFilters) {
      const button = dom.el('button', { className: 'btn btn--secondary', attrs: { type: 'button' }, text: text('controls.clearFilters') });
      button.addEventListener('click', onClearFilters);
      box.appendChild(button);
    }
    container.appendChild(box);
  }

  /**
   * Hata kutusu. compact=true ise eski veri hâlâ gösteriliyordur (kısa uyarı).
   * @param {HTMLElement} container
   * @param {{message:string, detail?:string}} error
   * @param {boolean} compact
   * @param {function} onRetry
   */
  function renderError(container, error, compact, onRetry) {
    dom.clear(container);
    const retry = dom.el('button', { className: 'btn btn--primary', attrs: { type: 'button' } }, [
      dom.icon('refresh'), dom.el('span', { text: text('error.retry') })
    ]);
    retry.addEventListener('click', onRetry);
    const children = [
      dom.icon('alert', 'state-box__icon'),
      dom.el('h3', { className: 'state-box__title', text: compact ? text('error.keptOld') : text('error.title') }),
      dom.el('p', { text: error.message })
    ];
    if (error.detail) children.push(dom.el('p', { className: 'state-box__detail', text: text('error.serverDetail', { message: error.detail }) }));
    children.push(retry);
    container.appendChild(dom.el('div', { className: 'state-box state-box--error' + (compact ? ' state-box--compact' : '') }, children));
    container.hidden = false;
  }

  function clearError(container) {
    dom.clear(container);
    container.hidden = true;
  }

  /** Sayfa üstündeki bantlar: 'offline' ya da 'simulation'. */
  function setBanner(name, visible) {
    const banner = document.getElementById(name + '-banner');
    if (banner) banner.hidden = !visible;
  }

  /** Ekran okuyuculara kibarca duyurur (aria-live="polite" bölgesi). */
  function announce(message) {
    const region = document.getElementById('live-region');
    if (!region) return;
    region.textContent = '';
    // NOT: Aynı ileti art arda gelse de okunması için içerik bir sonraki karede yazılır.
    window.requestAnimationFrame(function () { region.textContent = message; });
  }

  /** Kısa bildirim (ör. "Bağlantı panoya kopyalandı"). Hem görünür hem duyurulur. */
  function toast(message) {
    const node = document.getElementById('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove('is-visible'); }, AR.config.TOAST_DURATION_MS);
  }

  AR.ui = AR.ui || {};
  AR.ui.states = Object.freeze({
    showSkeleton: showSkeleton,
    setBusy: setBusy,
    renderEmpty: renderEmpty,
    renderError: renderError,
    clearError: clearError,
    setBanner: setBanner,
    announce: announce,
    toast: toast
  });
})(window.AcilRadar = window.AcilRadar || {});

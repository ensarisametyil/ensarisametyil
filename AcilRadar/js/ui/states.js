/* =============================================================================
 * js/ui/states.js
 * NE İŞE YARAR : Durum görünümleri: yükleniyor iskeletleri, sonuç yok, hata +
 *                "Tekrar dene", bantlar (örnek veri, çevrimdışı, sunucu duyurusu),
 *                ekran okuyucu duyurusu ve sonuç sayısı satırı.
 * VERDİĞİ      : AcilRadar.UI.states
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Durum metinleri: strings.js › empty, errors, banner
 *   - Görünüm: css/components.css › .state, .banner, .skeleton
 * NOT: Veri getirmez, durum (state) değiştirmez; yalnız kendisine verileni çizer.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.UI.dom;
  const t = AR.Strings.text;

  function byId(id) {
    return document.getElementById(id);
  }

  /** İskelet kartlar: gerçek kartla aynı yüksekliği ayırır (düzen kayması olmaz). */
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
    listEl.setAttribute('aria-busy', 'true');
  }

  function stateBox(variant, iconName, title, body, action) {
    return dom.el('div', { className: 'state state--' + variant }, [
      dom.el('span', { className: 'state__icon' }, [dom.icon(iconName)]),
      dom.el('div', { className: 'state__content' }, [
        dom.el('p', { className: 'state__title', text: title }),
        body ? dom.el('p', { className: 'state__body', text: body }) : null,
        action || null
      ])
    ]);
  }

  function actionButton(label, iconName, onClick) {
    const button = dom.el('button', { className: 'btn btn--secondary', attrs: { type: 'button' } }, [
      iconName ? dom.icon(iconName) : null,
      dom.el('span', { text: label })
    ]);
    button.addEventListener('click', onClick);
    return button;
  }

  /**
   * Sonuç yok.
   * @param {'noData'|'noMatch'} kind
   * @param {?function} onClearFilters  noMatch'te "Filtreleri temizle" düğmesi
   */
  function renderEmpty(container, kind, onClearFilters) {
    dom.clear(container);
    const action = kind === 'noMatch' && onClearFilters ? actionButton(t('controls.clearFilters'), null, onClearFilters) : null;
    container.appendChild(stateBox('neutral', kind === 'noMatch' ? 'search' : 'info', t('empty.' + kind + 'Title'), t('empty.' + kind + 'Body'), action));
    container.hidden = false;
  }

  /**
   * Hata. Eski bilgi hâlâ gösteriliyorsa (hasData) kısa uyarı biçimindedir.
   * @param {string} code  strings.js › errors.codes anahtarı
   */
  function renderError(container, code, hasData, onRetry) {
    dom.clear(container);
    const message = AR.Strings.has('errors.codes.' + code) ? t('errors.codes.' + code) : t('errors.codes.UNKNOWN');
    const title = hasData ? t('errors.keptOld') : t('errors.title');
    container.appendChild(stateBox(hasData ? 'warning' : 'error', 'alert', title, message, actionButton(t('errors.retry'), 'refresh', onRetry)));
    container.hidden = false;
  }

  function hide(container) {
    dom.clear(container);
    container.hidden = true;
  }

  /** Örnek veri bandı: yalnız veri simülasyonsa görünür. */
  function setSimulationBanner(visible) {
    byId('simulation-banner').hidden = !visible;
  }

  function setOfflineBanner(visible) {
    byId('offline-banner').hidden = !visible;
  }

  /** Sunucu duyurusu (metin textContent ile yazılır). */
  function setNotice(notice) {
    const banner = byId('notice-banner');
    banner.hidden = !notice;
    if (!notice) return;
    banner.className = 'banner banner--notice banner--' + notice.level;
    byId('notice-label').textContent = t(notice.level === 'warning' ? 'banner.noticeWarning' : 'banner.noticeInfo');
    byId('notice-text').textContent = notice.text;
  }

  /** Ekran okuyuculara kibar duyuru (aria-live="polite"). */
  function announce(message) {
    const region = byId('live-region');
    region.textContent = '';
    window.setTimeout(function () { region.textContent = message; }, 0);
  }

  AR.UI = AR.UI || {};
  AR.UI.states = Object.freeze({
    showSkeleton: showSkeleton,
    renderEmpty: renderEmpty,
    renderError: renderError,
    hide: hide,
    setSimulationBanner: setSimulationBanner,
    setOfflineBanner: setOfflineBanner,
    setNotice: setNotice,
    announce: announce
  });
})(window.AcilRadar = window.AcilRadar || {});

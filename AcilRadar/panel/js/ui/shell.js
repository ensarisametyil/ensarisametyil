/* =============================================================================
 * panel/js/ui/shell.js
 * NE İŞE YARAR : Panelin çerçevesi: başlıktaki kullanıcı bilgisi ve "Çıkış yap",
 *                yetkiye göre süzülmüş menü, oturum bitiş uyarısı (ekranı
 *                ENGELLEMEYEN bant), örnek sunucu bandı, genel bildirim alanı,
 *                sayfa başlığı ve odak yönetimi.
 * VERDİĞİ      : AcilRadar.Panel.UI.shell
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Menü sırası: panel/js/app.js › ROUTES (yetki de oradan gelir)
 *   - Görünüm: panel/css/panel.css › .pnav, .session-banner
 * NOT: Menüde yalnız kullanıcının yetkili olduğu sayfalar görünür. Bu bir
 *      kolaylıktır, güvenlik değildir (yetki sunucuda denetlenir).
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.UI.dom;
  const el = dom.el;
  const t = AR.Strings.text;

  // İlk ekranda odak taşınmaz (ilk Tab "İçeriğe atla"ya gitsin); sonraki ekran
  // geçişlerinde odak yeni başlığa taşınır (ekran okuyucu yeni sayfayı duyar).
  let viewCount = 0;

  function byId(id) {
    return document.getElementById(id);
  }

  /**
   * Oturum açıkken başlık ve menü; kapalıyken ikisi de gizlenir.
   * @param {?PanelUser} user
   * @param {{slug:string, labelKey:string}[]} items  yetkili menü öğeleri
   * @param {string} currentSlug
   */
  function setUser(user, items, currentSlug) {
    byId('user-area').hidden = !user;
    byId('panel-nav').hidden = !user;
    if (!user) return;
    byId('user-label').textContent = t('panel.header.signedInAs', { name: user.name, role: t('panel.roles.' + user.role) });
    const list = byId('panel-nav-list');
    dom.clear(list);
    items.forEach(function (item) {
      const link = el('a', { className: 'pnav__link', attrs: { href: '#/' + item.slug, 'aria-current': item.slug === currentSlug ? 'page' : false }, text: t(item.labelKey) });
      list.appendChild(el('li', {}, [link]));
    });
  }

  /** Örnek sunucu bandı (yalnız 'mock' ortamında). */
  function setMockBanner(visible) {
    byId('mock-banner').hidden = !visible;
  }

  /**
   * Oturum uyarısı. seconds null ise gizlenir. Bant ilk görününce bir kez duyurulur
   * (her saniye duyurulmaz; sayaç yalnız görsel olarak güncellenir).
   */
  function setSessionWarning(seconds) {
    const banner = byId('session-banner');
    const wasHidden = banner.hidden;
    banner.hidden = seconds === null;
    if (seconds === null) return;
    byId('session-text').textContent = t('panel.session.warning', { seconds: AR.Strings.format.number(Math.max(0, seconds)) });
    if (wasHidden) announce(byId('session-text').textContent);
  }

  function bindSessionActions(onExtend, onLogout) {
    byId('session-extend').addEventListener('click', onExtend);
    byId('session-logout').addEventListener('click', onLogout);
    byId('logout-button').addEventListener('click', onLogout);
  }

  /** Genel bildirim (ekranlar arası, ör. "Çıkış yaptınız."). */
  function notify(tone, message) {
    AR.Panel.UI.form.notice(byId('global-notice'), tone, message);
  }

  function announce(message) {
    const region = byId('panel-live');
    region.textContent = '';
    window.setTimeout(function () { region.textContent = message; }, 0);
  }

  /**
   * Yeni ekranın kabı: başlık h1 (odak alır) + gövde.
   * @returns {{root:HTMLElement, body:HTMLElement}}
   */
  function startView(title, lead) {
    const view = byId('view');
    dom.clear(view);
    document.title = t('panel.app.documentTitle', { page: title });
    const heading = el('h1', { className: 'pview__title', attrs: { tabindex: '-1', id: 'view-title' }, text: title });
    const body = el('div', { className: 'pview__body' });
    view.appendChild(el('div', { className: 'pview__head' }, [heading, lead ? el('p', { className: 'pview__lead', text: lead }) : null]));
    view.appendChild(body);
    viewCount += 1;
    if (viewCount > 1) {
      heading.focus({ preventScroll: false });
      announce(title);
    }
    return { root: view, body: body };
  }

  /** Ekran yüklenirken sade bir bekleme göstergesi. */
  function loading(container) {
    dom.clear(container);
    container.appendChild(el('p', { className: 'field-hint ploading', attrs: { role: 'status' }, text: t('panel.a11y.loading') }));
  }

  /** Ekran düzeyinde hata + "Tekrar dene". */
  function errorState(container, code, onRetry) {
    dom.clear(container);
    const retry = el('button', { className: 'btn btn--secondary', attrs: { type: 'button' } }, [dom.icon('refresh'), el('span', { text: t('panel.common.retry') })]);
    retry.addEventListener('click', onRetry);
    const message = AR.Strings.has('panel.errors.codes.' + code) ? t('panel.errors.codes.' + code) : t('panel.errors.codes.UNKNOWN');
    container.appendChild(el('div', { className: 'state state--error', attrs: { role: 'alert' } }, [
      el('span', { className: 'state__icon' }, [dom.icon('alert')]),
      el('div', { className: 'state__content' }, [el('p', { className: 'state__title', text: message }), onRetry ? retry : null])
    ]));
  }

  AR.Panel.UI = AR.Panel.UI || {};
  AR.Panel.UI.shell = Object.freeze({
    setUser: setUser,
    setMockBanner: setMockBanner,
    setSessionWarning: setSessionWarning,
    bindSessionActions: bindSessionActions,
    notify: notify,
    announce: announce,
    startView: startView,
    loading: loading,
    errorState: errorState
  });
})(window.AcilRadar = window.AcilRadar || {});

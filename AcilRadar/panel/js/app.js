/* =============================================================================
 * panel/js/app.js
 * NE İŞE YARAR : Panelin akışı: adres (#/…) yönlendirmesi, tek durum nesnesi,
 *                oturum açma/kapama, oturum süresi ve uyarısı, 401'de güvenli çıkış
 *                ve girişten sonra kaldığı sayfaya dönüş.
 * VERDİĞİ      : AcilRadar.Panel.App → { state }
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Sayfalar, adresleri, menü sırası ve gereken yetki: ROUTES
 *   - Oturum uyarısının zamanı: panel/js/config.js › SESSION_WARNING_SECONDS
 * NOT: Adres yönlendirmesi "#/" ile yapılır; file:// ile de çalışır, geri/ileri
 *      tuşu ve süzgeçli adreslerin paylaşılması doğal olarak desteklenir.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.Panel.Config;
  const Api = AR.Panel.Api;
  const Rules = AR.Panel.Rules;
  const shell = AR.Panel.UI.shell;
  const t = AR.Strings.text;
  const MS_PER_SECOND = 1000;

  // Sayfalar (sıra = menü sırası). public: oturumsuz açılır; capability: gereken yetki.
  const ROUTES = [
    { slug: 'giris', screen: 'login', public: true },
    { slug: 'parolami-unuttum', screen: 'forgot', public: true },
    { slug: 'iki-adimli-dogrulama', screen: 'twoFactor', public: true },
    { slug: 'ozet', screen: 'dashboard', nav: 'panel.nav.dashboard', capability: null },
    { slug: 'veri-girisi', screen: 'entry', nav: 'panel.nav.entry', capability: 'records.create' },
    { slug: 'gecmis', screen: 'history', nav: 'panel.nav.history', capability: 'records.view' },
    { slug: 'kullanicilar', screen: 'users', nav: 'panel.nav.users', capability: 'users.manage' },
    { slug: 'denetim-kaydi', screen: 'audit', nav: 'panel.nav.audit', capability: 'audit.view' }
  ];
  const HOME = 'ozet';
  const LOGIN = 'giris';

  const state = {
    user: null,
    hospitals: [],
    expiresAtMs: 0,
    clockOffsetMs: 0,      // sunucu saati − cihaz saati
    returnTo: null,        // oturum bitince kalınan adres
    loginMessage: null,    // giriş ekranında gösterilecek ileti anahtarı
    pendingNotice: null,   // yönlendirmeden SONRA gösterilecek genel bildirim
    booted: false
  };
  let sessionTimer = null;

  /* ---- 1. Adres ------------------------------------------------------------- */

  function parseHash() {
    const raw = window.location.hash.replace(/^#\/?/, '');
    const parts = raw.split('?');
    const params = {};
    new URLSearchParams(parts[1] || '').forEach(function (value, key) { params[key] = value; });
    return { slug: decodeURIComponent(parts[0] || ''), params: params };
  }

  function buildHash(slug, params) {
    const query = new URLSearchParams();
    Object.keys(params || {}).forEach(function (key) {
      if (params[key] !== '' && params[key] != null) query.set(key, params[key]);
    });
    const text = query.toString();
    return '#/' + slug + (text ? '?' + text : '');
  }

  function navigate(slug, params) {
    const hash = buildHash(slug, params);
    if (window.location.hash === hash) render();
    else window.location.hash = hash;
  }

  function findRoute(slug) {
    return ROUTES.find(function (r) { return r.slug === slug; }) || null;
  }

  function allowed(route) {
    return route.public || !route.capability || Rules.can(state.user, route.capability);
  }

  /* ---- 2. Çizim ------------------------------------------------------------- */

  function context(params) {
    return {
      api: Api,
      user: state.user,
      params: params,
      navigate: navigate,
      nowMs: function () { return Date.now() + state.clockOffsetMs; },
      hospitals: function () { return state.hospitals; },
      refreshHospitals: function () { return Api.hospitals().then(function (list) { state.hospitals = list; return list; }); },
      onLoggedIn: onLoggedIn
    };
  }

  function render() {
    if (!state.booted) return;
    const location = parseHash();
    const route = findRoute(location.slug);
    if (!state.user && (!route || !route.public)) {
      if (route) state.returnTo = window.location.hash;
      navigate(LOGIN);
      return;
    }
    if (state.user && (!route || route.slug === LOGIN)) {
      navigate(HOME);
      return;
    }
    if (!allowed(route)) {
      state.pendingNotice = { tone: 'warning', text: t('panel.common.forbidden') };
      navigate(HOME);
      return;
    }
    shell.notify(state.pendingNotice ? state.pendingNotice.tone : null, state.pendingNotice ? state.pendingNotice.text : '');
    state.pendingNotice = null;
    shell.setUser(state.user, ROUTES.filter(function (r) { return r.nav && allowed(r); }).map(function (r) { return { slug: r.slug, labelKey: r.nav }; }), route.slug);
    const params = Object.assign({}, location.params);
    if (route.slug === LOGIN && state.loginMessage) {
      params.message = state.loginMessage;
      state.loginMessage = null;
    }
    AR.Panel.Screens[route.screen].show(context(params));
  }

  /* ---- 3. Oturum ------------------------------------------------------------ */

  function startSession(session) {
    state.user = session.user;
    state.expiresAtMs = Date.now() + session.expiresInMs;
    state.clockOffsetMs = session.serverTimeMs - Date.now();
    clearInterval(sessionTimer);
    sessionTimer = setInterval(checkSession, cfg.SESSION_TICK_SECONDS * MS_PER_SECOND);
    shell.setSessionWarning(null);
  }

  /** Oturumu bu cihazda kapatır; messageKey: 'sessionExpired' | 'loggedOut' */
  function endSession(messageKey) {
    clearInterval(sessionTimer);
    const wasSignedIn = Boolean(state.user);
    state.user = null;
    state.hospitals = [];
    shell.setSessionWarning(null);
    shell.setUser(null, [], '');
    if (!wasSignedIn) return;
    state.returnTo = messageKey === 'sessionExpired' ? window.location.hash : null;
    state.loginMessage = messageKey;
    navigate(LOGIN);
  }

  function checkSession() {
    const leftMs = state.expiresAtMs - Date.now();
    if (leftMs <= 0) {
      Api.logout().catch(function () {});
      endSession('sessionExpired');
      return;
    }
    shell.setSessionWarning(leftMs <= cfg.SESSION_WARNING_SECONDS * MS_PER_SECOND ? Math.ceil(leftMs / MS_PER_SECOND) : null);
  }

  /** "Oturumu uzat": /auth/me oturumu yeniler (kayan oturum). */
  function extendSession() {
    Api.me().then(function (session) {
      startSession(session);
      shell.notify('success', t('panel.session.extended'));
    }).catch(function () {
      endSession('sessionExpired');
    });
  }

  function logout() {
    Api.logout().catch(function () {}).then(function () { endSession('loggedOut'); });
  }

  function onLoggedIn(session) {
    if (session.twoFactorRequired && cfg.TWO_FACTOR_ENABLED) {
      navigate('iki-adimli-dogrulama');
      return;
    }
    startSession(session);
    const target = state.returnTo;
    state.returnTo = null;
    Api.hospitals().then(function (list) { state.hospitals = list; }).catch(function () { state.hospitals = []; }).then(function () {
      if (target && target !== window.location.hash) window.location.hash = target;
      else navigate(HOME);
    });
  }

  /* ---- 4. Başlatma ---------------------------------------------------------- */

  function boot() {
    state.booted = true;
    Api.me().then(function (session) {
      startSession(session);
      return Api.hospitals().then(function (list) { state.hospitals = list; });
    }).catch(function () {
      // Oturum yok (401) ya da sunucuya ulaşılamadı: giriş ekranı açılır; hata orada görünür.
      state.user = null;
    }).then(render);
  }

  function init() {
    AR.UI.dom.applyStaticStrings(document);
    AR.UI.dom.hydrateIcons(document);
    shell.setMockBanner(cfg.ENVIRONMENT === 'mock');
    shell.bindSessionActions(extendSession, logout);
    Api.setUnauthorizedHandler(function () { endSession('sessionExpired'); });
    window.addEventListener('hashchange', render);
    // Geri/ileri ile önbellekten dönülürse oturum yeniden denetlenir.
    window.addEventListener('pageshow', function (event) { if (event.persisted) boot(); });
    document.documentElement.classList.add('app-ready');
    boot();
  }

  AR.Panel.App = Object.freeze({ state: state });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.AcilRadar = window.AcilRadar || {});

/* =============================================================================
 * panel/js/screens/login.js
 * NE İŞE YARAR : Giriş ekranı (e-posta + parola), "Parolamı unuttum" ekranı
 *                (şimdilik yalnız arayüz) ve iki adımlı doğrulama yer tutucusu.
 * VERDİĞİ      : AcilRadar.Panel.Screens.login / forgot / twoFactor → show(ctx)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Metinler: panel/js/strings.js › panel.login, panel.forgot, panel.twoFactor
 *   - Özellik açma: panel/js/config.js › PASSWORD_RESET_ENABLED, TWO_FACTOR_ENABLED
 * NOT (GÜVENLİK): Parola alanı autocomplete="current-password", e-posta "username";
 *      tarayıcının parola yöneticisi doğru çalışır. Hatalı girişte hangi alanın
 *      yanlış olduğu SÖYLENMEZ (hesap var mı yok mu belli olmasın).
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.UI.dom;
  const el = dom.el;
  const t = AR.Strings.text;
  const F = AR.Panel.UI.form;
  const cfg = AR.Panel.Config;
  const MS_PER_SECOND = 1000;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const AUTH = { layout: 'auth' };   // ekran ortada tek kart

  const LOGIN_ERRORS = { INVALID_CREDENTIALS: 'panel.login.invalid', ACCOUNT_INACTIVE: 'panel.login.inactive' };

  function passwordToggle(input) {
    const button = el('button', { className: 'btn btn--ghost btn--compact', attrs: { type: 'button', 'aria-pressed': 'false', 'aria-controls': input.id }, text: t('panel.login.showPassword') });
    button.addEventListener('click', function () {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
    });
    return button;
  }

  function mockAccounts() {
    if (cfg.ENVIRONMENT !== 'mock' || !AR.Panel.Mock) return null;
    return el('div', { className: 'pnotice pnotice--info pmock' }, [
      dom.icon('info'),
      el('div', {}, [
        el('p', { className: 'pmock__title', text: t('panel.login.mockTitle') }),
        el('ul', { className: 'pmock__list' }, AR.Panel.Mock.ACCOUNTS.map(function (a) {
          return el('li', { text: a.email + ' — ' + t('panel.roles.' + a.role) });
        })),
        el('p', { text: t('panel.login.mockPassword', { password: AR.Panel.Mock.PASSWORD }) })
      ])
    ]);
  }

  /** 429: düğme Retry-After süresince kilitli kalır, kalan süre yazılır. */
  function lockFor(ms, button, noticeBox) {
    const until = Date.now() + ms;
    F.setBusy(button, true);
    const tick = function () {
      const left = Math.ceil((until - Date.now()) / MS_PER_SECOND);
      if (left <= 0) {
        F.setBusy(button, false);
        F.notice(noticeBox, null, '');
        return;
      }
      noticeBox.querySelector('p').textContent = t('panel.login.locked', { seconds: left });
      setTimeout(tick, MS_PER_SECOND);
    };
    F.notice(noticeBox, 'error', t('panel.login.locked', { seconds: Math.ceil(ms / MS_PER_SECOND) }));
    setTimeout(tick, MS_PER_SECOND);
  }

  function validate(email, password) {
    const errors = {};
    if (!email.input.value.trim()) errors.email = { key: 'required' };
    else if (!EMAIL.test(email.input.value.trim())) errors.email = { key: 'email' };
    if (!password.input.value) errors.password = { key: 'required' };
    email.setError(errors.email || null);
    password.setError(errors.password || null);
    return errors;
  }

  function handleError(error, button, noticeBox) {
    if (error.code === 'RATE_LIMITED' && error.retryAfterMs > 0) {
      lockFor(error.retryAfterMs, button, noticeBox);
      return;
    }
    F.setBusy(button, false);
    const key = LOGIN_ERRORS[error.code] || (AR.Strings.has('panel.errors.codes.' + error.code) ? 'panel.errors.codes.' + error.code : 'panel.errors.codes.UNKNOWN');
    F.notice(noticeBox, 'error', t(key));
  }

  function show(ctx) {
    const view = AR.Panel.UI.shell.startView(t('panel.login.title'), t('panel.login.lead'), AUTH);
    const noticeBox = el('div', { attrs: { hidden: true } });
    if (ctx.params.message) F.notice(noticeBox, ctx.params.message === 'loggedOut' ? 'info' : 'warning', t('panel.login.' + ctx.params.message));
    const email = F.field({ id: 'login-email', name: 'email', label: t('panel.login.email'), type: 'email', inputmode: 'email', autocomplete: 'username', required: true });
    const password = F.field({ id: 'login-password', name: 'password', label: t('panel.login.password'), type: 'password', autocomplete: 'current-password', required: true });
    password.root.appendChild(passwordToggle(password.input));
    const submit = el('button', { className: 'btn btn--primary btn--block', attrs: { type: 'submit' }, text: t('panel.login.submit') });
    const form = el('form', { className: 'pform pform--narrow', attrs: { novalidate: true, 'aria-labelledby': 'view-title' } }, [
      noticeBox, email.root, password.root, submit,
      el('a', { className: 'plink', attrs: { href: '#/parolami-unuttum' }, text: t('panel.login.forgot') })
    ]);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (submit.disabled) return;
      const errors = validate(email, password);
      if (errors.email) { email.input.focus(); return; }
      if (errors.password) { password.input.focus(); return; }
      F.setBusy(submit, true);
      F.notice(noticeBox, null, '');
      ctx.api.login(email.input.value.trim(), password.input.value)
        .then(function (session) { ctx.onLoggedIn(session); })
        .catch(function (error) { handleError(error, submit, noticeBox); });
    });
    view.body.appendChild(form);
    const hint = mockAccounts();
    if (hint) view.body.appendChild(hint);
  }

  /** Parolamı unuttum: şimdilik ağ isteği YAPMAZ; yalnız yönlendirir. */
  function showForgot() {
    const view = AR.Panel.UI.shell.startView(t('panel.forgot.title'), t('panel.forgot.lead'), AUTH);
    const noticeBox = el('div', { attrs: { hidden: true } });
    const email = F.field({ id: 'forgot-email', name: 'email', label: t('panel.login.email'), type: 'email', inputmode: 'email', autocomplete: 'username' });
    const submit = el('button', { className: 'btn btn--primary', attrs: { type: 'submit' }, text: t('panel.forgot.submit') });
    const form = el('form', { className: 'pform pform--narrow', attrs: { novalidate: true } }, [
      el('p', { text: t('panel.forgot.body') }), noticeBox, email.root, submit,
      el('a', { className: 'plink', attrs: { href: '#/giris' }, text: t('panel.forgot.back') })
    ]);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!cfg.PASSWORD_RESET_ENABLED) F.notice(noticeBox, 'info', t('panel.forgot.disabled'));
    });
    view.body.appendChild(form);
  }

  /** İki adımlı doğrulama yer tutucusu (şimdilik kapalı). */
  function showTwoFactor() {
    const view = AR.Panel.UI.shell.startView(t('panel.twoFactor.title'), t('panel.twoFactor.lead'), AUTH);
    const noticeBox = el('div', { attrs: { hidden: true } });
    F.notice(noticeBox, 'info', cfg.TWO_FACTOR_ENABLED ? '' : t('panel.twoFactor.disabled'));
    const code = F.field({ id: 'twofa-code', name: 'code', label: t('panel.twoFactor.code'), inputmode: 'numeric', autocomplete: 'one-time-code' });
    code.input.disabled = !cfg.TWO_FACTOR_ENABLED;
    const submit = el('button', { className: 'btn btn--primary', attrs: { type: 'submit', disabled: !cfg.TWO_FACTOR_ENABLED }, text: t('panel.twoFactor.submit') });
    const form = el('form', { className: 'pform pform--narrow', attrs: { novalidate: true } }, [noticeBox, code.root, submit,
      el('a', { className: 'plink', attrs: { href: '#/giris' }, text: t('panel.forgot.back') })]);
    form.addEventListener('submit', function (event) { event.preventDefault(); });
    view.body.appendChild(form);
  }

  AR.Panel.Screens = AR.Panel.Screens || {};
  AR.Panel.Screens.login = { show: show };
  AR.Panel.Screens.forgot = { show: showForgot };
  AR.Panel.Screens.twoFactor = { show: showTwoFactor };
})(window.AcilRadar = window.AcilRadar || {});

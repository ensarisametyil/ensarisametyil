/* =============================================================================
 * panel/js/screens/users.js
 * NE İŞE YARAR : Kullanıcı yönetimi (yalnız "users.manage" yetkisi olanlar):
 *                liste, yeni kullanıcı ekleme, rol değiştirme, pasif/etkin yapma.
 *                Hastane yöneticisi yalnız kendi hastanesinin kullanıcılarını görür.
 * VERDİĞİ      : AcilRadar.Panel.Screens.users → show(ctx)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Kim hangi rolü atayabilir: panel/js/config.js › ASSIGNABLE_ROLES
 * NOT: Parola belirleme bu ekranda YOKTUR; yeni kullanıcının ilk parolası arka uç
 *      sürecinde belirlenir (docs/SOZLESME-PANEL.md). Kullanıcı kendi rolünü değiştiremez.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.UI.dom;
  const el = dom.el;
  const t = AR.Strings.text;
  const format = AR.Strings.format;
  const F = AR.Panel.UI.form;
  const Rules = AR.Panel.Rules;
  const common = AR.Panel.Screens.common;
  const cfg = AR.Panel.Config;

  function hospitalName(ctx, id) {
    const hospital = ctx.hospitals().find(function (h) { return h.id === id; });
    return hospital ? hospital.name : (id || t('panel.common.none'));
  }

  /* ---- Satır işlemleri -------------------------------------------------------- */

  function patchUser(ctx, user, patch, onDone) {
    return ctx.api.updateUser(user.id, patch, ctx.api.newIdempotencyKey()).then(function (updated) {
      AR.Panel.UI.shell.notify('success', t('panel.users.updated', { name: updated.name }));
      onDone();
    }).catch(function (error) {
      if (error.code !== 'UNAUTHORIZED') AR.Panel.UI.shell.notify('error', common.errorMessage(error.code));
    });
  }

  function rowActions(ctx, user, reload) {
    if (user.id === ctx.user.id) return el('span', { className: 'field-hint', text: t('panel.users.self') });
    if (!Rules.canEditUser(ctx.user, user)) return el('span', { text: t('panel.common.none') });
    const roleSelect = el('select', { className: 'input input--compact', attrs: { 'aria-label': t('panel.users.roleSelectLabel', { name: user.name }) } },
      Rules.assignableRoles(ctx.user).map(function (role) { return el('option', { attrs: { value: role }, text: t('panel.roles.' + role) }); }));
    roleSelect.value = user.role;
    const save = el('button', { className: 'btn btn--secondary btn--compact', attrs: { type: 'button' }, text: t('panel.users.saveRole') });
    const toggle = el('button', {
      className: 'btn btn--ghost btn--compact',
      attrs: { type: 'button', 'aria-label': t(user.active ? 'panel.users.deactivateLabel' : 'panel.users.activateLabel', { name: user.name }) },
      text: t(user.active ? 'panel.users.deactivate' : 'panel.users.activate')
    });
    save.addEventListener('click', function () {
      if (roleSelect.value === user.role) return;
      F.setBusy(save, true);
      patchUser(ctx, user, { role: roleSelect.value }, reload).then(function () { F.setBusy(save, false); });
    });
    toggle.addEventListener('click', function () {
      F.setBusy(toggle, true);
      patchUser(ctx, user, { active: !user.active }, reload).then(function () { F.setBusy(toggle, false); });
    });
    return el('div', { className: 'prow-actions' }, [roleSelect, save, toggle]);
  }

  function renderList(container, pagerBox, ctx, result, reload, go) {
    const c = function (key) { return t('panel.users.columns.' + key); };
    AR.Panel.UI.table.render(container, {
      caption: t('panel.users.title'),
      rows: result.items,
      columns: [
        { label: c('name'), cell: function (u) { return u.name; } },
        { label: c('email'), cell: function (u) { return u.email; } },
        { label: c('role'), cell: function (u) { return t('panel.roles.' + u.role); } },
        { label: c('hospital'), cell: function (u) { return u.hospitalId ? hospitalName(ctx, u.hospitalId) : t('panel.common.none'); } },
        { label: c('status'), cell: function (u) { return t(u.active ? 'panel.common.active' : 'panel.common.inactive'); } },
        { label: c('lastLogin'), cell: function (u) { return u.lastLoginAtMs ? format.dateTime(u.lastLoginAtMs) : t('panel.common.never'); } },
        { label: c('actions'), cell: function (u) { return rowActions(ctx, u, reload); } }
      ]
    });
    AR.Panel.UI.table.pager(pagerBox, result, go);
  }

  /* ---- Yeni kullanıcı -------------------------------------------------------- */

  function buildAddForm(ctx, onAdded) {
    const roles = Rules.assignableRoles(ctx.user);
    const name = F.field({ id: 'user-name', name: 'name', label: t('panel.users.name'), autocomplete: 'off', maxlength: cfg.USER_LIMITS.NAME_MAX });
    const email = F.field({ id: 'user-email', name: 'email', label: t('panel.users.email'), type: 'email', inputmode: 'email', autocomplete: 'off', maxlength: cfg.USER_LIMITS.EMAIL_MAX });
    const role = F.select({ id: 'user-role', name: 'role', label: t('panel.users.role'), options: roles.map(function (r) { return { value: r, label: t('panel.roles.' + r) }; }) });
    const all = Rules.can(ctx.user, 'users.all');
    const hospital = F.select({ id: 'user-hospitalId', name: 'hospitalId', label: t('panel.users.hospital'), options: ctx.hospitals().map(function (h) { return { value: h.id, label: h.name }; }) });
    const syncHospital = function () { hospital.root.hidden = !all || cfg.HOSPITAL_ROLES.indexOf(role.input.value) === -1; };
    role.input.addEventListener('change', syncHospital);
    syncHospital();
    const fields = { name: name, email: email, role: role, hospitalId: hospital };
    const summary = el('div', { className: 'error-summary', attrs: { id: 'user-summary', tabindex: '-1', hidden: true } });
    const submit = el('button', { className: 'btn btn--primary', attrs: { type: 'submit' }, text: t('panel.users.add') });
    const form = el('form', { className: 'pform', attrs: { novalidate: true, 'aria-labelledby': 'user-add-title' } }, [summary, name.root, email.root, role.root, hospital.root, submit]);
    let key = null;
    form.addEventListener('input', function () { key = null; });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (submit.disabled) return;
      const checked = Rules.validateUser(F.values(form), ctx.user);
      if (!showFieldErrors(fields, checked.errors, summary)) return;
      if (!key) key = ctx.api.newIdempotencyKey();
      F.setBusy(submit, true);
      ctx.api.createUser(checked.values, key).then(function (user) {
        key = null;
        form.reset();
        syncHospital();
        AR.Panel.UI.shell.notify('success', t('panel.users.added', { name: user.name }));
        onAdded();
      }).catch(function (error) {
        if (error.code === 'VALIDATION') showFieldErrors(fields, error.fields, summary);
        else if (error.code !== 'UNAUTHORIZED') AR.Panel.UI.shell.notify('error', common.errorMessage(error.code));
      }).then(function () { F.setBusy(submit, false); });
    });
    return el('section', { className: 'pcard', attrs: { 'aria-labelledby': 'user-add-title' } }, [el('h2', { className: 'pcard__title', attrs: { id: 'user-add-title' }, text: t('panel.users.addTitle') }), form]);
  }

  /** @returns {boolean} hata yoksa true */
  function showFieldErrors(fields, errors, summary) {
    const labels = { name: t('panel.users.name'), email: t('panel.users.email'), role: t('panel.users.role'), hospitalId: t('panel.users.hospital') };
    Object.keys(fields).forEach(function (n) { fields[n].setError(errors[n] || null); });
    F.errorSummary(summary, Object.keys(fields).filter(function (n) { return errors[n]; }).map(function (n) { return { fieldId: 'user-' + n, label: labels[n], error: errors[n] }; }));
    return Object.keys(errors).length === 0;
  }

  function show(ctx) {
    const view = AR.Panel.UI.shell.startView(t('panel.users.title'), t('panel.users.lead'));
    const page = common.pageParam(ctx.params.sayfa);
    const table = el('div', { attrs: { 'aria-live': 'polite' } });
    const pager = el('div');
    const go = function (p) { ctx.navigate('kullanicilar', { sayfa: p }); };
    const load = function () {
      AR.Panel.UI.shell.loading(table);
      ctx.api.users({ page: page, pageSize: cfg.PAGE_SIZE }).then(function (result) {
        renderList(table, pager, ctx, result, load, go);
      }).catch(function (error) {
        if (error.code !== 'UNAUTHORIZED') AR.Panel.UI.shell.errorState(table, error.code, load);
      });
    };
    view.body.appendChild(buildAddForm(ctx, load));
    view.body.appendChild(table);
    view.body.appendChild(pager);
    load();
  }

  AR.Panel.Screens.users = { show: show };
})(window.AcilRadar = window.AcilRadar || {});

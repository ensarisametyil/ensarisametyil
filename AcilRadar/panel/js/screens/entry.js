/* =============================================================================
 * panel/js/screens/entry.js
 * NE İŞE YARAR : Veri girişi formu: doluluk, bekleyen sayıları, hekim sayısı ve
 *                tahmini bekleme aralıkları. Alan alan anlık doğrulama, gönderimde
 *                hata özeti, sunucunun alan bazlı hataları, çift gönderime karşı
 *                düğme kilidi + Idempotency-Key.
 * VERDİĞİ      : AcilRadar.Panel.Screens.entry → show(ctx)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Kurallar ve sınırlar: panel/js/rules.js, panel/js/config.js › RECORD_LIMITS
 *   - Alan etiketleri: panel/js/strings.js › panel.entry
 * NOT (KVKK): Formda YALNIZ toplu sayılar vardır. Serbest metin, hasta adı, kimlik
 *      numarası gibi kişisel veri alanı YOKTUR ve EKLENMEMELİDİR.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.UI.dom;
  const el = dom.el;
  const t = AR.Strings.text;
  const format = AR.Strings.format;
  const F = AR.Panel.UI.form;
  const Rules = AR.Panel.Rules;

  // Form alanları (sıra = ekrandaki sıra). Aralık alanlarının en az/en çok kutuları ayrıdır.
  const SINGLE_FIELDS = [
    { name: 'occupancyPercent', labelKey: 'panel.entry.occupancy', hintKey: 'panel.entry.occupancyHint' },
    { name: 'nonUrgentWaiting', labelKey: 'panel.entry.nonUrgentWaiting', hintKey: 'panel.entry.countHint' },
    { name: 'urgentWaiting', labelKey: 'panel.entry.urgentWaiting', hintKey: 'panel.entry.countHint' },
    { name: 'activePhysicians', labelKey: 'panel.entry.physicians', hintKey: 'panel.entry.countHint' }
  ];
  const RANGE_FIELDS = [
    { name: 'nonUrgentWaitMinutes', labelKey: 'panel.entry.nonUrgentWait' },
    { name: 'urgentWaitMinutes', labelKey: 'panel.entry.urgentWait' }
  ];

  function numberField(id, name, label, hint) {
    return F.field({ id: id, name: name, label: label, hint: hint, inputmode: 'numeric', maxlength: 5 });
  }

  /** Formu kurar; { form, fields: {ad: alan}, labels: {ad: etiket} } döndürür. */
  function buildForm() {
    const fields = {};
    const labels = {};
    const parts = SINGLE_FIELDS.map(function (f) {
      fields[f.name] = numberField('entry-' + f.name, f.name, t(f.labelKey), t(f.hintKey));
      labels[f.name] = t(f.labelKey);
      return fields[f.name].root;
    });
    RANGE_FIELDS.forEach(function (f) {
      ['Min', 'Max'].forEach(function (suffix) {
        const name = f.name + suffix;
        fields[name] = numberField('entry-' + name, name, t(suffix === 'Min' ? 'panel.entry.min' : 'panel.entry.max'));
        labels[name] = t(f.labelKey) + ' — ' + t(suffix === 'Min' ? 'panel.entry.min' : 'panel.entry.max');
      });
      parts.push(el('fieldset', { className: 'prange' }, [
        el('legend', { className: 'field__label', text: t(f.labelKey) }),
        el('p', { className: 'field-hint', text: t('panel.entry.rangeHint') }),
        el('div', { className: 'prange__pair' }, [fields[f.name + 'Min'].root, fields[f.name + 'Max'].root])
      ]));
    });
    return { parts: parts, fields: fields, labels: labels };
  }

  function fillFrom(fields, record) {
    SINGLE_FIELDS.forEach(function (f) { fields[f.name].input.value = String(record[f.name]); });
    RANGE_FIELDS.forEach(function (f) {
      fields[f.name + 'Min'].input.value = String(record[f.name][0]);
      fields[f.name + 'Max'].input.value = String(record[f.name][1]);
    });
  }

  /** Hataları alanlara yazar; yalnız "dokunulmuş" alanlarda (ya da hepsinde) gösterir. */
  function showErrors(built, errors, onlyTouched, touched) {
    Object.keys(built.fields).forEach(function (name) {
      if (onlyTouched && !touched.has(name)) return;
      built.fields[name].setError(errors[name] || null);
    });
  }

  function summaryItems(built, errors) {
    return Object.keys(built.fields).filter(function (name) { return errors[name]; }).map(function (name) {
      return { fieldId: 'entry-' + name, label: built.labels[name], error: errors[name] };
    });
  }

  /* ---- Gönderim ------------------------------------------------------------- */

  function submitRecord(ctx, state, ui) {
    const result = Rules.validateRecord(F.values(ui.form));
    showErrors(ui.built, result.errors, false);
    F.errorSummary(ui.summary, summaryItems(ui.built, result.errors));
    if (!result.ok || ui.submit.disabled) return;
    if (!state.key) state.key = ctx.api.newIdempotencyKey();
    F.setBusy(ui.submit, true);
    F.notice(ui.notice, null, '');
    ctx.api.createRecord(state.hospitalId, result.values, state.key).then(function (record) {
      state.key = null;
      state.latest = record;
      ui.form.reset();
      F.setBusy(ui.submit, false);
      F.notice(ui.notice, 'success', t('panel.entry.success', { time: format.clock(record.createdAtMs) }));
      ui.copy.hidden = false;
      ctx.refreshHospitals().catch(function () {});
    }).catch(function (error) {
      F.setBusy(ui.submit, false);
      if (error.code === 'UNAUTHORIZED') return;
      if (error.code === 'VALIDATION' && Object.keys(error.fields).length > 0) {
        state.key = null;
        showErrors(ui.built, error.fields, false);
        F.errorSummary(ui.summary, summaryItems(ui.built, error.fields));
        return;
      }
      F.notice(ui.notice, 'error', t(AR.Strings.has('panel.errors.codes.' + error.code) ? 'panel.errors.codes.' + error.code : 'panel.errors.codes.UNKNOWN'));
    });
  }

  function bindLiveValidation(ui, state) {
    const touched = new Set();
    ui.form.addEventListener('focusout', function (event) {
      if (!event.target.name) return;
      touched.add(event.target.name);
      showErrors(ui.built, Rules.validateRecord(F.values(ui.form)).errors, true, touched);
    });
    ui.form.addEventListener('input', function (event) {
      state.key = null;   // değer değişti: yeni gönderim, yeni anahtar
      if (touched.has(event.target.name)) showErrors(ui.built, Rules.validateRecord(F.values(ui.form)).errors, true, touched);
    });
  }

  /* ---- Ekran ---------------------------------------------------------------- */

  function renderForm(container, ctx, hospital) {
    const state = { hospitalId: hospital.id, key: null, latest: hospital.latest };
    const built = buildForm();
    const summary = el('div', { className: 'error-summary', attrs: { id: 'entry-summary', tabindex: '-1', hidden: true } });
    const notice = el('div', { attrs: { hidden: true } });
    const submit = el('button', { className: 'btn btn--primary', attrs: { type: 'submit' }, text: t('panel.entry.submit') });
    const copy = el('button', { className: 'btn btn--secondary', attrs: { type: 'button', hidden: !hospital.latest }, text: t('panel.entry.copyLast') });
    const reset = el('button', { className: 'btn btn--ghost', attrs: { type: 'reset' }, text: t('panel.entry.reset') });
    const form = el('form', { className: 'pform', attrs: { novalidate: true, 'aria-labelledby': 'view-title' } },
      [summary, notice].concat(built.parts, [el('div', { className: 'pactions' }, [submit, copy, reset])]));
    const ui = { form: form, built: built, summary: summary, notice: notice, submit: submit, copy: copy };
    copy.addEventListener('click', function () {
      if (!state.latest) return;
      fillFrom(built.fields, state.latest);
      state.key = null;
    });
    form.addEventListener('reset', function () {
      state.key = null;
      setTimeout(function () { showErrors(built, {}, false); F.errorSummary(summary, []); }, 0);
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      submitRecord(ctx, state, ui);
    });
    bindLiveValidation(ui, state);
    container.appendChild(el('h2', { className: 'pcard__title', text: hospital.name }));
    container.appendChild(el('p', { className: 'pnotice pnotice--info' }, [dom.icon('shield'), el('span', { text: t('panel.entry.privacy') })]));
    container.appendChild(form);
  }

  function show(ctx) {
    const view = AR.Panel.UI.shell.startView(t('panel.entry.title'), t('panel.entry.lead'));
    const picker = el('div');
    const body = el('div');
    view.body.appendChild(picker);
    view.body.appendChild(body);
    const hospitals = ctx.hospitals().filter(function (h) { return Rules.canCreateRecord(ctx.user, h.id); });
    const selected = hospitals.find(function (h) { return h.id === ctx.params.hastane; }) || hospitals[0];
    if (!selected) {
      F.notice(body, 'warning', t('panel.entry.readOnly'));
      return;
    }
    if (hospitals.length > 1) {
      AR.Panel.UI.table.hospitalPicker(picker, hospitals, selected.id, function (id) { ctx.navigate('veri-girisi', { hastane: id }); });
    }
    renderForm(body, ctx, selected);
  }

  AR.Panel.Screens = AR.Panel.Screens || {};
  AR.Panel.Screens.entry = { show: show };
})(window.AcilRadar = window.AcilRadar || {});

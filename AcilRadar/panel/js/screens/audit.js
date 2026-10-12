/* =============================================================================
 * panel/js/screens/audit.js
 * NE İŞE YARAR : Denetim kaydı: kim, ne zaman, hangi işlemi yaptı, neyi değiştirdi.
 *                Tarih süzgeci, sayfalama, CSV. Kapsam sunucu tarafından belirlenir
 *                (hastane yöneticisi yalnız kendi hastanesini görür).
 * VERDİĞİ      : AcilRadar.Panel.Screens.audit → show(ctx)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: işlem adları → panel/js/strings.js › panel.audit.actions
 * ========================================================================== */
(function (AR) {
  'use strict';

  const el = AR.UI.dom.el;
  const t = AR.Strings.text;
  const format = AR.Strings.format;
  const Rules = AR.Panel.Rules;
  const common = AR.Panel.Screens.common;
  const cfg = AR.Panel.Config;

  /** "user.update" → "panel.audit.actions.userUpdate" (metin anahtarında nokta kullanılamaz). */
  function actionLabel(action) {
    const key = 'panel.audit.actions.' + String(action).replace(/\.(\w)/g, function (m, ch) { return ch.toUpperCase(); });
    return /^[\w.]+$/.test(action) && AR.Strings.has(key) ? t(key) : t('panel.audit.unknownAction');
  }

  /** Değişiklik değerini okunur yazar (rol adı, etkin/pasif, aralık, sayı). */
  function valueText(field, value) {
    if (value === null || value === undefined) return t('panel.common.none');
    if (field === 'role' && AR.Strings.has('panel.roles.' + value)) return t('panel.roles.' + value);
    if (field === 'active') return t(value ? 'panel.common.active' : 'panel.common.inactive');
    if (Array.isArray(value) && value.length === 2) return format.minutesRange(value);
    if (field === 'occupancyPercent' && typeof value === 'number') return format.percent(value);
    return String(value);
  }

  function changesText(entry) {
    if (entry.changes.length === 0) return t('panel.common.none');
    return entry.changes.map(function (c) {
      const label = AR.Strings.has('panel.fields.' + c.field) ? t('panel.fields.' + c.field) : c.field;
      return t('panel.audit.change', { field: label, from: valueText(c.field, c.from), to: valueText(c.field, c.to) });
    }).join('; ');
  }

  const COLUMNS = [
    { key: 'time', value: function (a) { return format.dateTime(a.atMs); } },
    { key: 'actor', value: function (a) { return a.actorName || t('panel.common.none'); } },
    { key: 'action', value: function (a) { return actionLabel(a.action); } },
    { key: 'target', value: function (a) { return a.targetLabel || t('panel.common.none'); } },
    { key: 'changes', value: changesText }
  ];

  function show(ctx) {
    const view = AR.Panel.UI.shell.startView(t('panel.audit.title'), t('panel.audit.lead'));
    const query = { from: ctx.params.baslangic || '', to: ctx.params.bitis || '', page: common.pageParam(ctx.params.sayfa) };
    const go = function (patch) { ctx.navigate('denetim-kaydi', Object.assign({ baslangic: query.from, bitis: query.to, sayfa: 1 }, patch)); };
    const toolbar = el('div', { className: 'ptoolbar' });
    const filter = el('div');
    const table = el('div', { attrs: { 'aria-live': 'polite' } });
    const pager = el('div');
    [toolbar, filter, table, pager].forEach(function (node) { view.body.appendChild(node); });
    const columns = COLUMNS.map(function (c) { return { nowrap: c.key === 'time', label: t('panel.audit.columns.' + c.key), value: c.value, cell: c.value }; });
    if (Rules.can(ctx.user, 'export.csv')) {
      toolbar.appendChild(AR.Panel.UI.table.exportButton(function (button) {
        common.runExport(button, function (page, size) { return ctx.api.audit({ from: query.from, to: query.to, page: page, pageSize: size }); },
          columns, AR.Panel.Csv.fileName(t('panel.audit.csvName'), '', common.todayText(ctx.nowMs())));
      }));
    }
    AR.Panel.UI.table.dateFilter(filter, { from: query.from, to: query.to, idPrefix: 'audit' }, function (range) { go({ baslangic: range.from, bitis: range.to }); });
    const load = function () {
      AR.Panel.UI.shell.loading(table);
      ctx.api.audit({ from: query.from, to: query.to, page: query.page, pageSize: cfg.PAGE_SIZE }).then(function (result) {
        AR.Panel.UI.table.render(table, { caption: t('panel.audit.title'), rows: result.items, columns: columns });
        AR.Panel.UI.table.pager(pager, result, function (page) { go({ sayfa: page }); });
      }).catch(function (error) {
        if (error.code !== 'UNAUTHORIZED') AR.Panel.UI.shell.errorState(table, error.code, load);
      });
    };
    load();
  }

  AR.Panel.Screens.audit = { show: show, changesText: changesText };
})(window.AcilRadar = window.AcilRadar || {});

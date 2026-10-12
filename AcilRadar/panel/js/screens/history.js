/* =============================================================================
 * panel/js/screens/history.js
 * NE İŞE YARAR : Geçmiş kayıtlar: hastane seçimi (tümünü görebilenler için), tarih
 *                süzgeci, sayfalama ve CSV dışa aktarım. Süzgeç ve sayfa adreste
 *                tutulur (#/gecmis?hastane=…&sayfa=…); geri/ileri tuşu çalışır.
 * VERDİĞİ      : AcilRadar.Panel.Screens.history → show(ctx)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Sütunlar: COLUMNS (tablo ve CSV aynı tanımı kullanır)
 *   - Sayfa boyutu: panel/js/config.js › PAGE_SIZE
 * ========================================================================== */
(function (AR) {
  'use strict';

  const el = AR.UI.dom.el;
  const t = AR.Strings.text;
  const format = AR.Strings.format;
  const Rules = AR.Panel.Rules;
  const common = AR.Panel.Screens.common;
  const cfg = AR.Panel.Config;

  function col(key) {
    return t('panel.history.columns.' + key);
  }

  function pair(a, b) {
    return t('panel.history.pair', { a: a, b: b });
  }

  // Tablo ve CSV için ortak sütunlar (CSV'de yalnız düz metin kullanılır).
  const COLUMNS = [
    { key: 'time', value: function (r) { return format.dateTime(r.createdAtMs); } },
    { key: 'occupancy', value: function (r) { return format.percent(r.occupancyPercent); } },
    { key: 'crowding', value: function (r) { return r.crowdingLevel ? t('crowding.' + r.crowdingLevel) : t('panel.common.none'); } },
    { key: 'waiting', value: function (r) { return pair(format.number(r.nonUrgentWaiting), format.number(r.urgentWaiting)); } },
    { key: 'physicians', value: function (r) { return format.number(r.activePhysicians); } },
    { key: 'waits', value: function (r) { return pair(format.minutesRange(r.nonUrgentWaitMinutes), format.minutesRange(r.urgentWaitMinutes)); } },
    { key: 'by', value: function (r) { return r.createdByName || t('panel.common.none'); } }
  ];

  function show(ctx) {
    const view = AR.Panel.UI.shell.startView(t('panel.history.title'), t('panel.history.lead'));
    const hospitals = ctx.hospitals().filter(function (h) { return Rules.canAccessHospital(ctx.user, h.id); });
    const hospital = hospitals.find(function (h) { return h.id === ctx.params.hastane; }) || hospitals[0];
    if (!hospital) {
      AR.Panel.UI.form.notice(view.body, 'warning', t('panel.common.forbidden'));
      return;
    }
    const query = { from: ctx.params.baslangic || '', to: ctx.params.bitis || '', page: common.pageParam(ctx.params.sayfa) };
    const go = function (patch) {
      const next = Object.assign({ hastane: hospital.id, baslangic: query.from, bitis: query.to, sayfa: 1 }, patch);
      ctx.navigate('gecmis', next);
    };
    const toolbar = el('div', { className: 'ptoolbar' });
    const filter = el('div');
    const table = el('div', { attrs: { 'aria-live': 'polite' } });
    const pager = el('div');
    view.body.appendChild(toolbar);
    view.body.appendChild(filter);
    view.body.appendChild(table);
    view.body.appendChild(pager);

    if (hospitals.length > 1) AR.Panel.UI.table.hospitalPicker(toolbar, hospitals, hospital.id, function (id) { go({ hastane: id }); });
    else toolbar.appendChild(el('h2', { className: 'pcard__title', text: hospital.name }));
    if (Rules.can(ctx.user, 'export.csv')) {
      toolbar.appendChild(AR.Panel.UI.table.exportButton(function (button) {
        common.runExport(button,
          function (page, size) { return ctx.api.records(hospital.id, { from: query.from, to: query.to, page: page, pageSize: size }); },
          COLUMNS.map(function (c) { return { label: col(c.key), value: c.value }; }),
          AR.Panel.Csv.fileName(t('panel.history.csvName'), hospital.id, common.todayText(ctx.nowMs())));
      }));
    }
    AR.Panel.UI.table.dateFilter(filter, { from: query.from, to: query.to, idPrefix: 'history' }, function (range) { go({ baslangic: range.from, bitis: range.to }); });

    const load = function () {
      AR.Panel.UI.shell.loading(table);
      ctx.api.records(hospital.id, { from: query.from, to: query.to, page: query.page, pageSize: cfg.PAGE_SIZE }).then(function (result) {
        AR.Panel.UI.table.render(table, {
          caption: t('panel.history.title') + ' — ' + hospital.name,
          rows: result.items,
          columns: COLUMNS.map(function (c) { return { nowrap: c.key === 'time', label: col(c.key), cell: c.value }; })
        });
        AR.Panel.UI.table.pager(pager, result, function (page) { go({ sayfa: page }); });
      }).catch(function (error) {
        if (error.code !== 'UNAUTHORIZED') AR.Panel.UI.shell.errorState(table, error.code, load);
      });
    };
    load();
  }

  AR.Panel.Screens.history = { show: show, COLUMNS: COLUMNS };
})(window.AcilRadar = window.AcilRadar || {});

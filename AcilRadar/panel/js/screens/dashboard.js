/* =============================================================================
 * panel/js/screens/dashboard.js
 * NE İŞE YARAR : Özet ekranı.
 *                - Tek hastaneye bağlı roller: kendi hastanesinin son girişi, doluluk,
 *                  durum ve "halka açık sitede güncel mi?" uyarısı.
 *                - Tüm hastaneleri gören roller: her hastanenin son durumu tablosu.
 * VERDİĞİ      : AcilRadar.Panel.Screens.dashboard → show(ctx)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: eskime eşiği → panel/js/config.js › STALE_AFTER_MINUTES
 * NOT: Bilginin yaşı sunucu saatine göre hesaplanır (ctx.nowMs), cihaz saatine değil.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.UI.dom;
  const el = dom.el;
  const t = AR.Strings.text;
  const format = AR.Strings.format;
  const Rules = AR.Panel.Rules;
  const cfg = AR.Panel.Config;
  const MS_PER_MINUTE = 60000;

  function ageMinutes(record, nowMs) {
    return (nowMs - record.createdAtMs) / MS_PER_MINUTE;
  }

  /** 'fresh' | 'stale' | 'none' */
  function statusOf(hospital, nowMs) {
    if (!hospital.latest) return 'none';
    return ageMinutes(hospital.latest, nowMs) > cfg.STALE_AFTER_MINUTES ? 'stale' : 'fresh';
  }

  const STATUS_VIEW = {
    fresh: { badge: 'low', icon: 'check', key: 'panel.dashboard.statusFresh' },
    stale: { badge: 'stale', icon: 'clock', key: 'panel.dashboard.statusStale' },
    none: { badge: 'stale', icon: 'info', key: 'panel.dashboard.statusNone' }
  };

  function statusBadge(status) {
    const v = STATUS_VIEW[status];
    return el('span', { className: 'badge badge--' + v.badge }, [dom.icon(v.icon), el('span', { text: t(v.key) })]);
  }

  function crowdingBadge(record) {
    const level = record.crowdingLevel || 'stale';
    const icons = { low: 'check', medium: 'medium', high: 'alert', stale: 'info' };
    return el('span', { className: 'badge badge--' + level }, [dom.icon(icons[level]), el('span', { text: t('crowding.' + level) })]);
  }

  /* ---- Tek hastane ------------------------------------------------------------ */

  function metric(label, value) {
    return el('div', { className: 'pmetric' }, [el('dt', { text: label }), el('dd', { text: value })]);
  }

  function singleHospital(container, hospital, ctx) {
    const latest = hospital.latest;
    const status = statusOf(hospital, ctx.nowMs());
    const actions = el('div', { className: 'pactions' }, [
      Rules.canCreateRecord(ctx.user, hospital.id) ? el('a', { className: 'btn btn--primary', attrs: { href: '#/veri-girisi?hastane=' + encodeURIComponent(hospital.id) }, text: t('panel.dashboard.goEntry') }) : null,
      el('a', { className: 'btn btn--secondary', attrs: { href: '#/gecmis?hastane=' + encodeURIComponent(hospital.id) }, text: t('panel.dashboard.goHistory') })
    ]);
    const children = [el('h2', { className: 'pcard__title', text: hospital.name }), el('p', { className: 'field-hint', text: hospital.district || '' }), statusBadge(status)];
    if (!latest) {
      children.push(el('p', { text: t('panel.dashboard.noRecord') }));
    } else {
      const age = format.ago(ageMinutes(latest, ctx.nowMs()));
      children.push(el('p', { className: status === 'stale' ? 'pnotice pnotice--warning' : 'field-hint', attrs: { role: status === 'stale' ? 'alert' : false },
        text: status === 'stale' ? t('panel.dashboard.stale', { age: age }) : t('panel.dashboard.fresh') }));
      children.push(el('dl', { className: 'pmetrics' }, [
        metric(t('panel.dashboard.lastUpdate'), format.dateTime(latest.createdAtMs) + ' (' + age + ')'),
        metric(t('panel.dashboard.occupancy'), format.percent(latest.occupancyPercent)),
        metric(t('panel.fields.nonUrgentWaiting'), format.number(latest.nonUrgentWaiting)),
        metric(t('panel.fields.urgentWaiting'), format.number(latest.urgentWaiting)),
        metric(t('panel.fields.activePhysicians'), format.number(latest.activePhysicians))
      ]));
      children.push(crowdingBadge(latest));
    }
    children.push(actions);
    container.appendChild(el('section', { className: 'pcard', attrs: { 'aria-label': hospital.name } }, children));
  }

  /* ---- Tüm hastaneler ------------------------------------------------------- */

  function allHospitals(container, hospitals, ctx) {
    const c = function (key) { return t('panel.dashboard.columns.' + key); };
    container.appendChild(el('p', { className: 'pview__lead', text: t('panel.dashboard.allLead', { minutes: format.number(cfg.STALE_AFTER_MINUTES) }) }));
    const table = el('div');
    AR.Panel.UI.table.render(table, {
      caption: t('panel.dashboard.allTitle'),
      rows: hospitals,
      columns: [
        { label: c('hospital'), cell: function (h) { return h.name; } },
        { label: c('district'), cell: function (h) { return h.district || t('panel.common.none'); } },
        { label: c('lastUpdate'), cell: function (h) { return h.latest ? format.dateTime(h.latest.createdAtMs) : t('panel.common.none'); } },
        { label: c('occupancy'), cell: function (h) { return h.latest ? format.percent(h.latest.occupancyPercent) : t('panel.common.none'); } },
        { label: c('status'), cell: function (h) { return statusBadge(statusOf(h, ctx.nowMs())); } },
        { label: c('actions'), cell: function (h) { return el('a', { className: 'plink', attrs: { href: '#/gecmis?hastane=' + encodeURIComponent(h.id) }, text: t('panel.dashboard.goHistory') }); } }
      ]
    });
    container.appendChild(table);
  }

  function show(ctx) {
    const wide = Rules.can(ctx.user, 'hospitals.all');
    const view = AR.Panel.UI.shell.startView(wide ? t('panel.dashboard.allTitle') : t('panel.dashboard.title'), wide ? '' : t('panel.dashboard.lead'));
    const load = function () {
      AR.Panel.UI.shell.loading(view.body);
      ctx.refreshHospitals().then(function (hospitals) {
        dom.clear(view.body);
        if (wide) allHospitals(view.body, hospitals, ctx);
        else hospitals.forEach(function (h) { singleHospital(view.body, h, ctx); });
      }).catch(function (error) {
        if (error.code !== 'UNAUTHORIZED') AR.Panel.UI.shell.errorState(view.body, error.code, load);
      });
    };
    load();
  }

  AR.Panel.Screens = AR.Panel.Screens || {};
  AR.Panel.Screens.dashboard = { show: show, statusOf: statusOf };
})(window.AcilRadar = window.AcilRadar || {});

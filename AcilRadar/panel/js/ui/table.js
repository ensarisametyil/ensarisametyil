/* =============================================================================
 * panel/js/ui/table.js
 * NE İŞE YARAR : Liste ekranlarının ortak parçaları: duyarlı tablo (dar ekranda
 *                satırlar karta dönüşür, yatay kaydırma olmaz), sayfalama, tarih
 *                süzgeci, hastane seçici ve CSV düğmesi.
 * VERDİĞİ      : AcilRadar.Panel.UI.table
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: görünüm → panel/css/panel.css › .ptable, .pager
 * NOT: Hücre metinleri textContent ile yazılır (sunucu verisi HTML olarak yorumlanmaz).
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.UI.dom;
  const el = dom.el;
  const t = AR.Strings.text;
  const format = AR.Strings.format;

  /**
   * @param {HTMLElement} container
   * @param {{caption:string, columns:{label:string, cell:function(Object):(string|Node)}[], rows:Object[]}} o
   */
  function render(container, o) {
    dom.clear(container);
    if (o.rows.length === 0) {
      container.appendChild(el('div', { className: 'state state--neutral' }, [
        el('span', { className: 'state__icon' }, [dom.icon('info')]),
        el('div', { className: 'state__content' }, [el('p', { className: 'state__title', text: t('panel.common.empty') })])
      ]));
      return;
    }
    const head = el('tr', {}, o.columns.map(function (c) { return el('th', { attrs: { scope: 'col' }, text: c.label }); }));
    const body = el('tbody', {}, o.rows.map(function (row) {
      return el('tr', {}, o.columns.map(function (c) {
        const value = c.cell(row);
        return el('td', { className: c.nowrap ? 'is-nowrap' : '', data: { label: c.label } }, [value]);
      }));
    }));
    container.appendChild(el('div', { className: 'ptable-wrap' }, [el('table', { className: 'ptable' }, [
      el('caption', { className: 'visually-hidden', text: o.caption }),
      el('thead', {}, [head]),
      body
    ])]));
  }

  /**
   * Sayfalama: önceki / sonraki ve "Sayfa 2 / 7 · Toplam 140 kayıt".
   * @param {{page:number, pages:number, total:number}} info
   * @param {function(number)} onChange
   */
  function pager(container, info, onChange) {
    dom.clear(container);
    const prev = el('button', { className: 'btn btn--secondary', attrs: { type: 'button', disabled: info.page <= 1 }, text: t('panel.common.prev') });
    const next = el('button', { className: 'btn btn--secondary', attrs: { type: 'button', disabled: info.page >= info.pages }, text: t('panel.common.next') });
    prev.addEventListener('click', function () { onChange(info.page - 1); });
    next.addEventListener('click', function () { onChange(info.page + 1); });
    container.appendChild(el('nav', { className: 'pager', attrs: { 'aria-label': t('panel.common.pageOf', { page: format.number(info.page), pages: format.number(info.pages) }) } }, [
      prev,
      el('p', { className: 'pager__info', attrs: { 'aria-live': 'polite' }, text: t('panel.common.pageOf', { page: format.number(info.page), pages: format.number(info.pages) }) + ' · ' + t('panel.common.totalRows', { count: format.number(info.total) }) }),
      next
    ]));
  }

  /**
   * Tarih süzgeci (başlangıç–bitiş). Geçersiz aralıkta alan hatası gösterir.
   * @param {{from:string, to:string, idPrefix:string}} value
   * @param {function({from:string, to:string})} onApply
   */
  function dateFilter(container, value, onApply) {
    dom.clear(container);
    const F = AR.Panel.UI.form;
    const from = F.field({ id: value.idPrefix + '-from', name: 'from', label: t('panel.common.from'), type: 'date', value: value.from });
    const to = F.field({ id: value.idPrefix + '-to', name: 'to', label: t('panel.common.to'), type: 'date', value: value.to });
    const apply = el('button', { className: 'btn btn--secondary', attrs: { type: 'submit' }, text: t('panel.common.filter') });
    const clear = el('button', { className: 'btn btn--ghost', attrs: { type: 'button' }, text: t('panel.common.clearFilter') });
    const form = el('form', { className: 'pfilter', attrs: { novalidate: true } }, [from.root, to.root, el('div', { className: 'pfilter__actions' }, [apply, clear])]);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const ok = AR.Panel.Rules.validateDateRange(from.input.value, to.input.value).ok;
      from.setError(ok ? null : { key: 'rangeOrderDate' });
      if (!ok) {
        from.input.focus();
        return;
      }
      onApply({ from: from.input.value, to: to.input.value });
    });
    clear.addEventListener('click', function () { onApply({ from: '', to: '' }); });
    container.appendChild(form);
  }

  /** Tüm hastaneleri görebilen roller için hastane seçici. */
  function hospitalPicker(container, hospitals, selectedId, onChange) {
    dom.clear(container);
    const picker = AR.Panel.UI.form.select({
      id: 'hospital-picker', name: 'hospital', label: t('panel.common.hospital'), value: selectedId,
      options: hospitals.map(function (h) { return { value: h.id, label: h.name }; })
    });
    picker.input.addEventListener('change', function () { onChange(picker.input.value); });
    container.appendChild(picker.root);
  }

  /** "CSV olarak indir" düğmesi. */
  function exportButton(onClick) {
    const button = el('button', { className: 'btn btn--secondary', attrs: { type: 'button' } }, [dom.icon('list'), el('span', { text: t('panel.common.exportCsv') })]);
    button.addEventListener('click', function () { onClick(button); });
    return button;
  }

  AR.Panel.UI = AR.Panel.UI || {};
  AR.Panel.UI.table = Object.freeze({ render: render, pager: pager, dateFilter: dateFilter, hospitalPicker: hospitalPicker, exportButton: exportButton });
})(window.AcilRadar = window.AcilRadar || {});

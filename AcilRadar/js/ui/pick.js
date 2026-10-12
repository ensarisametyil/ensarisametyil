/* =============================================================================
 * js/ui/pick.js
 * NE İŞE YARAR : Öneri kutusu: seçimlere göre tahmini toplam süresi EN KISA olan
 *                acil servis + "Yol tarifi al". "En iyi" gibi değer yargısı içermez.
 * VERDİĞİ      : AcilRadar.UI.pick → render(container, row, rank, directionsTemplate)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Metinler: strings.js › pick ; görünüm: css/components.css › .pick
 * ========================================================================== */
(function (AR) {
  'use strict';

  const dom = AR.UI.dom;
  const el = dom.el;
  const t = AR.Strings.text;
  const format = AR.Strings.format;

  /**
   * @param {HTMLElement} container
   * @param {?Row} row       null → güncel bilgi yok iletisi
   * @param {number} rank    listedeki sırası (haritadaki numarayla aynı)
   * @param {string} directionsTemplate
   */
  function render(container, row, rank, directionsTemplate) {
    dom.clear(container);
    container.hidden = false;
    if (!row) {
      container.appendChild(el('p', { className: 'pick__none' }, [dom.icon('info'), el('span', { text: t('pick.none') })]));
      return;
    }
    const h = row.hospital;
    container.appendChild(el('div', { className: 'pick__body' }, [
      el('p', { className: 'pick__eyebrow', text: t('pick.title') }),
      el('p', { className: 'pick__name' }, [
        el('span', { className: 'rank rank--' + AR.UI.cards.statusOf(row).level, attrs: { 'aria-hidden': 'true' }, text: format.number(rank) }),
        el('span', { text: h.name })
      ]),
      el('p', { className: 'pick__meta', text: h.district + t('card.separator') + format.km(row.distanceKm) }),
      el('p', { className: 'total total--pick' }, [
        el('span', { className: 'total__label', text: t('pick.totalLabel') }),
        el('span', { className: 'total__value', text: format.minutesRange(row.totalMinutes) })
      ]),
      AR.UI.cards.buildBadge(AR.UI.cards.statusOf(row)),
      el('p', { className: 'pick__basis', text: t('pick.basis') })
    ]));
    container.appendChild(el('div', { className: 'pick__actions' }, [AR.UI.cards.buildDirections(row, directionsTemplate)]));
  }

  function hide(container) {
    dom.clear(container);
    container.hidden = true;
  }

  AR.UI = AR.UI || {};
  AR.UI.pick = Object.freeze({ render: render, hide: hide });
})(window.AcilRadar = window.AcilRadar || {});

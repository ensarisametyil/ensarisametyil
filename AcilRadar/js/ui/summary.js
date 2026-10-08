/* =============================================================================
 * DOSYA ADI    : js/ui/summary.js
 * NE İŞE YARAR : Tanıtım alanındaki üç özet kutusunu (hastane sayısı, en az yoğun,
 *                en yakın) ve "Son güncelleme: …" satırını çizer.
 * NEYİ ALIR    : calc.summarize() sonucu, son güncelleme zamanı (app.js'ten).
 * NEYİ VERİR   : AcilRadar.ui.summary → render, renderLastUpdated, setRefreshing
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Kutu başlıkları/alt yazıları: js/strings.js › stats
 *   - Kutuların HTML iskeleti: index.html › "4. TANITIM"
 * ========================================================================== */
(function (AR) {
  'use strict';

  const text = AR.text;
  const format = AR.format;

  function setStat(name, value, note) {
    const valueEl = document.getElementById('stat-' + name + '-value');
    const noteEl = document.getElementById('stat-' + name + '-note');
    if (valueEl) valueEl.textContent = value;
    if (noteEl) noteEl.textContent = note;
  }

  /**
   * @param {?{count:number, leastCrowded:?Row, nearest:?Row}} summary  null → yükleniyor
   */
  function render(summary) {
    if (!summary) {
      ['hospitals', 'least', 'nearest'].forEach(function (name) { setStat(name, text('stats.none'), ''); });
      return;
    }
    setStat('hospitals', format.number(summary.count), text('stats.hospitalsNote'));
    const least = summary.leastCrowded;
    setStat('least',
      least ? least.hospital.name : text('stats.none'),
      least ? text('stats.occupancyNote', { value: format.percent(least.hospital.occupancyPercent) }) : text('stats.noneNote'));
    const nearest = summary.nearest;
    setStat('nearest',
      nearest ? nearest.hospital.name : text('stats.none'),
      nearest ? text('stats.distanceNote', { value: format.km(nearest.distanceKm) }) : '');
  }

  /** "Son güncelleme: 13:35 (5 dakika önce)" */
  function renderLastUpdated(updatedMs, nowMs) {
    const node = document.getElementById('last-updated');
    if (!node) return;
    if (!updatedMs) {
      node.textContent = text('status.neverUpdated');
      return;
    }
    const date = new Date(updatedMs);
    node.textContent = text('status.lastUpdated', { time: format.clock(date), relative: format.relative(date, nowMs) });
  }

  /** Arka planda yenilerken küçük "Güncelleniyor…" göstergesi. */
  function setRefreshing(isRefreshing) {
    const node = document.getElementById('refresh-indicator');
    if (!node) return;
    node.hidden = !isRefreshing;
    node.textContent = isRefreshing ? text('status.refreshing') : '';
  }

  AR.ui = AR.ui || {};
  AR.ui.summary = Object.freeze({
    render: render,
    renderLastUpdated: renderLastUpdated,
    setRefreshing: setRefreshing
  });
})(window.AcilRadar = window.AcilRadar || {});

/* =============================================================================
 * js/ui/hero.js
 * NE İŞE YARAR : Tanıtım alanındaki üç özet kutusunu doldurur
 *                (acil servis sayısı · en az yoğun · en yakın).
 * VERDİĞİ      : AcilRadar.UI.hero → render(summary)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Kutu başlıkları: strings.js › stats ; iskelet: index.html › "3. TANITIM"
 * NOT: summary null ise kutular "—" ile yer tutar; yükseklik değişmez (düzen kayması yok).
 * ========================================================================== */
(function (AR) {
  'use strict';

  const t = AR.Strings.text;
  const format = AR.Strings.format;

  function setStat(name, value, note) {
    document.getElementById('stat-' + name + '-value').textContent = value;
    document.getElementById('stat-' + name + '-note').textContent = note;
  }

  /** @param {?{count:number, leastCrowded:?Row, nearest:?Row}} summary */
  function render(summary) {
    if (!summary) {
      ['count', 'least', 'nearest'].forEach(function (name) { setStat(name, t('stats.none'), ' '); });
      return;
    }
    setStat('count', format.number(summary.count), t('stats.hospitalsNote'));
    const least = summary.leastCrowded;
    setStat('least', least ? least.hospital.name : t('stats.none'),
      least ? t('stats.occupancy', { value: format.percent(least.hospital.occupancyPercent) }) : t('stats.noFresh'));
    const nearest = summary.nearest;
    setStat('nearest', nearest ? nearest.hospital.name : t('stats.none'),
      nearest ? t('stats.distance', { value: format.km(nearest.distanceKm) }) : ' ');
  }

  AR.UI = AR.UI || {};
  AR.UI.hero = Object.freeze({ render: render });
})(window.AcilRadar = window.AcilRadar || {});

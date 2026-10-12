/* =============================================================================
 * js/ui/info.js
 * NE İŞE YARAR : Bilgi bölümlerinin dinamik kısımları: "Süre nasıl hesaplanıyor?"
 *                metnini config'teki GERÇEK katsayılarla doldurur; "Veriler nereden
 *                geliyor?" metnini gelen verinin kaynağına göre değiştirir.
 * VERDİĞİ      : AcilRadar.UI.info → renderFormula(cfg), renderDataSource(source)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Metinler: strings.js › info.formula*, info.source.*
 * ========================================================================== */
(function (AR) {
  'use strict';

  const t = AR.Strings.text;
  const format = AR.Strings.format;
  const SOURCE_KEYS = ['simulated', 'hospital', 'official', 'mixed', 'none'];

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  /** Formül metni katsayılarla birlikte (katsayı değişince metin kendiliğinden güncellenir). */
  function renderFormula(cfg) {
    const travel = cfg.TRAVEL;
    setText('formula-travel', t('info.formulaTravel', {
      roadFactor: format.number(travel.ROAD_FACTOR, 2),
      speed: format.number(travel.AVERAGE_SPEED_KMH),
      traffic: format.number(travel.TRAFFIC_FACTOR_MAX, 2),
      minTravel: format.number(travel.MIN_TRAVEL_MINUTES)
    }));
    setText('formula-registration', t('info.formulaRegistration', {
      min: format.number(cfg.REGISTRATION_MINUTES[0]),
      max: format.number(cfg.REGISTRATION_MINUTES[1])
    }));
    setText('formula-stale', t('info.formulaStale', { minutes: format.number(cfg.STALE_AFTER_MINUTES) }));
  }

  /** @param {string} source  simulated | hospital | official | mixed | none */
  function renderDataSource(source) {
    const key = SOURCE_KEYS.indexOf(source) !== -1 ? source : 'none';
    setText('source-text', t('info.source.' + key));
  }

  AR.UI = AR.UI || {};
  AR.UI.info = Object.freeze({ renderFormula: renderFormula, renderDataSource: renderDataSource });
})(window.AcilRadar = window.AcilRadar || {});

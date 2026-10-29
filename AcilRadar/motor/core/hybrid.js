/* =============================================================================
 * motor/core/hybrid.js
 * NE İŞE YARAR : HİBRİT YÖNTEM SEÇİMİ. Geriye dönük testte (docs/DOGRULAMA_RAPORU.md,
 *   MODEL_KARTI §8) benzetim motoru, doluluk tahmininde basit yöntemlerden tutarlı
 *   biçimde iyi çıkmadı; bu yüzden ürün çıktısı şöyle kurulur:
 *     doluluk, şimdi ve +60 dk'ya kadar ... SÜREKLİLİK (bildirilen güncel doluluk aynen kalır)
 *     doluluk, +60 dk'dan sonra ve akşam 20:00 ... MEVSİMSEL ORTALAMA (aynı saat-gün, geçmiş)
 *     bekleme, "şimdi" ............................ MOTOR (kanıtlı: bugünkü formülden iyi)
 *     bekleme, ileri ufuklar ....................... bugünkü ürün formülü (bekleyen ÷ hekim × 9 dk)
 *   Bu dosya yalnız yöntem seçimi ve basit yöntemleri içerir; motor core/forecast.js'tedir.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: eşikler ve bayraklar → config.HYBRID.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'), require('./time.js'));
  else { const ns = root.AcilRadarMotor = root.AcilRadarMotor || {}; ns.hybrid = factory(ns.config, ns.time); }
})(typeof self !== 'undefined' ? self : this, function (config, time) {
  'use strict';

  const H = config.HYBRID;
  const MS_PER_MINUTE = 60000;
  const MS_PER_DAY = 86400000;
  const HALF_HOUR = 30;

  /** Doluluk için hangi yöntem? offset: dakika (0 = şimdi). */
  function occupancyMethod(offsetMinutes) {
    return offsetMinutes <= H.PERSISTENCE_UNTIL_MINUTES ? 'persistence' : 'seasonal';
  }

  /** Yarım saatlik hafta dilimi (0–335): haftanın günü + saat + yarım saat. */
  function weekSlot(ms) {
    const p = time.parts(ms);
    return p.hourOfWeek * 2 + (p.minute >= HALF_HOUR ? 1 : 0);
  }

  /**
   * Aynı saat-gün dilimindeki geçmiş gözlemlerin ortalaması (ham yüzde; sınırlama çağıranda).
   * @param {{ms:number, percent:number}[]} history  geçmiş gözlemler (yalnız nowMs'den önceki kullanılır)
   * @param {number} targetMs
   * @param {number} nowMs
   * @param {number} [minSamples]  en az örnek (varsayılan config.HYBRID.SEASONAL_MIN_SAMPLES)
   * @returns {?{percent:number, samples:number}} yetersiz örnekte null
   */
  function seasonalMean(history, targetMs, nowMs, minSamples) {
    const need = minSamples === undefined ? H.SEASONAL_MIN_SAMPLES : minSamples;
    if (!Array.isArray(history)) return null;
    const slot = weekSlot(targetMs);
    const oldest = nowMs - H.SEASONAL_MAX_HISTORY_DAYS * MS_PER_DAY;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      if (h.ms >= nowMs || h.ms < oldest || weekSlot(h.ms) !== slot) continue;
      sum += h.percent;
      n += 1;
    }
    return n >= Math.max(1, need) ? { percent: sum / n, samples: n } : null;
  }

  /** Bugünkü ürün formülü: bekleme alt sınırı = bekleyen ÷ hekim × 9 dk; üst = ×1,4. Sarı: sabit aralık. */
  function formulaWait(greenWaiting, physicians) {
    const f = H.FORMULA;
    const low = (greenWaiting || 0) / Math.max(1, physicians || 1) * f.MINUTES_PER_PATIENT;
    return { green: [low, low * f.SPREAD], yellow: f.YELLOW.slice() };
  }

  /**
   * Bir ufuk için doluluk yüzdesi ve yöntem.
   * @param {number} observedRaw  bildirilen güncel doluluk (ham yüzde)
   * @param {boolean} [forceSeasonal]  akşam 20:00: ufuk ne olursa olsun mevsimsel ortalama
   * @returns {{method:'persistence'|'seasonal'|'none', percent:?number, samples:?number, fellBack:boolean}}
   *   Mevsimsel örnek yetersizse: normal ufuklarda süreklilik (fellBack:true; çağıran 'occupancyHistory'
   *   varsayıldı yazar). Akşamda süreklilik ÇOK daha kötü ölçüldüğü için sayı üretilmez (method:'none').
   */
  function occupancyFor(offsetMinutes, observedRaw, history, targetMs, nowMs, forceSeasonal) {
    if (!forceSeasonal && occupancyMethod(offsetMinutes) === 'persistence') return { method: 'persistence', percent: observedRaw, samples: null, fellBack: false };
    const s = seasonalMean(history, targetMs, nowMs);
    if (s) return { method: 'seasonal', percent: s.percent, samples: s.samples, fellBack: false };
    if (forceSeasonal) return { method: 'none', percent: null, samples: 0, fellBack: true };
    return { method: 'persistence', percent: observedRaw, samples: 0, fellBack: true };
  }

  return { occupancyMethod: occupancyMethod, seasonalMean: seasonalMean, formulaWait: formulaWait, occupancyFor: occupancyFor, weekSlot: weekSlot, MS_PER_MINUTE: MS_PER_MINUTE };
});

/* =============================================================================
 * motor/core/fallback.js
 * NE İŞE YARAR : Düşüş basamakları — kullanıcıyı yanıltmama kuralları.
 *   'full'     : taze, çekirdek alanlar (hekim, bekleyen sayıları) var
 *   'partial'  : taze ama çekirdek alanlardan biri varsayıldı (assumedFields)
 *   'seasonal' : taze kayıt var ama bekleyen sayılarının İKİSİ de yok → mevcut
 *                kuyruk bilinmiyor; boş sistemden 6 saatlik ısınma ile yalnız
 *                mevsimsel öncülden tahmin (güven: düşük)
 *   'unknown'  : bayat / gelecek tarihli / geçersiz → SAYISAL TAHMİN ÜRETİLMEZ
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: basamak koşulları → tier(); ısınma → WARMUP_MINUTES.
 * ========================================================================== */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.AcilRadarMotor = root.AcilRadarMotor || {}).fallback = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WARMUP_MINUTES = 360;   // mevsimsel basamakta boş sistemden ısınma süresi

  /** @param {Object} assessment quality.assess() çıktısı */
  function tier(assessment) {
    if (!assessment || assessment.status !== 'ok') return 'unknown';
    if (assessment.waitingMissing) return 'seasonal';
    if (assessment.assumedCore > 0) return 'partial';
    return 'full';
  }

  /** Bilinmeyen durum çıktısı (sayı yok). */
  function unknownResult(assessment, modelVersion) {
    return {
      ok: true,
      level: 'unknown',
      reason: assessment ? assessment.reason : 'INVALID',
      modelVersion: modelVersion,
      ageMinutes: assessment && isFinite(assessment.ageMinutes) ? Math.round(assessment.ageMinutes) : null
    };
  }

  return { tier: tier, unknownResult: unknownResult, WARMUP_MINUTES: WARMUP_MINUTES };
});

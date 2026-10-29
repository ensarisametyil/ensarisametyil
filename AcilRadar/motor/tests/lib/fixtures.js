/* =============================================================================
 * motor/tests/lib/fixtures.js
 * NE İŞE YARAR : Testlerde kullanılan örnek girdiler ("Örnek ... Hastanesi"; gerçek
 *                kurum ve gerçek veri DEĞİLDİR).
 * ========================================================================== */
'use strict';

const NOW = Date.parse('2026-10-13T14:00:00+03:00');   // Salı 14:00 (normal gün)
const MIN = 60000;

function input(overrides) {
  return Object.assign({
    hospitalId: 'ornek-01',
    updatedAtMs: NOW - 5 * MIN,
    dataSource: 'hospital',
    activePhysicians: 6,
    greenWaiting: 20,
    yellowWaiting: 6,
    inService: 5,
    boarding: 2,
    bedCapacity: 30,
    arrivalsLastHour: 14
  }, overrides || {});
}

/** Saatlik geçmiş: düzenli örüntü × katsayı (testlerde öğrenmeyi sınamak için). */
function history(hours, perHour, endMs) {
  const end = endMs || NOW;
  const list = [];
  for (let i = hours; i >= 1; i--) list.push({ startMs: end - i * 3600000, arrivals: typeof perHour === 'function' ? perHour(end - i * 3600000) : perHour });
  return list;
}

/**
 * Geçmiş doluluk gözlemleri (mevsimsel ortalama için): her 30 dk, 'weeks' hafta, percentFn(ms) → ham yüzde.
 */
function occupancyHistory(weeks, percentFn, endMs) {
  const end = endMs || NOW;
  const list = [];
  const step = 30 * MIN;
  for (let ms = end - weeks * 7 * 86400000; ms < end; ms += step) list.push({ ms: ms, percent: typeof percentFn === 'function' ? percentFn(ms) : percentFn });
  return list;
}

module.exports = { NOW: NOW, MIN: MIN, input: input, history: history, occupancyHistory: occupancyHistory };

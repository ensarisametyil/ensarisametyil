/* =============================================================================
 * motor/tools/mock-adapter.js
 * NE İŞE YARAR : Örnek API (tools/mock-server.js) için motor bağlayıcısı.
 *   Sunucu açılınca sentetik bir dünya (tools/simulator.js, rejim A) benzetilir; her
 *   istekte o andaki 30 dakikalık gözlem motora verilir, motorun çıktısı EK-1
 *   sözleşmesine (1.2 isteğe bağlı alanlarla) dönüştürülür.
 *   Hastane adı, ilçe, konum gibi kimlik bilgileri js/mock-data.js'ten gelir.
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: benzetim sayısı → ENGINE_OPTIONS; dünya → WORLD_DAYS.
 * NOT: Üretilen bütün sayılar ÖRNEKTİR (dataSource: "simulated"); gerçek değildir.
 * ========================================================================== */
'use strict';

const engine = require('../core/index.js');
const time = require('../core/time.js');
const simulator = require('./simulator.js');

const MS_PER_MINUTE = 60000;
const WORLD_PAST_DAYS = 7;
const WORLD_DAYS = 10;
const BUCKET_MINUTES = simulator.PROBE_EVERY_MINUTES;
const ENGINE_OPTIONS = { maxRuns: 600, explain: true };
const SLOTS = ['now', '2h', 'evening'];
const CACHE_LIMIT = 256;

function createAdapter(sampleIds) {
  let world = null;
  const cache = new Map();

  function ensureWorld(nowMs) {
    const end = world ? world.startMs + world.weeks * 7 * 1440 * MS_PER_MINUTE : 0;
    if (world && nowMs >= world.startMs + WORLD_PAST_DAYS * 1440 * MS_PER_MINUTE && nowMs < end - 1440 * MS_PER_MINUTE) return;
    const startMs = time.startOfLocalDay(nowMs) - WORLD_PAST_DAYS * 1440 * MS_PER_MINUTE;
    world = simulator.simulateWorld({ regime: 'A', seed: 'ornek-api', startMs: startMs, weeks: WORLD_DAYS / 7, hospitals: sampleIds.length });
    cache.clear();
  }

  /** @returns {Object<string, ?Object>} slot → sözleşme alanları */
  function forecastFor(index, nowMs) {
    ensureWorld(nowMs);
    const hospital = world.hospitals[index];
    const obsIndex = Math.floor((nowMs - world.startMs) / (BUCKET_MINUTES * MS_PER_MINUTE));
    const key = index + '@' + obsIndex;
    if (cache.has(key)) return cache.get(key);
    const ob = hospital.obs[Math.max(0, Math.min(hospital.obs.length - 1, obsIndex))];
    const input = simulator.engineInput(world, hospital, hospital.obs.indexOf(ob), null);
    input.hospitalId = sampleIds[index];
    input.dataSource = 'simulated';
    const result = engine.computeHospital(input, Object.assign({ nowMs: ob.ms, seed: 'ornek-api/' + key }, ENGINE_OPTIONS));
    const out = {};
    SLOTS.forEach(function (slot) { out[slot] = engine.toContract(result, slot); });
    cache.set(key, out);
    if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
    return out;
  }

  /**
   * js/mock-data.js'in "normal" yanıtındaki sayısal alanları motor çıktısıyla değiştirir.
   * Akşam 20:00 geçtiyse (motor akşam üretmez) eski örnek kayıt olduğu gibi kalır.
   */
  function enrich(body, slot, nowMs) {
    if (!body || !Array.isArray(body.hospitals)) return body;
    body.schemaVersion = '1.2';
    body.hospitals = body.hospitals.map(function (h) {
      const index = sampleIds.indexOf(h.hospitalId);
      if (index === -1) return h;
      const contract = forecastFor(index, nowMs)[slot];
      return contract ? Object.assign({}, h, contract) : h;
    });
    return body;
  }

  return { enrich: enrich, forecastFor: forecastFor, warm: function (nowMs) { sampleIds.forEach(function (id, i) { forecastFor(i, nowMs); }); } };
}

module.exports = { createAdapter: createAdapter };

#!/usr/bin/env node
/* =============================================================================
 * tests/contract.test.js
 * NE İŞE YARAR : Bir API'nin EK-1 sözleşmesine (docs/SOZLESME.md) uyduğunu denetler.
 *                Yalnız fetch kullanır (Node 18+); bağımlılığı yoktur.
 * KULLANIM     :
 *   Örnek sunucuya karşı (senaryolar dahil):
 *     node tools/mock-server.js &   sonra   MOCK_SCENARIOS=1 node tests/contract.test.js
 *   Gerçek arka uca karşı (yalnız genel sözleşme):
 *     BASE_URL=https://ornek-sunucu node tests/contract.test.js
 * NOT: Arayüzün kendi doğrulayıcısı (js/schema.js) da her yanıtı işler; böylece
 *      "sunucu şemaya uyuyor" ve "arayüz bunu gösterebiliyor" birlikte sınanır.
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { validateAgainst } = require('./lib/json-schema-lite');
const { loadModules } = require('./lib/load-modules');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:8787').replace(/\/$/, '');
const WITH_SCENARIOS = process.env.MOCK_SCENARIOS === '1';
const SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'hospitals.schema.json'), 'utf8'));
const AR = loadModules().AR;
const CLIENT_TIMEOUT_MS = AR.Config.REQUEST.TIMEOUT_MS;

const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name: name, ok: true });
  } catch (error) {
    results.push({ name: name, ok: false, message: error.message });
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function url(pathname, params) {
  const u = new URL(BASE_URL + pathname);
  Object.keys(params || {}).forEach(function (k) { u.searchParams.set(k, params[k]); });
  return u.toString();
}

async function getJson(pathname, params, headers) {
  const response = await fetch(url(pathname, params), { headers: Object.assign({ Accept: 'application/json' }, headers || {}) });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (error) { body = undefined; }
  return { response: response, body: body, text: text };
}

function expectSchema(body, pointer) {
  const errors = validateAgainst(SCHEMA, body, pointer);
  expect(errors.length === 0, 'şema hataları:\n' + errors.slice(0, 10).join('\n'));
}

/** Arayüzün doğrulayıcısı yanıtı düşmeden işleyebiliyor mu? */
function expectClientAccepts(body) {
  const normalized = AR.Schema.normalizeResponse(body, Date.now());
  expect(Array.isArray(normalized.hospitals), 'arayüz yanıtı işleyemedi');
  return normalized;
}

/* ---- Genel sözleşme (her sunucu) --------------------------------------------- */

async function generalChecks() {
  for (const at of AR.Config.TIME_SLOTS.map(function (s) { return s.id; })) {
    await check('GET /api/v1/hospitals?at=' + at + ' → 200, JSON, şemaya uygun, arayüz kabul ediyor', async function () {
      const r = await getJson('/api/v1/hospitals', { at: at, region: AR.Config.REGION_ID });
      expect(r.response.status === 200, 'durum ' + r.response.status);
      expect(/application\/json/.test(r.response.headers.get('content-type') || ''), 'Content-Type JSON değil');
      expectSchema(r.body);
      const n = expectClientAccepts(r.body);
      expect(n.skippedCount === 0, n.skippedCount + ' kayıt arayüz tarafından atlandı');
    });
  }
  await check('Yanıt başlıkları: Cache-Control ve ETag', async function () {
    const r = await getJson('/api/v1/hospitals', { at: 'now' });
    expect(/max-age=\d+/.test(r.response.headers.get('cache-control') || ''), 'Cache-Control yok');
    expect(Boolean(r.response.headers.get('etag')), 'ETag yok');
  });
  await check('If-None-Match ile 304 (ETag desteği)', async function () {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const first = await getJson('/api/v1/hospitals', { at: 'now' });
      const etag = first.response.headers.get('etag');
      const second = await fetch(url('/api/v1/hospitals', { at: 'now' }), { headers: { 'If-None-Match': etag } });
      if (second.status === 304) return;
    }
    throw new Error('304 dönmedi');
  });
  await check('Geçersiz at → 400 BAD_REQUEST hata zarfı', async function () {
    const r = await getJson('/api/v1/hospitals', { at: 'yarin' });
    expect(r.response.status === 400, 'durum ' + r.response.status);
    expectSchema(r.body, '#/$defs/errorEnvelope');
    expect(r.body.error.code === 'BAD_REQUEST', 'kod ' + r.body.error.code);
  });
  await check('GET /api/v1/status → { ok, time }', async function () {
    const r = await getJson('/api/v1/status');
    expect(r.response.status === 200, 'durum ' + r.response.status);
    expectSchema(r.body, '#/$defs/status');
  });
  await check('İstek konum içermez: uç nokta lat/lng beklemez (parametresiz de 200)', async function () {
    const r = await getJson('/api/v1/hospitals', { at: 'now' });
    expect(r.response.status === 200, 'durum ' + r.response.status);
  });
}

/* ---- Örnek sunucu senaryoları -------------------------------------------- */

async function scenario(name, params) {
  return getJson('/api/v1/hospitals', Object.assign({ at: 'now', region: 'gebze', scenario: name }, params || {}));
}

async function scenarioChecks() {
  await check('Senaryo empty → 200, boş liste', async function () {
    const r = await scenario('empty');
    expectSchema(r.body);
    expect(expectClientAccepts(r.body).hospitals.length === 0, 'liste boş değil');
  });
  await check('Senaryo stale → şemaya uygun; arayüzde eski kayıtlar işaretlenir', async function () {
    const r = await scenario('stale');
    expectSchema(r.body);
    const n = expectClientAccepts(r.body);
    const rows = AR.Calc.buildRows(n.hospitals, AR.Config.DISTRICTS[0], n, Date.now(), AR.Config);
    expect(rows.some(function (row) { return row.isStale; }), 'eski kayıt yok');
  });
  await check('Senaryo broken → şemaya UYMAZ ama arayüz düşmez, geçerliler kalır', async function () {
    const r = await scenario('broken');
    expect(validateAgainst(SCHEMA, r.body).length > 0, 'bozuk senaryo şemaya uydu');
    expect(expectClientAccepts(r.body).hospitals.length === 5, 'geçerli kayıt sayısı');
  });
  await check('Senaryo many → 200 kayıt, şemaya uygun', async function () {
    const r = await scenario('many');
    expectSchema(r.body);
    expect(r.body.hospitals.length === 200, String(r.body.hospitals.length));
  });
  await check('Senaryo unsupported → arayüz UNSUPPORTED_SCHEMA verir', async function () {
    const r = await scenario('unsupported');
    let code = null;
    try { AR.Schema.normalizeResponse(r.body, Date.now()); } catch (error) { code = error.code; }
    expect(code === 'UNSUPPORTED_SCHEMA', 'kod ' + code);
  });
  const errors = [['error', 500, 'INTERNAL'], ['unavailable', 503, 'UNAVAILABLE'], ['ratelimit', 429, 'RATE_LIMITED']];
  for (const e of errors) {
    await check('Senaryo ' + e[0] + ' → ' + e[1] + ' + hata zarfı ' + e[2], async function () {
      const r = await scenario(e[0]);
      expect(r.response.status === e[1], 'durum ' + r.response.status);
      expectSchema(r.body, '#/$defs/errorEnvelope');
      expect(AR.Schema.normalizeErrorBody(e[1], r.body) === e[2], 'kod eşlemesi');
      if (e[1] === 429) expect(/^\d+$/.test(r.response.headers.get('retry-after') || ''), 'Retry-After yok');
    });
  }
  await check('Senaryo html → JSON değil (arayüz INVALID_RESPONSE gösterir)', async function () {
    const r = await scenario('html');
    expect(!/json/.test(r.response.headers.get('content-type')), 'JSON döndü');
  });
  await check('Senaryo invalidjson → JSON çözümlenemez', async function () {
    const r = await scenario('invalidjson');
    expect(r.body === undefined, 'çözümlendi');
  });
  await check('Senaryo offline → bağlantı kopar (fetch hata verir)', async function () {
    let failed = false;
    try { await scenario('offline'); } catch (error) { failed = true; }
    expect(failed, 'bağlantı kopmadı');
  });
  await check('Senaryo slow → istemci zaman aşımını (' + CLIENT_TIMEOUT_MS + ' ms) aşar', async function () {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, CLIENT_TIMEOUT_MS);
    let aborted = false;
    try {
      await fetch(url('/api/v1/hospitals', { at: 'now', scenario: 'slow' }), { signal: controller.signal });
    } catch (error) {
      aborted = error.name === 'AbortError';
    } finally {
      clearTimeout(timer);
    }
    expect(aborted, 'zaman aşımına uğramadı');
  });
}

(async function main() {
  console.log('Hedef: ' + BASE_URL + (WITH_SCENARIOS ? ' (senaryolar dahil)' : ''));
  await generalChecks();
  if (WITH_SCENARIOS) await scenarioChecks();
  results.forEach(function (r) { console.log((r.ok ? '  ✔ ' : '  ✘ ') + r.name + (r.ok ? '' : '\n      → ' + r.message)); });
  const failed = results.filter(function (r) { return !r.ok; }).length;
  console.log('\n' + (results.length - failed) + ' geçti, ' + failed + ' kaldı (toplam ' + results.length + ').');
  process.exitCode = failed ? 1 : 0;
})();

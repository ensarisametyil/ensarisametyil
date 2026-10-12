#!/usr/bin/env node
/* =============================================================================
 * tests/run-unit.js
 * NE İŞE YARAR : Node ile (bağımlılıksız) çalışan testler:
 *                1) tests/unit/cases.js birim vakaları (calc, schema, strings, mock)
 *                2) Örnek veri çıktısının docs/hospitals.schema.json'a uygunluğu
 *                3) js/api.js ağ davranışı (yeniden deneme, 429, ETag, iptal, zaman aşımı)
 *                4) Kaynak taramaları (metin anahtarları, gömülü metin, innerHTML/eval yok)
 *                5) Leaflet yerel kopyasının özeti (boyut bütçesi: tools/size-report.js)
 * KULLANIM     : node tests/run-unit.js
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodeAssert = require('assert');
const { loadModules, ROOT } = require('./lib/load-modules');
const { validateAgainst } = require('./lib/json-schema-lite');

const SCHEMA = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'hospitals.schema.json'), 'utf8'));
const LEAFLET_SHA256 = 'db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a';

const results = [];
const pending = [];
const assert = {
  ok: function (value, message) { nodeAssert.ok(value, message); },
  equal: function (a, b, message) { nodeAssert.strictEqual(a, b, message); },
  deepEqual: function (a, b, message) { nodeAssert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), message); }
};

function run(name, fn) {
  const entry = { name: name, ok: false, message: '' };
  results.push(entry);
  const promise = Promise.resolve().then(fn).then(function () { entry.ok = true; }, function (error) { entry.message = error.message; });
  pending.push(promise);
  return promise;
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

/* ---- 1. Paylaşılan birim vakaları ------------------------------------------ */

async function runSharedCases() {
  const loaded = loadModules();
  const vm = require('vm');
  vm.runInContext(read('tests/unit/cases.js'), loaded.sandbox, { filename: 'tests/unit/cases.js' });
  for (const testCase of loaded.sandbox.AcilRadarTests) {
    if (testCase.dom) continue;
    await run(testCase.name, function () { return testCase.run(loaded.AR, assert); });
  }
}

/* ---- 2. Şema doğrulaması ---------------------------------------------------- */

async function runSchemaChecks() {
  const AR = loadModules().AR;
  const now = Date.now();
  ['normal', 'empty', 'stale', 'many', 'notice'].forEach(function (scenario) {
    ['now', '2h', 'evening'].forEach(function (at) {
      run('Şema: örnek veri "' + scenario + '" (at=' + at + ') hospitals.schema.json ile geçerli', function () {
        const body = AR.Mock.build(scenario, { at: at, region: 'gebze' }, now).body;
        assert.deepEqual(validateAgainst(SCHEMA, JSON.parse(JSON.stringify(body))), []);
      });
    });
  });
  run('Şema: "broken" senaryosu şemaya UYMAZ (test senaryosu gerçekten bozuk)', function () {
    const body = AR.Mock.build('broken', { at: 'now', region: 'gebze' }, now).body;
    assert.ok(validateAgainst(SCHEMA, JSON.parse(JSON.stringify(body))).length > 0);
  });
  ['error', 'unavailable', 'ratelimit'].forEach(function (scenario) {
    run('Şema: "' + scenario + '" hata zarfı geçerli', function () {
      const res = AR.Mock.build(scenario, { at: 'now', region: 'gebze' }, now);
      assert.ok(res.status >= 400);
      assert.deepEqual(validateAgainst(SCHEMA, res.body, '#/$defs/errorEnvelope'), []);
    });
  });
}

/* ---- 3. API ağ davranışı (sahte fetch) ------------------------------------- */

function jsonResponse(status, body, headers) {
  const all = Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, headers || {});
  return {
    status: status,
    ok: status >= 200 && status < 300,
    headers: { get: function (name) { const key = Object.keys(all).find(function (k) { return k.toLowerCase() === name.toLowerCase(); }); return key ? all[key] : null; } },
    text: function () { return Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)); }
  };
}

/** API'yi 'production' ortamında, hızlandırılmış zamanlayıcılarla yükler. */
function loadApi(fetchImpl) {
  const loaded = loadModules();
  const sandbox = loaded.sandbox;
  const vm = require('vm');
  // Zamanlayıcılar 100 kat hızlandırılır (8 sn zaman aşımı → 80 ms); sıraları korunur.
  const fastTimeout = function (fn, ms) { return setTimeout(fn, ms / 100); };
  const fresh = { console: sandbox.console, Intl: Intl, URL: URL, URLSearchParams: URLSearchParams, setTimeout: fastTimeout, clearTimeout: clearTimeout, AbortController: AbortController, navigator: { onLine: true }, fetch: fetchImpl };
  fresh.window = fresh;
  fresh.window.location = { href: 'https://acilradar.invalid/', search: '' };
  vm.createContext(fresh);
  vm.runInContext(read('js/config.js').replace("ENVIRONMENT: 'mock'", "ENVIRONMENT: 'production'"), fresh);
  ['js/strings.js', 'js/schema.js', 'js/api.js'].forEach(function (f) { vm.runInContext(read(f), fresh, { filename: f }); });
  return fresh;
}

function body() {
  return { schemaVersion: '1.0', generatedAt: '2026-10-12T22:00:00+03:00', hospitals: [{ hospitalId: 'h1', name: 'Örnek', district: 'Gebze', lat: 40.8, lng: 29.4, occupancyPercent: 50, crowdingLevel: 'medium', estimatedGreenWaitMinutes: [10, 20], estimatedYellowWaitMinutes: [5, 10], updatedAt: '2026-10-12T21:58:00+03:00', isForecast: false, dataSource: 'hospital' }] };
}

async function expectApiError(promise, code) {
  try {
    await promise;
  } catch (error) {
    assert.equal(error.code, code);
    return error;
  }
  throw new Error(code + ' bekleniyordu');
}

async function runApiChecks() {
  await run('API: istek yalnız at ve region içerir; çerez gönderilmez (credentials: omit)', async function () {
    let seen = null;
    const env = loadApi(function (url, init) { seen = { url: url, init: init }; return Promise.resolve(jsonResponse(200, body())); });
    await env.AcilRadar.Api.getHospitals({ at: '2h', region: 'gebze' });
    const url = new URL(seen.url);
    assert.equal(url.pathname, '/api/v1/hospitals');
    assert.deepEqual(Array.from(url.searchParams.keys()).sort(), ['at', 'region']);
    assert.equal(seen.init.credentials, 'omit');
  });
  await run('API: 5xx → en çok 2 yeniden deneme, sonra başarı', async function () {
    let calls = 0;
    const env = loadApi(function () { calls += 1; return Promise.resolve(calls < 3 ? jsonResponse(500, { error: { code: 'INTERNAL', message: 'x' } }) : jsonResponse(200, body())); });
    const r = await env.AcilRadar.Api.getHospitals({ at: 'now', region: null });
    assert.equal(calls, 3);
    assert.equal(r.hospitals.length, 1);
  });
  await run('API: 5xx üç kez → INTERNAL (3 istek)', async function () {
    let calls = 0;
    const env = loadApi(function () { calls += 1; return Promise.resolve(jsonResponse(503, { error: { code: 'UNAVAILABLE', message: 'x' } })); });
    await expectApiError(env.AcilRadar.Api.getHospitals({ at: 'now' }), 'UNAVAILABLE');
    assert.equal(calls, 3);
  });
  await run('API: 4xx yeniden denenmez', async function () {
    let calls = 0;
    const env = loadApi(function () { calls += 1; return Promise.resolve(jsonResponse(400, { error: { code: 'BAD_REQUEST', message: 'x' } })); });
    await expectApiError(env.AcilRadar.Api.getHospitals({ at: 'now' }), 'BAD_REQUEST');
    assert.equal(calls, 1);
  });
  await run('API: 429 → RATE_LIMITED, Retry-After okunur, yeniden denenmez', async function () {
    let calls = 0;
    const env = loadApi(function () { calls += 1; return Promise.resolve(jsonResponse(429, { error: { code: 'RATE_LIMITED', message: 'x' } }, { 'Retry-After': '30' })); });
    const error = await expectApiError(env.AcilRadar.Api.getHospitals({ at: 'now' }), 'RATE_LIMITED');
    assert.equal(error.retryAfterMs, 30000);
    assert.equal(calls, 1);
  });
  await run('API: ağ hatası → 3 deneme sonra NETWORK', async function () {
    let calls = 0;
    const env = loadApi(function () { calls += 1; return Promise.reject(new TypeError('Failed to fetch')); });
    await expectApiError(env.AcilRadar.Api.getHospitals({ at: 'now' }), 'NETWORK');
    assert.equal(calls, 3);
  });
  await run('API: zaman aşımı → TIMEOUT', async function () {
    const env = loadApi(function (url, init) {
      return new Promise(function (resolve, reject) {
        init.signal.addEventListener('abort', function () { reject(Object.assign(new Error('aborted'), { name: 'AbortError' })); });
      });
    });
    await expectApiError(env.AcilRadar.Api.getHospitals({ at: 'now' }), 'TIMEOUT');
  });
  await run('API: HTML ya da bozuk JSON → INVALID_RESPONSE', async function () {
    const html = loadApi(function () { return Promise.resolve(jsonResponse(200, '<html></html>', { 'Content-Type': 'text/html' })); });
    await expectApiError(html.AcilRadar.Api.getHospitals({ at: 'now' }), 'INVALID_RESPONSE');
    const broken = loadApi(function () { return Promise.resolve(jsonResponse(200, '{"hospitals": [')); });
    await expectApiError(broken.AcilRadar.Api.getHospitals({ at: 'now' }), 'INVALID_RESPONSE');
  });
  await run('API: ana sürüm 2 → UNSUPPORTED_SCHEMA', async function () {
    const env = loadApi(function () { return Promise.resolve(jsonResponse(200, Object.assign(body(), { schemaVersion: '2.0' }))); });
    await expectApiError(env.AcilRadar.Api.getHospitals({ at: 'now' }), 'UNSUPPORTED_SCHEMA');
  });
  await run('API: ETag → If-None-Match; 304 önbellekteki veriyi döndürür', async function () {
    const sent = [];
    const env = loadApi(function (url, init) {
      sent.push(init.headers['If-None-Match'] || null);
      return Promise.resolve(sent.length === 1 ? jsonResponse(200, body(), { ETag: '"v1"' }) : { status: 304, ok: false, headers: { get: function () { return null; } }, text: function () { return Promise.resolve(''); } });
    });
    await env.AcilRadar.Api.getHospitals({ at: 'now' });
    const second = await env.AcilRadar.Api.getHospitals({ at: 'now' });
    assert.deepEqual(sent, [null, '"v1"']);
    assert.equal(second.hospitals.length, 1);
  });
  await run('API: en son istek kazanır (önceki ABORTED)', async function () {
    const env = loadApi(function (url, init) {
      return new Promise(function (resolve, reject) {
        const timer = setTimeout(function () { resolve(jsonResponse(200, body())); }, 20);
        init.signal.addEventListener('abort', function () { clearTimeout(timer); reject(Object.assign(new Error('a'), { name: 'AbortError' })); });
      });
    });
    const first = env.AcilRadar.Api.getHospitals({ at: 'now' });
    const second = env.AcilRadar.Api.getHospitals({ at: '2h' });
    await expectApiError(first, 'ABORTED');
    assert.equal((await second).hospitals.length, 1);
  });
  await run('API: çevrimdışıyken istek atılmaz (OFFLINE)', async function () {
    let calls = 0;
    const env = loadApi(function () { calls += 1; return Promise.resolve(jsonResponse(200, body())); });
    env.navigator.onLine = false;
    await expectApiError(env.AcilRadar.Api.getHospitals({ at: 'now' }), 'OFFLINE');
    assert.equal(calls, 0);
  });
  await run('API: istek kancası (ileride kimlik doğrulama) tek noktadan başlık ekler', async function () {
    let header = null;
    const env = loadApi(function (url, init) { header = init.headers.Authorization; return Promise.resolve(jsonResponse(200, body())); });
    env.AcilRadar.Api.setRequestHook(function (init) { init.headers.Authorization = 'Bearer deneme'; return init; });
    await env.AcilRadar.Api.getHospitals({ at: 'now' });
    assert.equal(header, 'Bearer deneme');
  });
}

/* ---- 4. Kaynak taramaları --------------------------------------------------- */

const JS_FILES = fs.readdirSync(path.join(ROOT, 'js')).filter(function (f) { return f.endsWith('.js'); }).map(function (f) { return 'js/' + f; })
  .concat(fs.readdirSync(path.join(ROOT, 'js', 'ui')).map(function (f) { return 'js/ui/' + f; }));

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/\s.*$/gm, '');
}

function runSourceChecks() {
  const AR = loadModules().AR;
  const html = read('index.html');
  run('Kaynak: index.html\'deki tüm data-text anahtarları strings.js\'te', function () {
    const clean = html.replace(/<!--[\s\S]*?-->/g, '');
    const keys = [];
    let m;
    const re = /data-text(?:-list)?="([^"]+)"/g;
    while ((m = re.exec(clean))) keys.push(m[1]);
    const reAttr = /data-text-attr="([^"]+)"/g;
    while ((m = reAttr.exec(clean))) m[1].split(';').forEach(function (p) { keys.push(p.split(':')[1].trim()); });
    assert.ok(keys.length > 60, 'anahtar sayısı ' + keys.length);
    assert.deepEqual(keys.filter(function (k) { return !AR.Strings.has(k); }), []);
  });
  run('Kaynak: HTML\'deki zorunlu sabit metinler strings.js ile aynı', function () {
    const s = AR.Strings.data;
    assert.ok(html.indexOf('<title>' + s.app.documentTitle + '</title>') !== -1, 'title');
    assert.ok(html.indexOf('name="description" content="' + s.app.metaDescription + '"') !== -1, 'description');
    assert.ok(html.indexOf('property="og:description" content="' + s.app.metaDescription + '"') !== -1, 'og:description');
    assert.ok(html.indexOf('data-text="topbar.call">' + s.topbar.call + '<') !== -1, '112 yedek yazısı');
  });
  run('Kaynak: JS\'te çağrılan text(\'…\') anahtarlarının hepsi var', function () {
    const missing = [];
    const re = /\bt(?:ext)?\('([A-Za-z0-9_.]+)'\s*[,)]/g;
    JS_FILES.forEach(function (f) {
      const src = stripComments(read(f));
      let m;
      while ((m = re.exec(src))) if (!AR.Strings.has(m[1])) missing.push(f + ': ' + m[1]);
    });
    assert.deepEqual(missing, []);
  });
  run('Kaynak: strings.js ve mock-data.js dışında gömülü Türkçe metin yok', function () {
    const found = [];
    JS_FILES.filter(function (f) { return ['js/strings.js', 'js/mock-data.js'].indexOf(f) === -1; }).forEach(function (f) {
      const literals = stripComments(read(f)).match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) || [];
      literals.forEach(function (lit) { if (/[çğıöşüÇĞİÖŞÜ]/.test(lit)) found.push(f + ': ' + lit); });
    });
    assert.deepEqual(found, []);
  });
  run('Kaynak: innerHTML, eval, satır içi olay ve satır içi betik/stil yok', function () {
    const offenders = [];
    JS_FILES.forEach(function (f) {
      const src = stripComments(read(f));
      if (/\.innerHTML\s*=|insertAdjacentHTML|\beval\(|new Function\(|document\.write/.test(src)) offenders.push(f);
    });
    ['index.html', '404.html'].forEach(function (f) {
      const src = read(f);
      if (/\son[a-z]+=/i.test(src) || /<script(?![^>]*\bsrc=)[^>]*>/i.test(src) || /<style/i.test(src) || /\sstyle=/i.test(src)) offenders.push(f);
    });
    assert.deepEqual(offenders, []);
  });
  run('Kaynak: dış bağlantılar rel="noopener noreferrer" ile açılır', function () {
    const src = read('js/ui/cards.js');
    assert.ok(src.indexOf("target: '_blank', rel: 'noopener noreferrer'") !== -1);
  });
  run('Kaynak: tek global ad (window.AcilRadar)', function () {
    JS_FILES.forEach(function (f) {
      const src = read(f);
      assert.ok(/\}\)\(window\.AcilRadar = window\.AcilRadar \|\| \{\}\);\s*$/.test(src), f);
    });
  });
}

/* ---- 5. Leaflet özeti -------------------------------------------------------- */

function runBudgetChecks() {
  run('Leaflet yerel kopyası beklenen sürüm (SHA-256)', function () {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'vendor/leaflet/leaflet.js'))).digest('hex');
    assert.equal(hash, LEAFLET_SHA256);
  });
}

(async function main() {
  await runSharedCases();
  await runSchemaChecks();
  await runApiChecks();
  runSourceChecks();
  runBudgetChecks();
  await Promise.all(pending);
  results.forEach(function (r) { console.log((r.ok ? '  ✔ ' : '  ✘ ') + r.name + (r.ok ? '' : '\n      → ' + r.message.split('\n').join('\n        '))); });
  const failed = results.filter(function (r) { return !r.ok; }).length;
  console.log('\n' + (results.length - failed) + ' geçti, ' + failed + ' kaldı (toplam ' + results.length + ').');
  process.exitCode = failed ? 1 : 0;
})();

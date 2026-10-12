#!/usr/bin/env node
/* =============================================================================
 * tools/mock-server.js
 * NE İŞE YARAR : Yalnız GELİŞTİRME için, bağımlılıksız örnek API sunucusu.
 *                docs/SOZLESME.md'deki sözleşmeye (EK-1) birebir uyar ve arayüzü
 *                aynı adresten, önerilen güvenlik başlıklarıyla (CSP dahil) sunar.
 * KULLANIM     : node tools/mock-server.js [--port=8787] [--scenario=normal]
 *                Tarayıcı: http://localhost:8787  (config.js › ENVIRONMENT: 'production'
 *                ya da 'development' ile gerçek ağ yolu denenir)
 *                Senaryo tek istekte: /api/v1/hospitals?at=now&scenario=ratelimit
 * SENARYOLAR   : normal, empty, stale, broken, many, notice, unsupported, error,
 *                unavailable, ratelimit (js/mock-data.js) + slow, offline, html,
 *                invalidjson (bu dosya).
 * NOT: Veri üretimi js/mock-data.js'ten gelir (tek kaynak). Canlı ortamda KULLANILMAZ.
 * ========================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const ARGS = Object.fromEntries(process.argv.slice(2).map(function (arg) { return arg.replace(/^--/, '').split('='); }));
const PORT = Number(ARGS.port || process.env.PORT || 8787);
const DEFAULT_SCENARIO = ARGS.scenario || process.env.MOCK_SCENARIO || 'normal';
const CACHE_SECONDS = 30;
const SLOW_EXTRA_MS = 2000;

/* ---- Tarayıcı dosyalarını Node'da yükle (config + mock-data) ------------- */

function loadBrowserModules(files) {
  const sandbox = { window: {}, console: console, Intl: Intl, URLSearchParams: URLSearchParams, setTimeout: setTimeout, clearTimeout: clearTimeout };
  sandbox.window.location = { href: 'http://localhost/', search: '' };
  vm.createContext(sandbox);
  files.forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  });
  return sandbox.window.AcilRadar;
}

const AR = loadBrowserModules(['js/config.js', 'js/mock-data.js']);
const cfg = AR.Config;

/* ---- Güvenlik başlıkları (docs/GUVENLIK.md ile aynı) --------------------- */

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), camera=(), microphone=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, If-None-Match, Authorization',
  'Access-Control-Expose-Headers': 'ETag, Retry-After',
  'Access-Control-Max-Age': '600'
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png'
};

/* ---- API ------------------------------------------------------------------ */

function sendJson(req, res, status, body, extraHeaders) {
  const text = JSON.stringify(body);
  const etag = '"' + crypto.createHash('sha1').update(text).digest('hex').slice(0, 16) + '"';
  const headers = Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=' + CACHE_SECONDS }, CORS_HEADERS, extraHeaders || {});
  if (status === 200) {
    headers.ETag = etag;
    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
  }
  res.writeHead(status, headers);
  res.end(text);
}

/** Sunucu tarafına özgü senaryolar (ağ davranışı). true dönerse yanıt verilmiştir. */
function handleTransportScenario(scenario, req, res, respondNormally) {
  if (scenario === 'offline') {
    req.socket.destroy();
    return true;
  }
  if (scenario === 'slow') {
    setTimeout(respondNormally, cfg.REQUEST.TIMEOUT_MS + SLOW_EXTRA_MS);
    return true;
  }
  if (scenario === 'html') {
    res.writeHead(200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, CORS_HEADERS));
    res.end('<!doctype html><title>Bakım</title><p>Bakım çalışması</p>');
    return true;
  }
  if (scenario === 'invalidjson') {
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, CORS_HEADERS));
    res.end('{"schemaVersion": "1.0", "hospitals": [');
    return true;
  }
  return false;
}

function handleHospitals(req, res, url) {
  const scenario = url.searchParams.get('scenario') || DEFAULT_SCENARIO;
  const query = { at: url.searchParams.get('at'), region: url.searchParams.get('region') };
  // Yanıt 30 sn'lik dilimlerde sabit kalır; böylece ETag/304 anlamlı olur.
  const nowMs = Math.floor(Date.now() / (CACHE_SECONDS * 1000)) * CACHE_SECONDS * 1000;
  const respondNormally = function () {
    const result = AR.Mock.build(scenario === 'slow' ? 'normal' : scenario, query, nowMs);
    sendJson(req, res, result.status, result.body, result.headers);
  };
  if (!handleTransportScenario(scenario, req, res, respondNormally)) respondNormally();
}

function handleStatus(req, res) {
  const now = AR.Mock.istanbulIso(Date.now());
  sendJson(req, res, 200, { ok: true, time: now, dataUpdatedAt: now });
}

/* ---- Statik dosyalar --------------------------------------------------------- */

function serveStatic(req, res, url) {
  const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.normalize(path.join(ROOT, requested));
  if (!filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(filePath, function (error, data) {
    if (error) {
      res.writeHead(404, Object.assign({ 'Content-Type': MIME['.html'] }, SECURITY_HEADERS));
      res.end(fs.readFileSync(path.join(ROOT, '404.html')));
      return;
    }
    res.writeHead(200, Object.assign({ 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }, SECURITY_HEADERS));
    res.end(data);
  });
}

/* ---- Yönlendirme ------------------------------------------------------------ */

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(req, res, 405, { error: { code: 'BAD_REQUEST', message: 'Yalnız GET desteklenir.' } });
    return;
  }
  if (url.pathname === cfg.API_PATHS.hospitals) handleHospitals(req, res, url);
  else if (url.pathname === '/api/v1/status') handleStatus(req, res);
  else if (url.pathname.indexOf('/api/') === 0) sendJson(req, res, 404, { error: { code: 'BAD_REQUEST', message: 'Bilinmeyen uç nokta.' } });
  else serveStatic(req, res, url);
});

server.listen(PORT, function () {
  console.log('AcilRadar örnek API: http://localhost:' + PORT + '  (varsayılan senaryo: ' + DEFAULT_SCENARIO + ')');
});

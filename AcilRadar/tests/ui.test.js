#!/usr/bin/env node
/* =============================================================================
 * tests/ui.test.js
 * NE İŞE YARAR : Gerçek tarayıcıda (Playwright + Chromium) durum matrisi:
 *                yükleniyor, boş, hata, 429, eski veri, bozuk veri, sürüm uyuşmazlığı,
 *                çevrimdışı, konum izni, harita yüklenemedi, ekran genişlikleri,
 *                A+ yazı, klavye akışı, yazdırma, zorunlu renkler, JS kapalı, CSP …
 *                Sayfa tools/mock-server.js üzerinden, önerilen CSP başlığıyla açılır.
 * KULLANIM     : node tests/ui.test.js
 *                (isteğe bağlı) PLAYWRIGHT_MODULE=/yol/playwright  AXE_PATH=/yol/axe.min.js
 * NOT: Playwright ve axe-core yalnız GELİŞTİRME yardımcısıdır; sayfa bunlara bağlı değildir.
 *      Playwright bulunamazsa test atlanır (çıkış kodu 0, açık uyarıyla).
 * ========================================================================== */
'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let chromium;
try {
  chromium = require(process.env.PLAYWRIGHT_MODULE || 'playwright').chromium;
} catch (error) {
  console.log('Playwright bulunamadı; arayüz testleri ATLANDI. (PLAYWRIGHT_MODULE ile yol verilebilir.)');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const PORT = 8799;
const BASE = 'http://localhost:' + PORT;
const AXE_PATH = process.env.AXE_PATH || '';
const TRANSPARENT_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const STRINGS = loadStrings();

function loadStrings() {
  const vm = require('vm');
  const sandbox = { window: {}, console: console, Intl: Intl };
  vm.createContext(sandbox);
  ['js/config.js', 'js/strings.js'].forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox); });
  return sandbox.window.AcilRadar.Strings;
}

const results = [];
let browser;

async function check(name, fn) {
  try {
    await fn();
    results.push({ name: name, ok: true });
  } catch (error) {
    results.push({ name: name, ok: false, message: String(error.message).split('\n')[0] });
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Yeni sayfa. env: 'production' (gerçek ağ yolu, mock-server) | 'mock' (tarayıcı içi örnek veri)
 * @returns {Promise<{page, ctx, log, requests, setScenario}>}
 */
async function open(options) {
  const o = Object.assign({ env: 'production', scenario: 'normal', width: 1024, height: 900, colorScheme: 'light' }, options);
  const ctx = await browser.newContext({
    viewport: { width: o.width, height: o.height }, colorScheme: o.colorScheme, timezoneId: 'Europe/Istanbul', locale: 'tr-TR',
    permissions: o.permissions || [], geolocation: o.geolocation, javaScriptEnabled: o.javaScriptEnabled !== false, reducedMotion: o.reducedMotion || 'no-preference',
    bypassCSP: Boolean(o.bypassCSP)   // yalnız axe-core enjeksiyonu için
  });
  const page = await ctx.newPage();
  const log = { errors: [], warnings: [], csp: [] };
  const requests = [];
  let scenario = o.scenario;
  page.on('pageerror', function (e) { log.errors.push(e.message); });
  page.on('console', function (m) {
    const text = m.text();
    if (/Content Security Policy|Refused to/.test(text)) log.csp.push(text);
    if (m.type() === 'error' && !/Failed to load resource/.test(text)) log.errors.push(text);
    if (m.type() === 'warning') log.warnings.push(text);
  });
  if (o.clock) await page.clock.setFixedTime(new Date(o.clock));
  if (o.initScript) await page.addInitScript(o.initScript);
  await page.route('https://tile.openstreetmap.org/**', function (r) { r.fulfill({ status: 200, contentType: 'image/png', body: TRANSPARENT_PNG }); });
  await page.route('**/js/config.js', async function (route) {
    const source = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8')
      .replace("ENVIRONMENT: 'mock'", "ENVIRONMENT: '" + o.env + "'")
      .replace('TIMEOUT_MS: 8000', 'TIMEOUT_MS: ' + (o.timeoutMs || 8000));
    route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: source });
  });
  await page.route('**/api/v1/hospitals*', function (route) {
    const u = new URL(route.request().url());
    u.searchParams.set('scenario', scenario);
    requests.push(u.toString());
    route.continue({ url: u.toString() });
  });
  if (o.blockLeaflet) await page.route('**/vendor/leaflet/**', function (r) { r.abort(); });
  if (o.blockApp) await page.route('**/js/app.js', function (r) { r.abort(); });
  await page.goto(BASE + '/' + (o.query || ''));
  return { page: page, ctx: ctx, log: log, requests: requests, setScenario: function (s) { scenario = s; } };
}

async function cardCount(page) {
  await page.waitForFunction(function () { return document.getElementById('results-list').getAttribute('aria-busy') === 'false'; }, null, { timeout: 15000 });
  return page.locator('#results-list .card').count();
}

async function horizontalOverflow(page) {
  return page.evaluate(function () { return document.documentElement.scrollWidth - document.documentElement.clientWidth; });
}

async function smallTargets(page) {
  return page.evaluate(function () {
    const tapSelector = 'button, a.btn, select, input:not([type="radio"]), .segment__label, .footer a, .map .leaflet-bar a, .brand, .skip-link';
    return Array.from(document.querySelectorAll(tapSelector)).filter(function (el) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width === 0 || style.visibility === 'hidden' || el.closest('[hidden]')) return false;
      if (el.classList.contains('skip-link') && r.bottom < 0) return false;
      return r.width < 47.5 || r.height < 47.5;
    }).map(function (el) { return (el.id || el.className) + ' ' + Math.round(el.getBoundingClientRect().width) + '×' + Math.round(el.getBoundingClientRect().height); });
  });
}

const T = STRINGS.text;

/* ---- Testler ---------------------------------------------------------------- */

async function stateMatrix() {
  await check('Normal (gerçek ağ yolu, CSP başlığı açık): 8 kart, öneri, konsolda hata/uyarı/CSP ihlali yok', async function () {
    const s = await open({});
    expect(await cardCount(s.page) === 8, 'kart sayısı');
    await s.page.locator('#map-panel').scrollIntoViewIfNeeded();
    await s.page.waitForSelector('.marker', { timeout: 10000 });
    expect(await s.page.locator('.marker').count() === 8, 'işaretçi sayısı');
    expect(await s.page.locator('#pick .pick__name').count() === 1, 'öneri kutusu');
    expect(await s.page.locator('.card--shortest').count() === 1, 'en kısa rozeti');
    expect(await s.page.isVisible('#simulation-banner'), 'örnek veri bandı');
    expect(s.log.errors.length === 0 && s.log.warnings.length === 0, 'konsol: ' + s.log.errors.concat(s.log.warnings).join(' | '));
    expect(s.log.csp.length === 0, 'CSP: ' + s.log.csp.join(' | '));
    await s.ctx.close();
  });

  await check('Yükleniyor: iskelet görünür, liste aria-busy; sonra zaman aşımı hatası (3 deneme)', async function () {
    const s = await open({ scenario: 'slow', timeoutMs: 1500 });
    await s.page.waitForSelector('.skeleton');
    expect(await s.page.getAttribute('#results-list', 'aria-busy') === 'true', 'aria-busy');
    await s.page.waitForSelector('.state--error', { timeout: 15000 });
    expect((await s.page.textContent('#error-region')).indexOf(T('errors.codes.TIMEOUT')) !== -1, 'TIMEOUT metni');
    expect(s.requests.length === 3, 'istek sayısı ' + s.requests.length);
    await s.ctx.close();
  });

  const textCases = [
    ['empty', '#results-message', T('empty.noDataTitle')],
    ['error', '#error-region', T('errors.codes.INTERNAL')],
    ['unavailable', '#error-region', T('errors.codes.UNAVAILABLE')],
    ['ratelimit', '#error-region', T('errors.codes.RATE_LIMITED')],
    ['unsupported', '#error-region', T('errors.codes.UNSUPPORTED_SCHEMA')],
    ['html', '#error-region', T('errors.codes.INVALID_RESPONSE')],
    ['invalidjson', '#error-region', T('errors.codes.INVALID_RESPONSE')],
    ['offline', '#error-region', T('errors.codes.NETWORK')],
    ['notice', '#notice-banner', 'Örnek duyuru']
  ];
  for (const c of textCases) {
    await check('Durum "' + c[0] + '" → ' + c[1] + ' anlamlı metni gösterir', async function () {
      const s = await open({ scenario: c[0] });
      await s.page.waitForFunction(function (args) {
        const el = document.querySelector(args[0]);
        return el && !el.hidden && el.textContent.indexOf(args[1]) !== -1;
      }, [c[1], c[2]], { timeout: 15000 });
      expect(s.log.errors.length === 0, 'konsol hatası: ' + s.log.errors.join(' | '));
      if (c[0] === 'ratelimit') expect(s.requests.length === 1, '429 yeniden denendi');
      if (c[0] === 'error') expect(s.requests.length === 3, '5xx deneme sayısı ' + s.requests.length);
      await s.ctx.close();
    });
  }

  await check('Eski veri: süre/halka gizli, "Bu hastane için güncel bilgi yok." yazılı', async function () {
    const s = await open({ scenario: 'stale' });
    await cardCount(s.page);
    const stale = s.page.locator('.card--stale');
    expect(await stale.count() === 4, 'eski kart sayısı ' + await stale.count());
    expect(await s.page.locator('.card--stale .total, .card--stale .ring, .card--stale .tiles').count() === 0, 'sayısal tahmin görünüyor');
    expect((await stale.first().textContent()).indexOf(T('card.staleTitle')) !== -1, 'metin');
    await s.ctx.close();
  });

  await check('Bozuk veri: sayfa düşmez, 5 geçerli kart, uyarılar açıklayıcı', async function () {
    const s = await open({ scenario: 'broken' });
    expect(await cardCount(s.page) === 5, 'kart sayısı');
    expect(s.log.errors.length === 0, 'hata: ' + s.log.errors.join(' | '));
    expect(s.log.warnings.every(function (w) { return w.indexOf('[AcilRadar]') === 0; }), 'açıklamasız uyarı');
    await s.ctx.close();
  });

  await check('200 hastane: çizim tamamlanır, yatay taşma yok', async function () {
    const s = await open({ scenario: 'many', width: 375 });
    expect(await cardCount(s.page) === 200, 'kart sayısı');
    expect(await horizontalOverflow(s.page) <= 0, 'taşma');
    await s.ctx.close();
  });

  await check('Yenileme başarısız olursa eski bilgi kalır ve uyarı çıkar', async function () {
    const s = await open({});
    await cardCount(s.page);
    s.setScenario('error');
    await s.page.click('#refresh-button');
    await s.page.waitForSelector('.state--warning', { timeout: 15000 });
    expect(await s.page.locator('#results-list .card').count() === 8, 'kartlar kayboldu');
    await s.ctx.close();
  });

  await check('Çevrimdışı ↔ çevrimiçi: bant görünür/kaybolur', async function () {
    const s = await open({});
    await cardCount(s.page);
    await s.ctx.setOffline(true);
    await s.page.waitForSelector('#offline-banner:not([hidden])');
    await s.ctx.setOffline(false);
    await s.page.waitForSelector('#offline-banner[hidden]', { state: 'attached' });
    await s.ctx.close();
  });

  await check('Konum izni reddedildi → nazik uyarı; izin verildi → "Cihazımın konumu"', async function () {
    const denied = await open({});
    await cardCount(denied.page);
    await denied.page.click('#locate-button');
    await denied.page.waitForFunction(function (text) { return document.getElementById('location-status').textContent === text; }, T('controls.locationDenied'));
    await denied.ctx.close();
    const granted = await open({ permissions: ['geolocation'], geolocation: { latitude: 40.80, longitude: 29.40 } });
    await cardCount(granted.page);
    await granted.page.click('#locate-button');
    await granted.page.waitForFunction(function () { return document.getElementById('district-select').value === 'device'; });
    await granted.ctx.close();
  });

  await check('Harita yüklenemezse bilgi kutusu çıkar, liste çalışır', async function () {
    const s = await open({ blockLeaflet: true });
    expect(await cardCount(s.page) === 8, 'kart');
    await s.page.locator('#map-panel').scrollIntoViewIfNeeded();
    await s.page.waitForFunction(function (text) { return document.getElementById('map').textContent.indexOf(text) !== -1; }, T('map.unavailable'), { timeout: 15000 });
    expect(await s.page.locator('[data-action="map"]').count() === 0, '"Haritada göster" hâlâ görünüyor');
    await s.ctx.close();
  });
}

async function deviceMatrix() {
  const sizes = [[320, 700], [375, 812], [768, 1024], [1024, 768], [1440, 900], [812, 375]];
  for (const size of sizes) {
    await check(size[0] + '×' + size[1] + ': yatay kaydırma yok, dokunma hedefleri ≥ 48 px', async function () {
      const s = await open({ width: size[0], height: size[1] });
      await cardCount(s.page);
      await s.page.locator('#map-panel').scrollIntoViewIfNeeded();
      await s.page.waitForSelector('.leaflet-bar a', { timeout: 10000 });
      expect(await horizontalOverflow(s.page) <= 0, 'taşma');
      const small = await smallTargets(s.page);
      expect(small.length === 0, 'küçük hedefler: ' + small.join(', '));
      await s.ctx.close();
    });
  }

  await check('A+ yazı boyutu, 320 px: taşma yok; tercih yeniden yüklemede korunur', async function () {
    const s = await open({ width: 320 });
    await cardCount(s.page);
    await s.page.click('[data-size="large"]');
    await s.page.selectOption('#district-select', 'tuzla');
    expect(await horizontalOverflow(s.page) <= 0, 'taşma');
    await s.page.reload();
    await cardCount(s.page);
    expect(await s.page.getAttribute('html', 'data-text-size') === 'large', 'yazı boyutu');
    expect(await s.page.inputValue('#district-select') === 'tuzla', 'ilçe');
    await s.ctx.close();
  });

  await check('localStorage erişilemezken uygulama çalışır', async function () {
    const s = await open({ initScript: function () { Object.defineProperty(window, 'localStorage', { get: function () { throw new Error('engelli'); } }); } });
    expect(await cardCount(s.page) === 8, 'kart');
    await s.page.click('[data-size="small"]');
    expect(s.log.errors.length === 0, s.log.errors.join(' | '));
    await s.ctx.close();
  });

  await check('Saat 21:00 → "Akşam 20:00" devre dışı ve "bugün için geçti"; 19:00 → seçilebilir', async function () {
    const late = await open({ env: 'mock', clock: '2026-10-12T21:00:00+03:00' });
    await cardCount(late.page);
    expect(await late.page.isDisabled('#opt-time-evening'), 'devre dışı değil');
    expect((await late.page.textContent('label[for="opt-time-evening"]')).indexOf('geçti') !== -1, 'etiket');
    await late.ctx.close();
    const early = await open({ env: 'mock', clock: '2026-10-12T19:00:00+03:00' });
    await cardCount(early.page);
    expect(!(await early.page.isDisabled('#opt-time-evening')), 'devre dışı');
    await early.ctx.close();
  });

  await check('Cihaz saati yanlış (2035) olsa da bilgiler eski sayılmaz (sunucu saati esas)', async function () {
    const s = await open({ clock: '2035-01-01T12:00:00+03:00' });
    await cardCount(s.page);
    expect(await s.page.locator('.card--stale').count() === 0, 'eski sayıldı');
    await s.ctx.close();
  });

  await check('Hızlı art arda seçim: son seçim kazanır, hata yok', async function () {
    const s = await open({ env: 'mock', clock: '2026-10-12T15:00:00+03:00' });
    await cardCount(s.page);
    await s.page.click('label[for="opt-time-2h"]');
    await s.page.click('label[for="opt-time-evening"]');
    await s.page.click('label[for="opt-time-now"]');
    await s.page.click('label[for="opt-time-now"]');
    await s.page.waitForTimeout(1500);
    expect(await s.page.locator('.tag--forecast').count() === 0, 'eski seçimin verisi gösterildi');
    expect(await s.page.isChecked('#opt-time-now'), 'seçim');
    expect(s.log.errors.length === 0, s.log.errors.join(' | '));
    await s.ctx.close();
  });
}

async function accessibility() {
  await check('Klavye: ilk Tab "İçeriğe atla"; tüm denetimlere Tab ile ulaşılır', async function () {
    const s = await open({});
    await cardCount(s.page);
    await s.page.keyboard.press('Tab');
    expect((await s.page.evaluate(function () { return document.activeElement.className; })) === 'skip-link', 'ilk odak');
    const seen = new Set();
    for (let i = 0; i < 70; i += 1) {
      await s.page.keyboard.press('Tab');
      seen.add(await s.page.evaluate(function () { const a = document.activeElement; return a.type === 'radio' ? a.name : (a.id || a.dataset.action || a.className); }));
    }
    ['district-select', 'locate-button', 'time', 'sort', 'search-input', 'child-toggle', 'refresh-button', 'map-fit', 'details'].forEach(function (id) {
      expect(seen.has(id), 'ulaşılamadı: ' + id);
    });
    await s.ctx.close();
  });

  await check('Hayati tehlike kutusu varsayılan kapalı; Enter ile açılır', async function () {
    const s = await open({});
    await cardCount(s.page);
    expect(await s.page.getAttribute('[aria-controls="emergency-body"]', 'aria-expanded') === 'false', 'açık başlıyor');
    await s.page.focus('[aria-controls="emergency-body"]');
    await s.page.keyboard.press('Enter');
    expect(await s.page.isVisible('#emergency-body'), 'açılmadı');
    await s.ctx.close();
  });

  if (AXE_PATH) {
    for (const scheme of ['light', 'dark']) {
      await check('axe-core (WCAG 2.2 A/AA) ihlal yok — ' + scheme, async function () {
        const s = await open({ colorScheme: scheme, bypassCSP: true });
        await cardCount(s.page);
        await s.page.locator('#map-panel').scrollIntoViewIfNeeded();
        await s.page.waitForSelector('.marker', { timeout: 10000 });
        await s.page.click('[aria-controls="emergency-body"]');
        await s.page.click('[aria-controls="formula-body"]');
        await s.page.addScriptTag({ content: fs.readFileSync(AXE_PATH, 'utf8') });
        const found = await s.page.evaluate(async function () {
          if (!window.axe) return ['axe yüklenemedi'];
          const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
          return r.violations.map(function (v) { return v.id + ' (' + v.nodes.length + '): ' + v.nodes.slice(0, 2).map(function (n) { return n.target.join(' '); }).join(' ; '); });
        });
        expect(found.length === 0, found.join(' | '));
        await s.ctx.close();
      });
    }
  }

  await check('Hareket azaltılmışsa kart animasyonu uygulanmaz', async function () {
    const s = await open({ reducedMotion: 'reduce' });
    await cardCount(s.page);
    expect(!(await s.page.getAttribute('#results-list', 'class')).includes('is-animated'), 'animasyon açık');
    await s.ctx.close();
  });

  await check('Zorunlu renkler (forced-colors): içerik görünür, taşma yok', async function () {
    const s = await open({ width: 375 });
    await s.page.emulateMedia({ forcedColors: 'active' });
    expect(await cardCount(s.page) === 8, 'kart');
    expect(await horizontalOverflow(s.page) <= 0, 'taşma');
    await s.ctx.close();
  });

  await check('Yazdırma: harita ve seçimler gizli, kartlar bölünmez', async function () {
    const s = await open({});
    await cardCount(s.page);
    await s.page.emulateMedia({ media: 'print' });
    const info = await s.page.evaluate(function () {
      return { map: getComputedStyle(document.querySelector('.results__map')).display, controls: getComputedStyle(document.querySelector('.controls')).display, card: getComputedStyle(document.querySelector('.card')).breakInside };
    });
    expect(info.map === 'none' && info.controls === 'none' && info.card === 'avoid', JSON.stringify(info));
    await s.ctx.close();
  });

  await check('Koyu tema (sistem tercihi): koyu zemin uygulanır, konsol temiz', async function () {
    const s = await open({ colorScheme: 'dark' });
    await cardCount(s.page);
    const bg = await s.page.evaluate(function () { return getComputedStyle(document.body).backgroundColor; });
    expect(bg === 'rgb(13, 23, 38)', bg);
    await s.ctx.close();
  });
}

async function robustness() {
  await check('JavaScript kapalı: <noscript> 112 iletisi ve 112 bağlantısı görünür', async function () {
    const s = await open({ javaScriptEnabled: false });
    expect(await s.page.isVisible('noscript .fallback, .fallback__title'), 'noscript görünmüyor');
    expect(await s.page.isVisible('header a[href="tel:112"]'), '112 bağlantısı');
    expect(!(await s.page.isVisible('main')), 'boş ana içerik görünüyor');
    await s.ctx.close();
  });

  await check('Uygulama başlayamazsa (eski tarayıcı benzetimi) 4 sn sonra yedek 112 iletisi çıkar', async function () {
    const s = await open({ blockApp: true });
    await s.page.waitForSelector('.fallback--boot', { state: 'visible', timeout: 8000 });
    expect(await s.page.isVisible('header a[href="tel:112"]'), '112 bağlantısı');
    await s.ctx.close();
  });

  await check('404 sayfası ve geri tuşu: geri dönünce içerik yeniden görünür', async function () {
    const s = await open({});
    await cardCount(s.page);
    const response = await s.page.goto(BASE + '/olmayan-sayfa');
    expect(response.status() === 404, 'durum ' + response.status());
    expect(await s.page.isVisible('a[href="tel:112"]'), '404 sayfasında 112 yok');
    await s.page.goBack();
    expect(await cardCount(s.page) === 8, 'geri dönünce kart yok');
    await s.ctx.close();
  });
}

(async function main() {
  const server = spawn(process.execPath, [path.join(ROOT, 'tools/mock-server.js'), '--port=' + PORT], { stdio: 'ignore' });
  await new Promise(function (resolve) { setTimeout(resolve, 600); });
  browser = await chromium.launch();
  try {
    await stateMatrix();
    await deviceMatrix();
    await accessibility();
    await robustness();
  } finally {
    await browser.close();
    server.kill();
  }
  results.forEach(function (r) { console.log((r.ok ? '  ✔ ' : '  ✘ ') + r.name + (r.ok ? '' : '\n      → ' + r.message)); });
  const failed = results.filter(function (r) { return !r.ok; }).length;
  console.log('\n' + (results.length - failed) + ' geçti, ' + failed + ' kaldı (toplam ' + results.length + ').' + (AXE_PATH ? '' : ' (axe-core yolu verilmedi; erişilebilirlik taraması atlandı)'));
  process.exitCode = failed ? 1 : 0;
})();

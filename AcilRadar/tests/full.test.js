#!/usr/bin/env node
/* =============================================================================
 * tests/full.test.js
 * NE İŞE YARAR : Yayın öncesi SON TARAMA. Diğer testlerin tek tek denediği
 *                kuralları, site ve panelin TÜM ekranlarında, TÜM ekran
 *                genişliklerinde ve iki temada birlikte denetler:
 *                  - yatay taşma yok, kırpılmış metin yok, 48 px dokunma hedefi
 *                  - ekranda "undefined / NaN / null", yasak ifade ve emoji yok
 *                  - yinelenen id, satır içi olay özniteliği (on*) yok
 *                  - metin aralığı artırılınca (WCAG 1.4.12) içerik kaybolmaz
 *                  - Tab ile gezilen her öğede odak GÖRÜNÜR (WCAG 2.4.7)
 *                  - düzen kayması (CLS) < 0,1; LCP ölçülür
 *                  - file:// ile site ve panel çalışır
 *                  - axe-core (WCAG 2.2 AA) 320 px'te, açık ve koyu temada
 *                Sayfa tools/mock-server.js üzerinden, önerilen CSP başlığıyla açılır.
 * KULLANIM     : node tests/full.test.js
 *                (isteğe bağlı) PLAYWRIGHT_MODULE=/yol/playwright  AXE_PATH=/yol/axe.min.js
 *                SHOTS_DIR=/klasör → her ekranın her genişlikteki görüntüsünü kaydeder
 * NOT: Playwright yoksa test atlanır (çıkış kodu 0).
 * ========================================================================== */
'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

let chromium;
try {
  chromium = require(process.env.PLAYWRIGHT_MODULE || 'playwright').chromium;
} catch (error) {
  console.log('Playwright bulunamadı; son tarama ATLANDI.');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const PORT = 8799;
const BASE = 'http://localhost:' + PORT;
const AXE_PATH = process.env.AXE_PATH || '';
const SHOTS_DIR = process.env.SHOTS_DIR || '';
const PASSWORD = 'Ornek-Parola-1';
const WIDTHS = [320, 360, 390, 414, 768, 1024, 1280, 1440];
const TRANSPARENT_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

/** Panel ekranları ve onları en geniş yetkiyle gören rol. */
const PANEL_SCREENS = [
  { role: 'yonetici@ornek.test', hashes: ['#/ozet', '#/veri-girisi', '#/gecmis', '#/kullanicilar', '#/denetim-kaydi'] },
  { role: 'sistem@ornek.test', hashes: ['#/ozet', '#/kullanicilar'] }
];

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

async function newPage(o) {
  const ctx = await browser.newContext({
    viewport: { width: o.width || 1280, height: o.height || 900 }, colorScheme: o.colorScheme || 'light',
    timezoneId: 'Europe/Istanbul', locale: 'tr-TR', bypassCSP: Boolean(o.bypassCSP)
  });
  const page = await ctx.newPage();
  const log = { errors: [], csp: [] };
  page.on('pageerror', function (e) { log.errors.push(e.message); });
  page.on('console', function (m) {
    if (/Content Security Policy|Refused to/.test(m.text())) log.csp.push(m.text());
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) log.errors.push(m.text());
  });
  if (o.initScript) await page.addInitScript(o.initScript);
  await page.route('https://tile.openstreetmap.org/**', function (r) { r.fulfill({ status: 200, contentType: 'image/png', body: TRANSPARENT_PNG }); });
  return { ctx: ctx, page: page, log: log };
}

async function openSite(o) {
  const s = await newPage(o || {});
  await s.page.goto(BASE + '/');
  await s.page.waitForFunction(function () { return document.getElementById('results-list').getAttribute('aria-busy') === 'false'; }, null, { timeout: 15000 });
  await settle(s.page);
  return s;
}

/** Kart giriş animasyonları bitene kadar bekler (yarı saydam an ölçülmesin). */
async function settle(page) {
  await page.waitForFunction(function () {
    return document.getAnimations().every(function (a) { return a.playState !== 'running'; });
  }, null, { timeout: 5000 });
}

async function openPanel(o, email) {
  const s = await newPage(o || {});
  await s.page.goto(BASE + '/panel/#/giris');
  await s.page.waitForSelector('#login-email');
  if (email) {
    await s.page.fill('#login-email', email);
    await s.page.fill('#login-password', PASSWORD);
    await s.page.click('#view form button[type="submit"]');
    await s.page.waitForSelector('.pnav__link', { timeout: 10000 });
  }
  return s;
}

async function go(page, hash) {
  await page.evaluate(function (h) { window.location.hash = h; }, hash);
  await page.waitForTimeout(150);
  await page.waitForFunction(function () { return !document.querySelector('.ploading'); }, null, { timeout: 10000 });
}

/* ---- Sayfa içi denetimler (tarayıcıda çalışır) ------------------------------ */

/** Tek geçişte: taşma, kırpılma, küçük hedef, kötü metin, yinelenen id, on* öznitelik. */
function audit() {
  const out = { overflow: 0, clipped: [], small: [], badText: [], dupIds: [], inlineHandlers: [] };
  const doc = document.documentElement;
  out.overflow = doc.scrollWidth - doc.clientWidth;

  const visible = function (el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden';
  };
  const name = function (el) { return el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).split(' ')[0]; };

  // Kırpılmış metin: taşmayı gizleyen bir öğenin içeriği kutusundan büyükse
  document.querySelectorAll('body *').forEach(function (el) {
    const box = el.getBoundingClientRect();
    if (box.width <= 1 && box.height <= 1) return;   // ekran okuyucu için gizlenmiş (ör. dar ekranda tablo başlığı)
    if (!visible(el) || el.closest('.map, .leaflet-container, .visually-hidden, svg') || /^(INPUT|SELECT|TEXTAREA|svg)$/i.test(el.tagName)) return;
    const st = getComputedStyle(el);
    const hidesX = st.overflowX === 'hidden' || st.overflowX === 'clip';
    const hidesY = st.overflowY === 'hidden' || st.overflowY === 'clip';
    if (hidesX && el.scrollWidth > el.clientWidth + 1) out.clipped.push(name(el) + ' (yatay ' + el.scrollWidth + '>' + el.clientWidth + ')');
    if (hidesY && el.scrollHeight > el.clientHeight + 1 && el.clientHeight > 0) out.clipped.push(name(el) + ' (dikey ' + el.scrollHeight + '>' + el.clientHeight + ')');
  });

  // 48 px dokunma hedefi (metin içi bağlantılar WCAG 2.5.8 istisnasıdır)
  const tap = 'button, a.btn, select, input:not([type="radio"]):not([type="checkbox"]), .segment__label, .pnav__link, .plink, .brand, .footer a, .pfooter a, .map .leaflet-bar a, .error-summary__list a';
  document.querySelectorAll(tap).forEach(function (el) {
    if (!visible(el) || (el.classList.contains('skip-link') && el.getBoundingClientRect().bottom < 0)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 47.5 || r.height < 47.5) out.small.push(name(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
  });

  // Ekranda görünen metin
  const text = document.body.innerText.replace(/[\u00A9\u00AE\u2122]/g, '');   // © ® ™ emoji sayılmaz
  const rules = [
    [/\bundefined\b/, 'undefined'], [/\bNaN\b/, 'NaN'], [/\bnull\b/, 'null'], [/\[object /, '[object …]'],
    [/\{[a-zA-Z]+\}/, 'doldurulmamış {yer tutucu}'], [/\bcanlı\b|\banlık\b/i, '"canlı/anlık"'], [/\ben iyi\b/i, '"en iyi"'],
    [/\p{Extended_Pictographic}/u, 'emoji']
  ];
  rules.forEach(function (rule) {
    const m = text.match(rule[0]);
    if (m) out.badText.push(rule[1] + ' → "' + text.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, ' ') + '"');
  });

  const seen = {};
  document.querySelectorAll('[id]').forEach(function (el) {
    if (seen[el.id]) out.dupIds.push(el.id);
    seen[el.id] = true;
  });
  document.querySelectorAll('*').forEach(function (el) {
    Array.from(el.attributes).forEach(function (a) { if (/^on/i.test(a.name)) out.inlineHandlers.push(name(el) + ' ' + a.name); });
  });
  return out;
}

function problems(label, a) {
  const list = [];
  if (a.overflow > 0) list.push(label + ': yatay taşma ' + a.overflow + ' px');
  a.clipped.slice(0, 3).forEach(function (x) { list.push(label + ': kırpılmış ' + x); });
  a.small.slice(0, 3).forEach(function (x) { list.push(label + ': küçük hedef ' + x); });
  a.badText.forEach(function (x) { list.push(label + ': metin ' + x); });
  a.dupIds.forEach(function (x) { list.push(label + ': yinelenen id ' + x); });
  a.inlineHandlers.forEach(function (x) { list.push(label + ': satır içi olay ' + x); });
  return list;
}

async function shot(page, file) {
  if (!SHOTS_DIR) return;
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS_DIR, file + '.png'), fullPage: true });
}

/* ---- 1. Tüm ekranlar × tüm genişlikler × iki tema ------------------------------ */

async function sweepTests() {
  for (const scheme of ['light', 'dark']) {
    await check('Site · ' + WIDTHS.length + ' genişlik (' + WIDTHS.join(', ') + ') · ' + (scheme === 'light' ? 'açık' : 'koyu') + ' tema: taşma, kırpılma, 48 px, metin, id, on*', async function () {
      const found = [];
      const s = await openSite({ colorScheme: scheme });
      for (const w of WIDTHS) {
        await s.page.setViewportSize({ width: w, height: 900 });
        await s.page.waitForTimeout(250);
        found.push.apply(found, problems(w + ' px', await s.page.evaluate(audit)));
        await shot(s.page, 'site-' + scheme + '-' + w);
      }
      // Açılır bölümler açıkken de
      await s.page.setViewportSize({ width: 320, height: 900 });
      await s.page.evaluate(function () { document.querySelectorAll('[data-disclosure][aria-expanded="false"], .card [aria-expanded="false"]').forEach(function (b) { b.click(); }); });
      await s.page.waitForTimeout(250);
      await settle(s.page);
      found.push.apply(found, problems('320 px (tümü açık)', await s.page.evaluate(audit)));
      expect(s.log.errors.length === 0 && s.log.csp.length === 0, s.log.errors.concat(s.log.csp).join(' | '));
      expect(found.length === 0, found.slice(0, 8).join(' | '));
      await s.ctx.close();
    });
  }

  for (const scheme of ['light', 'dark']) {
    await check('Panel · giriş + 6 ekran × ' + WIDTHS.length + ' genişlik · ' + (scheme === 'light' ? 'açık' : 'koyu') + ' tema: taşma, kırpılma, 48 px, metin, id, on*', async function () {
      const found = [];
      const login = await openPanel({ colorScheme: scheme });
      for (const w of WIDTHS) {
        await login.page.setViewportSize({ width: w, height: 900 });
        await login.page.waitForTimeout(100);
        found.push.apply(found, problems('giriş ' + w + ' px', await login.page.evaluate(audit)));
        await shot(login.page, 'panel-giris-' + scheme + '-' + w);
      }
      await login.ctx.close();
      for (const group of PANEL_SCREENS) {
        const s = await openPanel({ colorScheme: scheme }, group.role);
        for (const hash of group.hashes) {
          await go(s.page, hash);
          for (const w of WIDTHS) {
            await s.page.setViewportSize({ width: w, height: 900 });
            await s.page.waitForTimeout(100);
            found.push.apply(found, problems(group.role.split('@')[0] + ' ' + hash + ' ' + w + ' px', await s.page.evaluate(audit)));
            await shot(s.page, 'panel-' + group.role.split('@')[0] + '-' + hash.slice(2) + '-' + scheme + '-' + w);
          }
        }
        // Hata özeti ve alan hataları açıkken (en dar ekranda)
        if (group.hashes.indexOf('#/veri-girisi') !== -1) {
          await go(s.page, '#/veri-girisi');
          await s.page.setViewportSize({ width: 320, height: 900 });
          await s.page.click('#view form button[type="submit"]');
          await s.page.waitForTimeout(150);
          found.push.apply(found, problems('veri girişi (hatalı) 320 px', await s.page.evaluate(audit)));
        }
        expect(s.log.errors.length === 0 && s.log.csp.length === 0, s.log.errors.concat(s.log.csp).join(' | '));
        await s.ctx.close();
      }
      expect(found.length === 0, found.slice(0, 8).join(' | '));
    });
  }
}

/* ---- 2. Metin aralığı (WCAG 1.4.12) ------------------------------------------- */

const TEXT_SPACING = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';

async function spacingTests() {
  await check('Metin aralığı artırılınca (WCAG 1.4.12) site 320 ve 1280 px: taşma ve kırpılma yok', async function () {
    const found = [];
    const s = await openSite({ bypassCSP: true });
    await s.page.addStyleTag({ content: TEXT_SPACING });
    for (const w of [320, 1280]) {
      await s.page.setViewportSize({ width: w, height: 900 });
      await s.page.waitForTimeout(200);
      const a = await s.page.evaluate(audit);
      a.small = [];   // aralık artınca hedefler zaten büyür; burada konu kırpılma
      found.push.apply(found, problems(w + ' px', a));
    }
    expect(found.length === 0, found.slice(0, 6).join(' | '));
    await s.ctx.close();
  });

  await check('Metin aralığı artırılınca panel ekranları 320 px: taşma ve kırpılma yok', async function () {
    const found = [];
    const s = await openPanel({ bypassCSP: true, width: 320 }, 'yonetici@ornek.test');
    await s.page.addStyleTag({ content: TEXT_SPACING });
    for (const hash of PANEL_SCREENS[0].hashes) {
      await go(s.page, hash);
      const a = await s.page.evaluate(audit);
      a.small = [];
      found.push.apply(found, problems(hash, a));
    }
    expect(found.length === 0, found.slice(0, 6).join(' | '));
    await s.ctx.close();
  });
}

/* ---- 3. Odak görünürlüğü (WCAG 2.4.7) --------------------------------------- */

/** Odaktaki öğenin (ya da radyo ise etiketinin) belirgin bir odak çizgisi var mı? */
function focusInfo() {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  let target = el;
  if (el.classList.contains('segment__input')) target = el.nextElementSibling;
  const st = getComputedStyle(target);
  const outline = st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) >= 2;
  const ring = st.boxShadow !== 'none' && /\s[2-9]px\)?|\s\d{2}px/.test(st.boxShadow);
  const r = target.getBoundingClientRect();
  return { name: el.id || el.className || el.tagName, visible: outline || ring, onScreen: r.bottom > 0 && r.top < window.innerHeight };
}

async function tabThrough(page, max) {
  const missing = [];
  let count = 0;
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(focusInfo);
    if (!info) continue;
    count += 1;
    if (!info.visible) missing.push(info.name);
    if (!info.onScreen) missing.push(info.name + ' (ekran dışında)');
  }
  return { missing: missing, count: count };
}

async function focusTests() {
  await check('Klavye: sitede ilk 70 Tab durağının hepsinde odak görünür ve ekranda (yapışkan başlık altında kalmaz)', async function () {
    const s = await openSite({ width: 1280 });
    const r = await tabThrough(s.page, 70);
    expect(r.count > 40, 'yalnız ' + r.count + ' durak');
    expect(r.missing.length === 0, Array.from(new Set(r.missing)).slice(0, 6).join(', '));
    await s.ctx.close();
  });

  await check('Klavye: sitede 390 px\'te ilk 40 Tab durağında odak görünür', async function () {
    const s = await openSite({ width: 390 });
    const r = await tabThrough(s.page, 40);
    expect(r.missing.length === 0, Array.from(new Set(r.missing)).slice(0, 6).join(', '));
    await s.ctx.close();
  });

  await check('Klavye: panel giriş, veri girişi ve kullanıcılar ekranlarında her Tab durağında odak görünür', async function () {
    const s = await openPanel({ width: 1280 });
    let r = await tabThrough(s.page, 10);
    const missing = r.missing.slice();
    await s.page.fill('#login-email', 'yonetici@ornek.test');
    await s.page.fill('#login-password', PASSWORD);
    await s.page.click('#view form button[type="submit"]');
    await s.page.waitForSelector('.pnav__link');
    for (const hash of ['#/veri-girisi', '#/kullanicilar']) {
      await go(s.page, hash);
      r = await tabThrough(s.page, 30);
      missing.push.apply(missing, r.missing.map(function (m) { return hash + ' ' + m; }));
    }
    expect(missing.length === 0, Array.from(new Set(missing)).slice(0, 6).join(', '));
    await s.ctx.close();
  });
}

/* ---- 4. Performans: düzen kayması ve en büyük boyama ------------------------ */

function perfObserver() {
  window.__perf = { cls: 0, lcp: 0 };
  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) { if (!e.hadRecentInput) window.__perf.cls += e.value; });
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(function (list) {
      const entries = list.getEntries();
      window.__perf.lcp = entries[entries.length - 1].startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) { /* eski tarayıcı */ }
}

const perfNotes = [];

async function perfTests() {
  for (const w of [390, 1280]) {
    await check('Performans ' + w + ' px: düzen kayması (CLS) < 0,1 ve LCP < 2,5 sn (yerel sunucu)', async function () {
      const s = await newPage({ width: w, initScript: perfObserver });
      await s.page.goto(BASE + '/');
      await s.page.waitForFunction(function () { return document.getElementById('results-list').getAttribute('aria-busy') === 'false'; }, null, { timeout: 15000 });
      await s.page.waitForTimeout(1200);
      const p = await s.page.evaluate(function () { return window.__perf; });
      perfNotes.push(w + ' px → CLS ' + p.cls.toFixed(3) + ', LCP ' + Math.round(p.lcp) + ' ms');
      expect(p.cls < 0.1, 'CLS ' + p.cls.toFixed(3));
      expect(p.lcp < 2500, 'LCP ' + Math.round(p.lcp) + ' ms');
      await s.ctx.close();
    });
  }
}

/* ---- 5. file:// ile açılış ----------------------------------------------------- */

async function fileTests() {
  await check('file:// — site açılır, kartlar çizilir, hata yok', async function () {
    const s = await newPage({ width: 390 });
    await s.page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href);
    await s.page.waitForFunction(function () { return document.getElementById('results-list').getAttribute('aria-busy') === 'false'; }, null, { timeout: 15000 });
    const cards = await s.page.locator('#results-list .card').count();
    expect(cards > 0, 'kart yok');
    expect(s.log.errors.length === 0, s.log.errors.join(' | '));
    await s.ctx.close();
  });

  await check('file:// — panel tarayıcı içi örnek sunucuyla girişe izin verir, tüm ekranlar açılır, hata yok', async function () {
    const s = await newPage({ width: 1280 });
    await s.page.goto(pathToFileURL(path.join(ROOT, 'panel', 'index.html')).href + '#/giris');
    await s.page.waitForSelector('#login-email');
    await s.page.fill('#login-email', 'sistem@ornek.test');
    await s.page.fill('#login-password', PASSWORD);
    await s.page.click('#view form button[type="submit"]');
    await s.page.waitForSelector('.pnav__link', { timeout: 10000 });
    for (const hash of ['#/ozet', '#/veri-girisi', '#/gecmis', '#/kullanicilar', '#/denetim-kaydi']) {
      await go(s.page, hash);
      const title = await s.page.textContent('#view-title');
      expect(title && title.trim().length > 0, hash + ' başlıksız');
      expect(await s.page.locator('.state--error').count() === 0, hash + ' hata gösterdi');
    }
    expect(s.log.errors.length === 0, s.log.errors.join(' | '));
    await s.ctx.close();
  });
}

/* ---- 6. axe-core dar ekranda --------------------------------------------------- */

async function axeTests() {
  if (!AXE_PATH) return;
  const axeSource = fs.readFileSync(AXE_PATH, 'utf8');
  const scan = async function (page, label, found) {
    await page.addScriptTag({ content: axeSource });
    const v = await page.evaluate(async function () {
      const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      return r.violations.map(function (x) { return x.id + ' (' + x.nodes.length + '): ' + x.nodes[0].target.join(' '); });
    });
    v.forEach(function (x) { found.push(label + ' → ' + x); });
  };
  for (const scheme of ['light', 'dark']) {
    await check('axe-core (WCAG 2.2 AA) 320 px · ' + (scheme === 'light' ? 'açık' : 'koyu') + ' tema: site (bölümler açık) + panelin tüm ekranları', async function () {
      const found = [];
      const site = await openSite({ width: 320, colorScheme: scheme, bypassCSP: true });
      await site.page.evaluate(function () { document.querySelectorAll('[data-disclosure][aria-expanded="false"]').forEach(function (b) { b.click(); }); });
      await settle(site.page);
      await scan(site.page, 'site', found);
      await site.ctx.close();
      const s = await openPanel({ width: 320, colorScheme: scheme, bypassCSP: true });
      await scan(s.page, 'giriş', found);
      await s.page.fill('#login-email', 'yonetici@ornek.test');
      await s.page.fill('#login-password', PASSWORD);
      await s.page.click('#view form button[type="submit"]');
      await s.page.waitForSelector('.pnav__link');
      for (const hash of PANEL_SCREENS[0].hashes) {
        await go(s.page, hash);
        await scan(s.page, hash, found);
      }
      expect(found.length === 0, found.slice(0, 6).join(' | '));
      await s.ctx.close();
    });
  }
}

(async function main() {
  const server = spawn(process.execPath, [path.join(ROOT, 'tools/mock-server.js'), '--port=' + PORT], { stdio: 'ignore' });
  await new Promise(function (resolve) { setTimeout(resolve, 700); });
  browser = await chromium.launch();
  try {
    await sweepTests();
    await spacingTests();
    await focusTests();
    await perfTests();
    await fileTests();
    await axeTests();
  } finally {
    await browser.close();
    server.kill();
  }
  results.forEach(function (r) { console.log((r.ok ? '  ✔ ' : '  ✘ ') + r.name + (r.ok ? '' : '\n      → ' + r.message)); });
  if (perfNotes.length) console.log('\n  Ölçümler: ' + perfNotes.join(' · '));
  const failed = results.filter(function (r) { return !r.ok; }).length;
  console.log('\n' + (results.length - failed) + ' geçti, ' + failed + ' kaldı (toplam ' + results.length + ').' + (AXE_PATH ? '' : ' (axe-core atlandı)'));
  process.exitCode = failed ? 1 : 0;
})();

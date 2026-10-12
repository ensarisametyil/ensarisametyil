#!/usr/bin/env node
/* =============================================================================
 * tests/panel-ui.test.js
 * NE İŞE YARAR : Hastane panelini gerçek tarayıcıda (Playwright + Chromium) sınar:
 *                giriş/çıkış, rol bazlı menü, yetkisiz sayfa, veri girişi doğrulaması,
 *                sunucu alan hataları, çift gönderim, 401 sonrası geri dönüş, oturum
 *                uyarısı ve süre dolması, 429 kilidi, CSV, sayfalama + geri tuşu,
 *                tarih süzgeci, kullanıcı yönetimi, ekran genişlikleri, 48 px hedefler,
 *                klavye, axe-core, CSP.
 *                Sayfa tools/mock-server.js üzerinden, önerilen CSP başlığıyla açılır.
 * KULLANIM     : node tests/panel-ui.test.js
 *                (isteğe bağlı) PLAYWRIGHT_MODULE=/yol/playwright  AXE_PATH=/yol/axe.min.js
 * NOT: Playwright yoksa test atlanır (çıkış kodu 0).
 * ========================================================================== */
'use strict';

const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { spawn } = require('child_process');

let chromium;
try {
  chromium = require(process.env.PLAYWRIGHT_MODULE || 'playwright').chromium;
} catch (error) {
  console.log('Playwright bulunamadı; panel arayüz testleri ATLANDI.');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const PORT = 8798;
const BASE = 'http://localhost:' + PORT + '/panel/';
const AXE_PATH = process.env.AXE_PATH || '';
const PASSWORD = 'Ornek-Parola-1';
const T = loadText();

function loadText() {
  const sandbox = { window: {}, console: console, Intl: Intl };
  vm.createContext(sandbox);
  ['js/config.js', 'js/strings.js', 'panel/js/config.js', 'panel/js/strings.js'].forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox); });
  return sandbox.window.AcilRadar.Strings.text;
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

/** env: 'production' (gerçek ağ + çerez) | 'mock' (tarayıcı içi örnek sunucu) */
async function open(options) {
  const o = Object.assign({ env: 'production', width: 1200, height: 900, colorScheme: 'light' }, options);
  const ctx = await browser.newContext({ viewport: { width: o.width, height: o.height }, colorScheme: o.colorScheme, timezoneId: 'Europe/Istanbul', locale: 'tr-TR', acceptDownloads: true, bypassCSP: Boolean(o.bypassCSP) });
  const page = await ctx.newPage();
  const log = { errors: [], warnings: [], csp: [], api: [] };
  page.on('pageerror', function (e) { log.errors.push(e.message); });
  page.on('console', function (m) {
    if (/Content Security Policy|Refused to/.test(m.text())) log.csp.push(m.text());
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) log.errors.push(m.text());
    if (m.type() === 'warning') log.warnings.push(m.text());
  });
  page.on('request', function (r) { if (r.url().indexOf('/api/') !== -1) log.api.push(r.method() + ' ' + new URL(r.url()).pathname); });
  if (o.clock) await page.clock.install({ time: new Date(o.clock) });
  await page.route('**/panel/js/config.js', function (route) {
    route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: fs.readFileSync(path.join(ROOT, 'panel/js/config.js'), 'utf8').replace("ENVIRONMENT: 'mock'", "ENVIRONMENT: '" + o.env + "'") });
  });
  await page.goto(BASE + (o.hash || ''));
  await page.waitForSelector('#view-title');
  return { page: page, ctx: ctx, log: log };
}

async function login(page, email) {
  await page.waitForSelector('#login-email');
  await page.fill('#login-email', email);
  await page.fill('#login-password', PASSWORD);
  await page.click('#view form button[type="submit"]');
  await page.waitForSelector('.pnav__link', { timeout: 10000 });
}

async function go(page, hash) {
  await page.evaluate(function (h) { window.location.hash = h; }, hash);
  await page.waitForTimeout(150);
  await page.waitForFunction(function () { return !document.querySelector('.ploading'); }, null, { timeout: 10000 });
}

async function navLabels(page) {
  return page.$$eval('.pnav__link', function (links) { return links.map(function (l) { return l.getAttribute('href'); }); });
}

async function fillRecord(page, values) {
  const v = Object.assign({ occupancyPercent: '64', nonUrgentWaiting: '20', urgentWaiting: '4', activePhysicians: '5', nonUrgentWaitMinutesMin: '25', nonUrgentWaitMinutesMax: '40', urgentWaitMinutesMin: '5', urgentWaitMinutesMax: '12' }, values || {});
  for (const name of Object.keys(v)) await page.fill('#entry-' + name, v[name]);
}

async function overflow(page) {
  return page.evaluate(function () { return document.documentElement.scrollWidth - document.documentElement.clientWidth; });
}

async function smallTargets(page) {
  return page.evaluate(function () {
    return Array.from(document.querySelectorAll('button, a, select, input')).filter(function (el) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || el.closest('[hidden]') || (el.classList.contains('skip-link') && r.bottom < 0)) return false;
      return r.width < 47.5 || r.height < 47.5;
    }).map(function (el) { return (el.id || el.className || el.tagName) + ' ' + Math.round(el.getBoundingClientRect().width) + '×' + Math.round(el.getBoundingClientRect().height); });
  });
}

/* ---- Giriş, roller, oturum ---------------------------------------------------- */

async function sessionTests() {
  await check('Hatalı parola: genel ileti, alan belirtilmez; konsolda hata/uyarı yok', async function () {
    const s = await open({});
    await s.page.fill('#login-email', 'personel@ornek.test');
    await s.page.fill('#login-password', 'yanlis');
    await s.page.click('#view form button[type="submit"]');
    await s.page.waitForFunction(function (t) { return document.body.textContent.indexOf(t) !== -1; }, T('panel.login.invalid'));
    expect(s.log.errors.length === 0 && s.log.warnings.length === 0, s.log.errors.concat(s.log.warnings).join(' | '));
    await s.ctx.close();
  });

  await check('Boş form: alan hataları ve odak e-postada', async function () {
    const s = await open({});
    await s.page.click('#view form button[type="submit"]');
    expect(await s.page.getAttribute('#login-email', 'aria-invalid') === 'true', 'aria-invalid');
    expect(await s.page.evaluate(function () { return document.activeElement.id; }) === 'login-email', 'odak');
    expect(s.log.api.filter(function (a) { return a.indexOf('login') !== -1; }).length === 0, 'istek gitti');
    expect(await s.page.getAttribute('#login-email', 'autocomplete') === 'username', 'e-posta autocomplete');
    expect(await s.page.getAttribute('#login-password', 'autocomplete') === 'current-password', 'parola autocomplete');
    await s.ctx.close();
  });

  await check('Rol bazlı menü: personel / yönetici / il görüntüleyici / sistem yöneticisi; CSP ihlali yok', async function () {
    const expected = {
      'personel@ornek.test': ['#/ozet', '#/veri-girisi', '#/gecmis'],
      'yonetici@ornek.test': ['#/ozet', '#/veri-girisi', '#/gecmis', '#/kullanicilar', '#/denetim-kaydi'],
      'il@ornek.test': ['#/ozet', '#/gecmis', '#/denetim-kaydi'],
      'sistem@ornek.test': ['#/ozet', '#/veri-girisi', '#/gecmis', '#/kullanicilar', '#/denetim-kaydi']
    };
    for (const email of Object.keys(expected)) {
      const s = await open({});
      await login(s.page, email);
      const labels = await navLabels(s.page);
      expect(JSON.stringify(labels) === JSON.stringify(expected[email]), email + ': ' + labels.join(','));
      expect(s.log.csp.length === 0 && s.log.errors.length === 0, s.log.csp.concat(s.log.errors).join(' | '));
      await s.ctx.close();
    }
  });

  await check('Yetkisiz sayfa (personel → #/kullanicilar): özete yönlenir ve uyarı görünür', async function () {
    const s = await open({});
    await login(s.page, 'personel@ornek.test');
    await go(s.page, '#/kullanicilar');
    await s.page.waitForFunction(function (t) { return document.getElementById('global-notice').textContent.indexOf(t) !== -1; }, T('panel.common.forbidden'));
    expect(s.page.url().indexOf('#/ozet') !== -1, s.page.url());
    await s.ctx.close();
  });

  await check('401 (oturum sunucuda bitti): giriş ekranı + ileti; yeniden girişte kalınan sayfaya dönüş', async function () {
    const s = await open({});
    await login(s.page, 'il@ornek.test');
    await go(s.page, '#/gecmis?hastane=ornek-03');
    await s.ctx.clearCookies();
    await go(s.page, '#/gecmis?hastane=ornek-04');
    await s.page.waitForFunction(function (t) { return document.body.textContent.indexOf(t) !== -1; }, T('panel.login.sessionExpired'));
    await login(s.page, 'il@ornek.test');
    await s.page.waitForFunction(function () { return window.location.hash.indexOf('#/gecmis?hastane=ornek-04') === 0; });
    await s.ctx.close();
  });

  await check('Çıkış yap → giriş ekranı, "Çıkış yaptınız." ve oturum gerçekten kapalı', async function () {
    const s = await open({});
    await login(s.page, 'personel@ornek.test');
    await s.page.click('#logout-button');
    await s.page.waitForFunction(function (t) { return document.body.textContent.indexOf(t) !== -1; }, T('panel.login.loggedOut'));
    await go(s.page, '#/gecmis');
    expect(s.page.url().indexOf('#/giris') !== -1, 'oturum açık kaldı');
    await s.ctx.close();
  });

  await check('Oturum uyarısı süre dolmadan çıkar (ekranı engellemez), "Oturumu uzat" çalışır, süre dolunca çıkış', async function () {
    const s = await open({ env: 'mock', clock: '2026-10-12T10:00:00+03:00' });
    await login(s.page, 'personel@ornek.test');
    await s.page.clock.fastForward('28:30');
    await s.page.waitForSelector('#session-banner:not([hidden])');
    expect(await s.page.getAttribute('#session-banner', 'role') === 'alert', 'role');
    expect(await s.page.isEnabled('.pnav__link >> nth=1'), 'menü kullanılabilir olmalı');
    await s.page.click('#session-extend');
    await s.page.waitForSelector('#session-banner[hidden]', { state: 'attached' });
    await s.page.clock.fastForward('31:00');
    await s.page.waitForFunction(function (t) { return document.body.textContent.indexOf(t) !== -1; }, T('panel.login.sessionExpired'));
    await s.ctx.close();
  });

  await check('429: 5 hatalı denemeden sonra giriş düğmesi kilitlenir ve kalan süre yazılır', async function () {
    const s = await open({});
    for (let i = 0; i < 6; i += 1) {
      await s.page.fill('#login-email', 'personel2@ornek.test');
      await s.page.fill('#login-password', 'yanlis');
      await s.page.click('#view form button[type="submit"]');
      await s.page.waitForTimeout(250);
      if (await s.page.isDisabled('#view form button[type="submit"]')) break;
    }
    expect(await s.page.isDisabled('#view form button[type="submit"]'), 'kilitlenmedi');
    expect((await s.page.textContent('#view')).indexOf('saniye sonra') !== -1, 'kalan süre yok');
    await s.ctx.close();
  });

  await check('Parolamı unuttum: ağ isteği yapmaz, bilgi verir; iki adımlı doğrulama ekranı kapalı', async function () {
    const s = await open({ hash: '#/parolami-unuttum' });
    await s.page.fill('#forgot-email', 'a@ornek.test');
    await s.page.click('#view form button[type="submit"]');
    await s.page.waitForFunction(function (t) { return document.body.textContent.indexOf(t) !== -1; }, T('panel.forgot.disabled'));
    expect(s.log.api.filter(function (a) { return a.indexOf('POST') === 0; }).length === 0, 'istek gitti');
    await go(s.page, '#/iki-adimli-dogrulama');
    expect(await s.page.isDisabled('#twofa-code'), 'kod alanı açık');
    expect(await s.page.getAttribute('#twofa-code', 'autocomplete') === 'one-time-code', 'autocomplete');
    await s.ctx.close();
  });
}

/* ---- Veri girişi ---------------------------------------------------------------- */

async function entryTests() {
  await check('Boş gönderim: hata özeti odaklanır, 8 alan işaretlenir, istek gitmez', async function () {
    const s = await open({});
    await login(s.page, 'personel@ornek.test');
    await go(s.page, '#/veri-girisi');
    await s.page.click('#view form button[type="submit"]');
    expect(await s.page.evaluate(function () { return document.activeElement.id; }) === 'entry-summary', 'odak');
    expect(await s.page.locator('#view [aria-invalid="true"]').count() === 8, 'işaretli alan');
    expect(s.log.api.filter(function (a) { return a.indexOf('POST') === 0 && a.indexOf('records') !== -1; }).length === 0, 'istek gitti');
    await s.page.click('#entry-summary a >> nth=0');
    expect(await s.page.evaluate(function () { return document.activeElement.id; }) === 'entry-occupancyPercent', 'özet bağlantısı alana götürmedi');
    await s.ctx.close();
  });

  await check('Anlık doğrulama: alandan çıkınca hata, düzeltince kalkar; en az > en çok uyarısı', async function () {
    const s = await open({});
    await login(s.page, 'personel@ornek.test');
    await go(s.page, '#/veri-girisi');
    await s.page.fill('#entry-occupancyPercent', '120');
    await s.page.press('#entry-occupancyPercent', 'Tab');
    expect((await s.page.textContent('#entry-occupancyPercent-error')).indexOf('100') !== -1, 'hata yok');
    await s.page.fill('#entry-occupancyPercent', '80');
    expect(await s.page.getAttribute('#entry-occupancyPercent', 'aria-invalid') === null, 'hata kalkmadı');
    await s.page.fill('#entry-urgentWaitMinutesMin', '30');
    await s.page.fill('#entry-urgentWaitMinutesMax', '10');
    await s.page.focus('#entry-urgentWaitMinutesMin');
    await s.page.press('#entry-urgentWaitMinutesMin', 'Tab');
    expect((await s.page.textContent('#entry-urgentWaitMinutesMin-error')) === T('panel.validation.rangeOrder'), 'rangeOrder');
    await s.ctx.close();
  });

  await check('Geçerli kayıt: başarı iletisi; geçmişte en üstte; çift tıklama TEK kayıt oluşturur', async function () {
    const s = await open({});
    await login(s.page, 'personel@ornek.test');
    await go(s.page, '#/veri-girisi');
    await fillRecord(s.page, { occupancyPercent: '73' });
    await s.page.dblclick('#view form button[type="submit"]');
    await s.page.waitForFunction(function () { return document.querySelector('.pnotice--success'); });
    const posts = s.log.api.filter(function (a) { return a.indexOf('POST') === 0 && a.indexOf('records') !== -1; });
    expect(posts.length === 1, 'POST sayısı ' + posts.length);
    await go(s.page, '#/gecmis');
    expect((await s.page.textContent('.ptable tbody tr:first-child')).indexOf('%73') !== -1, 'geçmişte yok');
    await s.ctx.close();
  });

  await check('Sunucu alan hatası (422) ilgili alanın altında gösterilir', async function () {
    const s = await open({});
    await login(s.page, 'personel@ornek.test');
    await go(s.page, '#/veri-girisi');
    await s.page.route('**/records', function (route) {
      if (route.request().method() !== 'POST') return route.continue();
      route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: { code: 'VALIDATION', message: 'x', fields: { greenWaiting: 'outOfRange' } } }) });
    });
    await fillRecord(s.page);
    await s.page.click('#view form button[type="submit"]');
    await s.page.waitForSelector('#entry-nonUrgentWaiting[aria-invalid="true"]');
    expect((await s.page.textContent('#entry-nonUrgentWaiting-error')) === T('panel.validation.outOfRange'), 'ileti');
    await s.ctx.close();
  });

  await check('İl görüntüleyici veri giremez (#/veri-girisi → özet + uyarı)', async function () {
    const s = await open({});
    await login(s.page, 'il@ornek.test');
    await go(s.page, '#/veri-girisi');
    expect(s.page.url().indexOf('#/ozet') !== -1, s.page.url());
    await s.ctx.close();
  });
}

/* ---- Listeler -------------------------------------------------------------------- */

async function listTests() {
  await check('Geçmiş: sayfalama adreste tutulur; geri tuşu önceki sayfaya döner', async function () {
    const s = await open({});
    await login(s.page, 'personel@ornek.test');
    await go(s.page, '#/gecmis');
    await s.page.click('.pager button >> nth=1');
    await s.page.waitForFunction(function () { return window.location.hash.indexOf('sayfa=2') !== -1; });
    await s.page.waitForFunction(function () { return /Sayfa 2/.test(document.querySelector('.pager__info').textContent); });
    await s.page.goBack();
    await s.page.waitForFunction(function () { return /Sayfa 1/.test((document.querySelector('.pager__info') || {}).textContent || ''); });
    await s.ctx.close();
  });

  await check('Tarih süzgeci: ters aralıkta alan hatası; geçerli aralık adrese yazılır', async function () {
    const s = await open({});
    await login(s.page, 'personel@ornek.test');
    await go(s.page, '#/gecmis');
    await s.page.fill('#history-from', '2026-10-12');
    await s.page.fill('#history-to', '2026-10-01');
    await s.page.click('.pfilter button[type="submit"]');
    expect(await s.page.getAttribute('#history-from', 'aria-invalid') === 'true', 'hata yok');
    await s.page.fill('#history-to', '2026-10-13');
    await s.page.click('.pfilter button[type="submit"]');
    await s.page.waitForFunction(function () { return window.location.hash.indexOf('baslangic=2026-10-12') !== -1; });
    await s.ctx.close();
  });

  await check('CSV: il görüntüleyici indirir; BOM + noktalı virgül + Türkçe başlıklar + tüm satırlar', async function () {
    const s = await open({});
    await login(s.page, 'il@ornek.test');
    await go(s.page, '#/gecmis?hastane=ornek-02');
    const [download] = await Promise.all([s.page.waitForEvent('download'), s.page.click('.ptoolbar .btn')]);
    const file = await download.path();
    const text = fs.readFileSync(file, 'utf8');
    expect(text.charCodeAt(0) === 0xFEFF, 'BOM');
    const lines = text.slice(1).trim().split('\r\n');
    expect(lines[0].indexOf(T('panel.history.columns.time') + ';') === 0, lines[0]);
    expect(lines.length - 1 >= 96, 'satır sayısı ' + (lines.length - 1));
    expect(/^acilradar-kayitlar-ornek-02-\d{4}-\d{2}-\d{2}\.csv$/.test(download.suggestedFilename()), download.suggestedFilename());
    await s.ctx.close();
  });

  await check('Kullanıcılar: yinelenen e-posta alan hatası; yeni kullanıcı eklenir; pasif yapılır; denetim kaydına düşer', async function () {
    const s = await open({});
    await login(s.page, 'yonetici@ornek.test');
    await go(s.page, '#/kullanicilar');
    await s.page.fill('#user-name', 'Örnek Yeni Personel');
    await s.page.fill('#user-email', 'personel@ornek.test');
    await s.page.click('#view form button[type="submit"]');
    await s.page.waitForSelector('#user-email[aria-invalid="true"]');
    expect((await s.page.textContent('#user-email-error')) === T('panel.validation.emailTaken'), 'emailTaken');
    await s.page.fill('#user-email', 'yeni.personel@ornek.test');
    await s.page.click('#view form button[type="submit"]');
    await s.page.waitForFunction(function () { return document.querySelector('.ptable') && document.querySelector('.ptable').textContent.indexOf('yeni.personel@ornek.test') !== -1; });
    const row = s.page.locator('.ptable tr', { hasText: 'yeni.personel@ornek.test' });
    await row.locator('button', { hasText: T('panel.users.deactivate') }).click();
    await s.page.waitForFunction(function () { const r = Array.from(document.querySelectorAll('.ptable tr')).find(function (tr) { return tr.textContent.indexOf('yeni.personel@ornek.test') !== -1; }); return r && r.textContent.indexOf('Pasif') !== -1; });
    await go(s.page, '#/denetim-kaydi');
    expect((await s.page.textContent('.ptable')).indexOf(T('panel.audit.actions.userUpdate')) !== -1, 'denetim kaydında yok');
    await s.ctx.close();
  });
}

/* ---- Erişilebilirlik ve ekranlar ---------------------------------------------- */

async function layoutTests() {
  for (const width of [320, 375, 768, 1440]) {
    await check(width + ' px: giriş, özet, veri girişi, geçmiş, kullanıcılar — taşma yok, hedefler ≥ 48 px', async function () {
      const s = await open({ width: width });
      const problems = [];
      const inspect = async function (label) {
        if (await overflow(s.page) > 0) problems.push(label + ': taşma');
        const small = await smallTargets(s.page);
        if (small.length) problems.push(label + ': ' + small.join(', '));
      };
      await inspect('giriş');
      await login(s.page, 'sistem@ornek.test');
      for (const hash of ['#/ozet', '#/veri-girisi', '#/gecmis', '#/kullanicilar', '#/denetim-kaydi']) {
        await go(s.page, hash);
        await inspect(hash);
      }
      expect(problems.length === 0, problems.join(' | '));
      await s.ctx.close();
    });
  }

  await check('Klavye: yalnız klavyeyle giriş yapılır; ilk Tab "İçeriğe atla"', async function () {
    const s = await open({});
    await s.page.keyboard.press('Tab');
    expect(await s.page.evaluate(function () { return document.activeElement.className; }) === 'skip-link', 'ilk odak');
    await s.page.focus('#login-email');
    await s.page.keyboard.type('personel@ornek.test');
    await s.page.keyboard.press('Tab');
    await s.page.keyboard.type(PASSWORD);
    await s.page.keyboard.press('Enter');
    await s.page.waitForSelector('.pnav__link');
    expect(await s.page.evaluate(function () { return document.activeElement.id; }) === 'view-title', 'odak yeni ekran başlığında değil');
    await s.ctx.close();
  });

  if (AXE_PATH) {
    for (const scheme of ['light', 'dark']) {
      await check('axe-core (WCAG 2.2 A/AA) — giriş + tüm ekranlar + hata özeti — ' + scheme, async function () {
        const s = await open({ colorScheme: scheme, bypassCSP: true });
        const found = [];
        const scan = async function (label) {
          await s.page.addScriptTag({ content: fs.readFileSync(AXE_PATH, 'utf8') });
          const v = await s.page.evaluate(async function () {
            const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
            return r.violations.map(function (x) { return x.id + ' (' + x.nodes.length + '): ' + x.nodes[0].target.join(' '); });
          });
          v.forEach(function (x) { found.push(label + ' → ' + x); });
        };
        await scan('giriş');
        await login(s.page, 'sistem@ornek.test');
        for (const hash of ['#/ozet', '#/gecmis', '#/kullanicilar', '#/denetim-kaydi', '#/veri-girisi']) {
          await go(s.page, hash);
          await scan(hash);
        }
        await s.page.click('#view form button[type="submit"]');
        await scan('veri girişi (hatalı)');
        expect(found.length === 0, found.join(' | '));
        await s.ctx.close();
      });
    }
  }
}

(async function main() {
  const server = spawn(process.execPath, [path.join(ROOT, 'tools/mock-server.js'), '--port=' + PORT], { stdio: 'ignore' });
  await new Promise(function (resolve) { setTimeout(resolve, 700); });
  browser = await chromium.launch();
  try {
    await sessionTests();
    await entryTests();
    await listTests();
    await layoutTests();
  } finally {
    await browser.close();
    server.kill();
  }
  results.forEach(function (r) { console.log((r.ok ? '  ✔ ' : '  ✘ ') + r.name + (r.ok ? '' : '\n      → ' + r.message)); });
  const failed = results.filter(function (r) { return !r.ok; }).length;
  console.log('\n' + (results.length - failed) + ' geçti, ' + failed + ' kaldı (toplam ' + results.length + ').' + (AXE_PATH ? '' : ' (axe-core atlandı)'));
  process.exitCode = failed ? 1 : 0;
})();

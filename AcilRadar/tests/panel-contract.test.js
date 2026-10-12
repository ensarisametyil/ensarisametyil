#!/usr/bin/env node
/* =============================================================================
 * tests/panel-contract.test.js
 * NE İŞE YARAR : Panel uçlarının docs/SOZLESME-PANEL.md'ye uyduğunu GERÇEK HTTP
 *                ve çerezle denetler. Yanıtlar arayüzün kendi dönüştürücüsünden
 *                (panel/js/schema.js) geçirilir: "arayüz bunu işleyebiliyor mu?".
 * KULLANIM     :
 *   node tools/mock-server.js &   sonra   node tests/panel-contract.test.js
 *   Gerçek arka uç: BASE_URL=https://sunucu STAFF_EMAIL=… ADMIN_EMAIL=… PANEL_PASSWORD=… \
 *                   STAFF_HOSPITAL=… node tests/panel-contract.test.js
 * NOT: Yalnız fetch kullanır (Node 18+); bağımlılığı yoktur. Testler kayıt EKLER;
 *      gerçek arka uçta yalnız test ortamında çalıştırın.
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadModules, ROOT } = require('./lib/load-modules');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:8787').replace(/\/$/, '');
const loaded = loadModules();
['panel/js/config.js', 'panel/js/strings.js', 'panel/js/rules.js', 'panel/js/schema.js', 'panel/js/mock.js']
  .forEach(function (f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), loaded.sandbox, { filename: f }); });
const P = loaded.AR.Panel;
const PASSWORD = process.env.PANEL_PASSWORD || P.Mock.PASSWORD;
const STAFF = process.env.STAFF_EMAIL || 'personel@ornek.test';
const ADMIN = process.env.ADMIN_EMAIL || 'yonetici@ornek.test';
const HOSPITAL = process.env.STAFF_HOSPITAL || 'ornek-01';
const CLIENT = {}; CLIENT[P.Config.CLIENT_HEADER.name] = P.Config.CLIENT_HEADER.value;

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

/** Basit çerez kavanozu: her "istemci" kendi oturumunu taşır. */
function client() {
  let cookie = '';
  return async function (method, p, options) {
    const o = options || {};
    const headers = Object.assign({ Accept: 'application/json' }, o.noClient ? {} : CLIENT, o.headers || {});
    if (o.body !== undefined) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(BASE_URL + p, { method: method, headers: headers, body: o.body === undefined ? undefined : JSON.stringify(o.body), redirect: 'manual' });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = /Max-Age=0/i.test(setCookie) ? '' : setCookie.split(';')[0];
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (error) { body = undefined; }
    return { status: res.status, body: body, headers: res.headers, setCookie: setCookie };
  };
}

function validRecord(over) {
  return Object.assign({ occupancyPercent: 64, greenWaiting: 20, yellowWaiting: 4, activePhysicians: 5, estimatedGreenWaitMinutes: [25, 40], estimatedYellowWaitMinutes: [5, 12] }, over || {});
}

function errorCode(res) {
  return res.body && res.body.error ? res.body.error.code : null;
}

(async function main() {
  console.log('Hedef: ' + BASE_URL);
  const staff = client();
  const admin = client();

  await check('Oturumsuz /auth/me → 401 + hata zarfı', async function () {
    const r = await client()('GET', '/api/v1/auth/me');
    expect(r.status === 401 && errorCode(r) === 'UNAUTHORIZED', r.status + ' ' + errorCode(r));
  });
  await check('Hatalı parola → 401 INVALID_CREDENTIALS (hangi alanın yanlış olduğu söylenmez)', async function () {
    const r = await client()('POST', '/api/v1/auth/login', { body: { email: STAFF, password: 'yanlis-parola' } });
    expect(r.status === 401 && errorCode(r) === 'INVALID_CREDENTIALS', r.status + ' ' + errorCode(r));
  });
  await check('CSRF başlığı olmayan yazma isteği → 403', async function () {
    const r = await client()('POST', '/api/v1/auth/login', { body: { email: STAFF, password: PASSWORD }, noClient: true });
    expect(r.status === 403, 'durum ' + r.status);
  });
  await check('Giriş → 200, HttpOnly + SameSite oturum çerezi, arayüz oturumu işleyebiliyor', async function () {
    const r = await staff('POST', '/api/v1/auth/login', { body: { email: STAFF, password: PASSWORD } });
    expect(r.status === 200, 'durum ' + r.status);
    expect(/HttpOnly/i.test(r.setCookie || '') && /SameSite=(Strict|Lax)/i.test(r.setCookie || ''), 'çerez bayrakları: ' + r.setCookie);
    const s = P.Schema.normalizeSession(r.body);
    expect(s.expiresInMs > 0 && s.user.role === 'hospital_staff', 'oturum');
    await admin('POST', '/api/v1/auth/login', { body: { email: ADMIN, password: PASSWORD } });
  });
  await check('/auth/me oturumu döndürür (kayan oturum)', async function () {
    const r = await staff('GET', '/api/v1/auth/me');
    expect(r.status === 200, 'durum ' + r.status);
    P.Schema.normalizeSession(r.body);
  });
  await check('Hastaneler: yalnız devlet hastaneleri, personel yalnız kendi hastanesi', async function () {
    const r = await staff('GET', '/api/v1/panel/hospitals');
    expect(r.status === 200, 'durum ' + r.status);
    expect(r.body.items.every(function (h) { return h.ownership === 'public'; }), 'özel hastane var');
    const list = P.Schema.normalizeHospitals(r.body);
    expect(list.length === 1 && list[0].id === HOSPITAL, 'kapsam');
  });
  await check('Kayıtlar: sayfalı yanıt, en yeni üstte, arayüz işleyebiliyor', async function () {
    const r = await staff('GET', '/api/v1/panel/hospitals/' + HOSPITAL + '/records?page=1&pageSize=5');
    expect(r.status === 200, 'durum ' + r.status);
    const page = P.Schema.normalizePage(r.body, P.Schema.normalizeRecord, 'record');
    expect(page.items.length === r.body.items.length, 'atlanan kayıt var');
    expect(page.items.every(function (item, i, all) { return i === 0 || all[i - 1].createdAtMs >= item.createdAtMs; }), 'sıra');
  });
  await check('Geçersiz kayıt → 422 VALIDATION + sunucu alan adlarıyla alan hataları', async function () {
    const r = await staff('POST', '/api/v1/panel/hospitals/' + HOSPITAL + '/records', { body: validRecord({ occupancyPercent: 150, estimatedGreenWaitMinutes: [60, 10] }) });
    expect(r.status === 422 && errorCode(r) === 'VALIDATION', r.status + ' ' + errorCode(r));
    const fields = P.Schema.normalizeError(r.status, r.body).fields;
    expect(fields.occupancyPercent && fields.nonUrgentWaitMinutesMin, 'alanlar: ' + JSON.stringify(r.body.error.fields));
  });
  await check('Aynı Idempotency-Key ile iki gönderim → tek kayıt (aynı recordId)', async function () {
    const key = 'contract-' + Date.now();
    const a = await staff('POST', '/api/v1/panel/hospitals/' + HOSPITAL + '/records', { body: validRecord(), headers: { 'Idempotency-Key': key } });
    const b = await staff('POST', '/api/v1/panel/hospitals/' + HOSPITAL + '/records', { body: validRecord(), headers: { 'Idempotency-Key': key } });
    expect(a.status === 201 && b.status === 201, a.status + ' / ' + b.status);
    expect(a.body.record.recordId === b.body.record.recordId, 'iki farklı kayıt oluştu');
    expect(P.Schema.normalizeRecord(a.body.record) !== null, 'arayüz kaydı işleyemedi');
  });
  await check('Personel kullanıcı listesini ve denetim kaydını göremez → 403', async function () {
    expect((await staff('GET', '/api/v1/panel/users')).status === 403, 'users');
    expect((await staff('GET', '/api/v1/panel/audit')).status === 403, 'audit');
  });
  await check('Yönetici: denetim kaydında son veri girişi ve değişiklikleri var', async function () {
    const r = await admin('GET', '/api/v1/panel/audit?page=1&pageSize=10');
    expect(r.status === 200, 'durum ' + r.status);
    const page = P.Schema.normalizePage(r.body, P.Schema.normalizeAudit, 'audit');
    expect(page.items.some(function (a) { return a.action === 'record.create' && a.changes.length > 0; }), 'record.create yok');
  });
  await check('Yönetici: yinelenen e-postayla kullanıcı → 422 emailTaken', async function () {
    const r = await admin('POST', '/api/v1/panel/users', { body: { name: 'Örnek Deneme', email: STAFF, role: 'hospital_staff' } });
    expect(r.status === 422 && r.body.error.fields && r.body.error.fields.email === 'emailTaken', JSON.stringify(r.body));
  });
  await check('Çıkış → 204; sonra /auth/me → 401', async function () {
    const out = await staff('POST', '/api/v1/auth/logout');
    expect(out.status === 204, 'durum ' + out.status);
    expect((await staff('GET', '/api/v1/auth/me')).status === 401, 'oturum kapanmadı');
  });

  results.forEach(function (r) { console.log((r.ok ? '  ✔ ' : '  ✘ ') + r.name + (r.ok ? '' : '\n      → ' + r.message)); });
  const failed = results.filter(function (r) { return !r.ok; }).length;
  console.log('\n' + (results.length - failed) + ' geçti, ' + failed + ' kaldı (toplam ' + results.length + ').');
  process.exitCode = failed ? 1 : 0;
})();

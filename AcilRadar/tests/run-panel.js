#!/usr/bin/env node
/* =============================================================================
 * tests/run-panel.js
 * NE İŞE YARAR : Hastane paneli için Node testleri (bağımlılıksız):
 *                1) Yetkiler (rol tablosu) ve form doğrulama — panel/js/rules.js
 *                2) Yanıt dönüştürme ve alan hatası eşlemesi — panel/js/schema.js
 *                3) CSV (ayırıcı, BOM, tırnaklama, formül enjeksiyonu) — panel/js/csv.js
 *                4) Örnek arka uç: oturum, 401/403/422/429, Idempotency-Key, kapsam
 *                5) Kaynak taramaları: metin anahtarları, gömülü metin, innerHTML/eval,
 *                   KVKK (formda kişisel veri alanı yok)
 * KULLANIM     : node tests/run-panel.js
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const nodeAssert = require('assert');
const { loadModules, ROOT } = require('./lib/load-modules');

const PANEL_FILES = ['panel/js/config.js', 'panel/js/strings.js', 'panel/js/rules.js', 'panel/js/schema.js', 'panel/js/mock.js', 'panel/js/csv.js'];
const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name: name, ok: true });
  } catch (error) {
    results.push({ name: name, ok: false, message: error.message });
  }
}

// Sanal ortamdan (vm) gelen nesneler JSON üzerinden karşılaştırılır.
function eq(actual, expected, message) {
  nodeAssert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)), message);
}
const ok = nodeAssert.ok;

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function load() {
  const loaded = loadModules();
  PANEL_FILES.forEach(function (f) { vm.runInContext(read(f), loaded.sandbox, { filename: f }); });
  return loaded;
}

const { AR, warnings } = load();
const loadWarnings = warnings.slice();
const P = AR.Panel;
const R = P.Rules;
const NOW = Date.parse('2026-10-12T22:00:00+03:00');

function user(role, hospitalId, extra) {
  return Object.assign({ id: 'x-' + role, name: 'Örnek', email: 'x@ornek.test', role: role, hospitalId: hospitalId || null, active: true }, extra || {});
}

/* ---- 1. Yetkiler ------------------------------------------------------------- */

const staff = user('hospital_staff', 'ornek-01');
const admin = user('hospital_admin', 'ornek-01');
const viewer = user('province_viewer');
const sysadmin = user('system_admin');

test('Yetki: rol tablosu (personel, yönetici, il, sistem)', function () {
  eq([R.can(staff, 'records.create'), R.can(staff, 'users.manage'), R.can(staff, 'audit.view')], [true, false, false]);
  eq([R.can(admin, 'users.manage'), R.can(admin, 'audit.view'), R.can(admin, 'hospitals.all')], [true, true, false]);
  eq([R.can(viewer, 'records.create'), R.can(viewer, 'hospitals.all'), R.can(viewer, 'users.manage')], [false, true, false]);
  eq([R.can(sysadmin, 'users.all'), R.can(sysadmin, 'records.create')], [true, true]);
  ok(!R.can(user('hospital_staff', 'ornek-01', { active: false }), 'records.view'), 'pasif kullanıcı');
  ok(!R.can(null, 'records.view'));
  ok(!R.can(user('bilinmeyen_rol'), 'records.view'));
});

test('Yetki: hastane kapsamı — personel yalnız kendi hastanesi; il görüntüleyici veri giremez', function () {
  ok(R.canCreateRecord(staff, 'ornek-01'));
  ok(!R.canCreateRecord(staff, 'ornek-02'));
  ok(R.canAccessHospital(viewer, 'ornek-05'));
  ok(!R.canCreateRecord(viewer, 'ornek-05'));
  ok(R.canCreateRecord(sysadmin, 'ornek-05'));
});

test('Yetki: atanabilir roller ve kullanıcı düzenleme', function () {
  eq(R.assignableRoles(admin), ['hospital_staff', 'hospital_admin']);
  eq(R.assignableRoles(staff), []);
  ok(!R.canEditUser(admin, admin), 'kendi hesabı');
  ok(R.canEditUser(admin, user('hospital_staff', 'ornek-01', { id: 'y' })));
  ok(!R.canEditUser(admin, user('hospital_staff', 'ornek-02', { id: 'y' })), 'başka hastane');
  ok(!R.canEditUser(admin, user('system_admin', null, { id: 'y' })), 'üst rol');
  ok(R.canEditUser(sysadmin, user('province_viewer', null, { id: 'y' })));
});

/* ---- 1b. Form doğrulama ------------------------------------------------------- */

function recordInput(over) {
  return Object.assign({
    occupancyPercent: '62', nonUrgentWaiting: '34', urgentWaiting: '9', activePhysicians: '6',
    nonUrgentWaitMinutesMin: '58', nonUrgentWaitMinutesMax: '82', urgentWaitMinutesMin: '7', urgentWaitMinutesMax: '15'
  }, over || {});
}

test('Doğrulama: geçerli kayıt sayılara çevrilir', function () {
  const r = R.validateRecord(recordInput());
  ok(r.ok);
  eq(r.values, { occupancyPercent: 62, nonUrgentWaiting: 34, urgentWaiting: 9, activePhysicians: 6, nonUrgentWaitMinutes: [58, 82], urgentWaitMinutes: [7, 15] });
});

test('Doğrulama: boş, ondalıklı, negatif, metin, sınır dışı', function () {
  const r = R.validateRecord(recordInput({ occupancyPercent: '', nonUrgentWaiting: '12,5', urgentWaiting: '-1', activePhysicians: 'beş' }));
  eq(r.errors.occupancyPercent.key, 'required');
  eq(r.errors.nonUrgentWaiting.key, 'integer');
  eq(r.errors.urgentWaiting.key, 'integer');
  eq(r.errors.activePhysicians.key, 'integer');
  eq(R.validateRecord(recordInput({ occupancyPercent: '101' })).errors.occupancyPercent, { key: 'max', params: { max: 100 } });
  eq(R.validateRecord(recordInput({ activePhysicians: '501' })).errors.activePhysicians.key, 'max');
  eq(R.validateRecord(recordInput({ nonUrgentWaitMinutesMax: '1441' })).errors.nonUrgentWaitMinutesMax.key, 'max');
  ok(R.validateRecord(recordInput({ occupancyPercent: '0', nonUrgentWaiting: '0' })).ok, 'sıfır geçerli');
  ok(R.validateRecord(recordInput({ occupancyPercent: ' 100 ' })).ok, 'boşluklu sayı');
});

test('Doğrulama: aralıkta en az > en çok → rangeOrder (en az kutusunda)', function () {
  const r = R.validateRecord(recordInput({ urgentWaitMinutesMin: '30', urgentWaitMinutesMax: '10' }));
  ok(!r.ok);
  eq(r.errors.urgentWaitMinutesMin.key, 'rangeOrder');
  ok(!r.errors.urgentWaitMinutesMax);
  ok(R.validateRecord(recordInput({ urgentWaitMinutesMin: '10', urgentWaitMinutesMax: '10' })).ok, 'eşit geçerli');
});

test('Doğrulama: kullanıcı formu', function () {
  const good = R.validateUser({ name: ' Örnek Kişi ', email: 'Kisi@Ornek.TEST', role: 'hospital_staff', hospitalId: 'ornek-09' }, admin);
  ok(good.ok);
  eq(good.values, { name: 'Örnek Kişi', email: 'kisi@ornek.test', role: 'hospital_staff', hospitalId: 'ornek-01' });
  const bad = R.validateUser({ name: '', email: 'yanlis', role: 'system_admin' }, admin);
  eq([bad.errors.name.key, bad.errors.email.key, bad.errors.role.key], ['required', 'email', 'roleNotAllowed']);
  eq(R.validateUser({ name: 'A', email: 'a@b.co', role: 'hospital_staff', hospitalId: '' }, sysadmin).errors.hospitalId.key, 'hospitalRequired');
  ok(R.validateUser({ name: 'A', email: 'a@b.co', role: 'province_viewer' }, sysadmin).ok);
  eq(R.validateUser({ name: 'A'.repeat(81), email: 'a@b.co', role: 'hospital_staff' }, admin).errors.name.key, 'tooLong');
});

test('Doğrulama: tarih aralığı', function () {
  ok(R.validateDateRange('', '').ok);
  ok(R.validateDateRange('2026-10-01', '2026-10-12').ok);
  ok(!R.validateDateRange('2026-10-12', '2026-10-01').ok);
  ok(!R.validateDateRange('12.10.2026', '').ok);
});

/* ---- 2. Şema ----------------------------------------------------------------- */

const S = P.Schema;

function serverRecord(over) {
  return Object.assign({ recordId: 'r1', hospitalId: 'ornek-01', createdAt: '2026-10-12T21:30:00+03:00', createdBy: { userId: 'u', name: 'Örnek' },
    occupancyPercent: 62, crowdingLevel: 'medium', greenWaiting: 34, yellowWaiting: 9, activePhysicians: 6,
    estimatedGreenWaitMinutes: [58, 82], estimatedYellowWaitMinutes: [7, 15] }, over || {});
}

test('Şema: oturum yanıtı; kalan süre sunucu saatine göre', function () {
  const s = S.normalizeSession({ user: { userId: 'u1', name: 'Örnek', email: 'a@ornek.test', role: 'hospital_staff', hospitalId: 'ornek-01', active: true },
    session: { expiresAt: '2026-10-12T22:30:00+03:00', serverTime: '2026-10-12T22:00:00+03:00' } });
  eq(s.expiresInMs, 30 * 60000);
  eq(s.user.id, 'u1');
  nodeAssert.throws(function () { S.normalizeSession({ user: { userId: 'u1', name: 'x', email: 'a', role: 'hospital_staff' }, session: {} }); });
  nodeAssert.throws(function () { S.normalizeSession({ user: { userId: 'u1', name: 'x', email: 'a', role: 'yonetici' }, session: { expiresAt: '2026-10-12T22:30:00Z', serverTime: '2026-10-12T22:00:00Z' } }); });
});

test('Şema: kayıt alan adları eşlenir; bozuk kayıt atlanır', function () {
  const r = S.normalizeRecord(serverRecord());
  eq([r.nonUrgentWaiting, r.urgentWaiting, r.nonUrgentWaitMinutes], [34, 9, [58, 82]]);
  eq(S.normalizeRecord(serverRecord({ estimatedGreenWaitMinutes: [90, 10] })), null);
  eq(S.normalizeRecord(serverRecord({ occupancyPercent: 140 })), null);
  eq(S.normalizeRecord(serverRecord({ createdAt: 'dün' })), null);
  const page = S.normalizePage({ items: [serverRecord(), { bozuk: true }], page: 2, pageSize: 20, total: 45 }, S.normalizeRecord, 'record');
  eq([page.items.length, page.page, page.pages, page.total], [1, 2, 3, 45]);
});

test('Şema: hastane listesinde yalnız devlet hastaneleri kalır', function () {
  const list = S.normalizeHospitals({ items: [
    { hospitalId: 'a', name: 'Örnek Devlet Hastanesi A', ownership: 'public', latest: null },
    { hospitalId: 'b', name: 'Örnek Özel Hastane', ownership: 'private', latest: null },
    { hospitalId: 'c', name: 'Türü yok' }
  ] });
  eq(list.map(function (h) { return h.id; }), ['a']);
});

test('Şema: hata zarfı → kod + form alanı; sunucu iletisi kullanılmaz', function () {
  const e = S.normalizeError(422, { error: { code: 'VALIDATION', message: '<b>x</b>', fields: { estimatedGreenWaitMinutes: 'rangeOrder', greenWaiting: 'outOfRange', email: 'emailTaken', bilinmeyen: 'x', occupancyPercent: 'tuhaf' } } });
  eq(e.code, 'VALIDATION');
  eq(e.fields, { nonUrgentWaitMinutesMin: { key: 'rangeOrder' }, nonUrgentWaiting: { key: 'outOfRange' }, email: { key: 'emailTaken' }, occupancyPercent: { key: 'generic' } });
  eq(S.normalizeError(401, null).code, 'UNAUTHORIZED');
  eq(S.normalizeError(502, 'html').code, 'INTERNAL');
  eq(S.normalizeError(418, {}).code, 'UNKNOWN');
});

test('Şema: yazma isteği sunucu adlarıyla gider', function () {
  eq(S.toServerRecord({ occupancyPercent: 1, nonUrgentWaiting: 2, urgentWaiting: 3, activePhysicians: 4, nonUrgentWaitMinutes: [5, 6], urgentWaitMinutes: [7, 8] }),
    { occupancyPercent: 1, greenWaiting: 2, yellowWaiting: 3, activePhysicians: 4, estimatedGreenWaitMinutes: [5, 6], estimatedYellowWaitMinutes: [7, 8] });
});

/* ---- 3. CSV -------------------------------------------------------------------- */

test('CSV: BOM, noktalı virgül, tırnaklama, formül enjeksiyonu koruması', function () {
  const csv = P.Csv.build([{ label: 'Ad', value: function (r) { return r.a; } }, { label: 'Not', value: function (r) { return r.b; } }],
    [{ a: 'Örnek; Hastane', b: '"tırnak"' }, { a: '=HYPERLINK("x")', b: '-5' }, { a: 'çok\nsatır', b: null }]);
  ok(csv.charCodeAt(0) === 0xFEFF, 'BOM');
  const lines = csv.slice(1).split('\r\n');
  eq(lines[0], 'Ad;Not');
  eq(lines[1], '"Örnek; Hastane";"""tırnak"""');
  eq(lines[2], '"\'=HYPERLINK(""x"")";\'-5');
  ok(csv.indexOf('"çok\nsatır";') !== -1);
  eq(P.Csv.fileName('kayitlar', 'ornek/01', '2026-10-12'), 'acilradar-kayitlar-ornek_01-2026-10-12.csv');
});

/* ---- 4. Örnek arka uç ----------------------------------------------------------- */

const CLIENT = { 'x-acilradar-client': 'panel' };

/** Örnek arka uca bağlı bir istemci; aynı arka uca birden fazla istemci bağlanabilir. */
function backend(shared) {
  const b = shared || P.Mock.createBackend(NOW);
  const session = { token: null };
  const call = function (method, p, opts) {
    const o = opts || {};
    const res = b.handle({ method: method, path: p, query: o.query || {}, body: o.body || null, headers: Object.assign({}, o.noClient ? {} : CLIENT, o.headers || {}), sessionToken: o.token === undefined ? session.token : o.token, nowMs: o.now || NOW });
    if (res.session && res.session.set) session.token = res.session.set;
    if (res.session && res.session.clear) session.token = null;
    return res;
  };
  call.server = b;
  call.login = function (email) { return call('POST', '/api/v1/auth/login', { body: { email: email, password: P.Mock.PASSWORD } }); };
  return call;
}

function validBody(over) {
  return Object.assign({ occupancyPercent: 70, greenWaiting: 30, yellowWaiting: 5, activePhysicians: 6, estimatedGreenWaitMinutes: [20, 40], estimatedYellowWaitMinutes: [5, 10] }, over || {});
}

test('Örnek arka uç: giriş, /auth/me, çıkış', function () {
  const api = backend();
  eq(api('GET', '/api/v1/auth/me').status, 401);
  const res = api.login('personel@ornek.test');
  eq(res.status, 200);
  ok(S.normalizeSession(res.body).user.role === 'hospital_staff');
  eq(api('GET', '/api/v1/auth/me').status, 200);
  eq(api('POST', '/api/v1/auth/logout').status, 204);
  eq(api('GET', '/api/v1/auth/me').status, 401);
});

test('Örnek arka uç: hatalı parola 401, pasif hesap 403, 5 hatadan sonra 429 + Retry-After', function () {
  const api = backend();
  const wrong = function () { return api('POST', '/api/v1/auth/login', { body: { email: 'personel@ornek.test', password: 'yanlis' } }); };
  eq(wrong().body.error.code, 'INVALID_CREDENTIALS');
  eq(api('POST', '/api/v1/auth/login', { body: { email: 'pasif@ornek.test', password: P.Mock.PASSWORD } }).body.error.code, 'ACCOUNT_INACTIVE');
  for (let i = 0; i < 4; i += 1) wrong();
  const locked = api.login('personel@ornek.test');
  eq(locked.status, 429);
  ok(/^\d+$/.test(locked.headers['Retry-After']));
});

test('Örnek arka uç: CSRF başlığı olmayan yazma isteği reddedilir', function () {
  const api = backend();
  eq(api('POST', '/api/v1/auth/login', { body: { email: 'personel@ornek.test', password: P.Mock.PASSWORD }, noClient: true }).status, 403);
});

test('Örnek arka uç: kapsam — personel başka hastaneyi göremez; il görüntüleyici veri giremez', function () {
  const api = backend();
  api.login('personel@ornek.test');
  eq(api('GET', '/api/v1/panel/hospitals').body.items.length, 1);
  eq(api('GET', '/api/v1/panel/hospitals/ornek-02/records').status, 403);
  eq(api('GET', '/api/v1/panel/hospitals/yok/records').status, 404);
  eq(api('GET', '/api/v1/panel/users').status, 403);
  const il = backend();
  il.login('il@ornek.test');
  const items = il('GET', '/api/v1/panel/hospitals').body.items;
  eq(items.length, 8);
  ok(items.every(function (h) { return h.ownership === 'public'; }));
  eq(il('POST', '/api/v1/panel/hospitals/ornek-01/records', { body: validBody() }).status, 403);
});

test('Örnek arka uç: kayıt — 422 alan hataları, Idempotency-Key ile çift kayıt olmaz', function () {
  const api = backend();
  api.login('personel@ornek.test');
  const bad = api('POST', '/api/v1/panel/hospitals/ornek-01/records', { body: validBody({ occupancyPercent: 120, estimatedGreenWaitMinutes: [50, 10] }) });
  eq(bad.status, 422);
  eq(bad.body.error.fields, { occupancyPercent: 'outOfRange', estimatedGreenWaitMinutes: 'rangeOrder' });
  const before = api('GET', '/api/v1/panel/hospitals/ornek-01/records').body.total;
  const first = api('POST', '/api/v1/panel/hospitals/ornek-01/records', { body: validBody(), headers: { 'idempotency-key': 'k-1' } });
  const again = api('POST', '/api/v1/panel/hospitals/ornek-01/records', { body: validBody(), headers: { 'idempotency-key': 'k-1' } });
  eq([first.status, again.status], [201, 201]);
  eq(first.body.record.recordId, again.body.record.recordId);
  eq(api('GET', '/api/v1/panel/hospitals/ornek-01/records').body.total, before + 1);
  eq(first.body.record.crowdingLevel, 'medium');
});

test('Örnek arka uç: sayfalama, en yeni üstte, tarih süzgeci', function () {
  const api = backend();
  api.login('personel@ornek.test');
  const page = api('GET', '/api/v1/panel/hospitals/ornek-01/records', { query: { page: '2', pageSize: '10' } }).body;
  eq([page.page, page.pageSize, page.items.length], [2, 10, 10]);
  ok(Date.parse(page.items[0].createdAt) > Date.parse(page.items[9].createdAt));
  const day = api('GET', '/api/v1/panel/hospitals/ornek-01/records', { query: { from: '2026-10-12', to: '2026-10-12', pageSize: '100' } }).body;
  ok(day.items.every(function (r) { return r.createdAt.slice(0, 10) === '2026-10-12'; }));
  eq(api('GET', '/api/v1/panel/hospitals/ornek-01/records', { query: { from: '2026-10-12', to: '2026-10-01' } }).status, 400);
});

test('Örnek arka uç: kullanıcılar — yinelenen e-posta, rol sınırı, kendi hesabı, pasif yapınca oturum kapanır', function () {
  const api = backend();
  api.login('yonetici@ornek.test');
  const list = api('GET', '/api/v1/panel/users').body.items;
  ok(list.every(function (u) { return u.hospitalId === 'ornek-01'; }), 'kapsam');
  eq(api('POST', '/api/v1/panel/users', { body: { name: 'Örnek Yeni', email: 'personel@ornek.test', role: 'hospital_staff' } }).body.error.fields, { email: 'emailTaken' });
  eq(api('POST', '/api/v1/panel/users', { body: { name: 'Örnek Yeni', email: 'yeni@ornek.test', role: 'system_admin' } }).body.error.fields, { role: 'roleNotAllowed' });
  eq(api('POST', '/api/v1/panel/users', { body: { name: 'Örnek Yeni', email: 'yeni@ornek.test', role: 'hospital_staff' } }).status, 201);
  eq(api('PATCH', '/api/v1/panel/users/u-yonetici', { body: { role: 'hospital_staff' } }).status, 403);
  const staffApi = backend(api.server);
  staffApi.login('personel@ornek.test');
  eq(staffApi('GET', '/api/v1/auth/me').status, 200);
  eq(api('PATCH', '/api/v1/panel/users/u-personel', { body: { active: false } }).status, 200);
  eq(staffApi('GET', '/api/v1/auth/me').status, 401, 'pasif yapılan kullanıcının oturumu kapanmalı');
});

test('Örnek arka uç: denetim kaydı — işlem ve değişiklik yazılır, yönetici yalnız kendi hastanesini görür', function () {
  const api = backend();
  api.login('yonetici@ornek.test');
  api('POST', '/api/v1/panel/hospitals/ornek-01/records', { body: validBody({ occupancyPercent: 33 }) });
  const audit = api('GET', '/api/v1/panel/audit').body.items;
  eq(audit[0].action, 'record.create');
  ok(audit[0].changes.some(function (c) { return c.field === 'occupancyPercent' && c.to === 33; }));
  ok(!audit.some(function (a) { return a.target && a.target.id === 'ornek-02'; }), 'başka hastane görünmemeli');
  const normalized = S.normalizePage(api('GET', '/api/v1/panel/audit').body, S.normalizeAudit, 'audit');
  ok(normalized.items.length > 0);
});

/* ---- 5. Kaynak taramaları ------------------------------------------------------- */

const PANEL_JS = ['panel/js/config.js', 'panel/js/strings.js', 'panel/js/rules.js', 'panel/js/schema.js', 'panel/js/api.js', 'panel/js/mock.js', 'panel/js/csv.js', 'panel/js/app.js']
  .concat(fs.readdirSync(path.join(ROOT, 'panel/js/ui')).map(function (f) { return 'panel/js/ui/' + f; }))
  .concat(fs.readdirSync(path.join(ROOT, 'panel/js/screens')).map(function (f) { return 'panel/js/screens/' + f; }));

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/\s.*$/gm, '');
}

test('Kaynak: panelde çağrılan tüm metin anahtarları var', function () {
  const missing = [];
  const re = /\bt\('([A-Za-z0-9_.]+)'\s*[,)]/g;
  PANEL_JS.forEach(function (f) {
    const src = stripComments(read(f));
    let m;
    while ((m = re.exec(src))) if (!AR.Strings.has(m[1])) missing.push(f + ': ' + m[1]);
  });
  const html = read('panel/index.html').replace(/<!--[\s\S]*?-->/g, '');
  const reHtml = /data-text(?:-list)?="([^"]+)"|data-text-attr="[^":]+:([^"]+)"/g;
  let m;
  while ((m = reHtml.exec(html))) if (!AR.Strings.has(m[1] || m[2])) missing.push('panel/index.html: ' + (m[1] || m[2]));
  eq(missing, []);
});

test('Kaynak: panelde strings.js ve mock.js dışında gömülü Türkçe metin yok', function () {
  const found = [];
  PANEL_JS.filter(function (f) { return ['panel/js/strings.js', 'panel/js/mock.js'].indexOf(f) === -1; }).forEach(function (f) {
    (stripComments(read(f)).match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) || []).forEach(function (lit) { if (/[çğıöşüÇĞİÖŞÜ]/.test(lit)) found.push(f + ': ' + lit); });
  });
  eq(found, []);
});

test('Kaynak: panelde innerHTML / eval / satır içi betik-olay-stil yok', function () {
  const offenders = PANEL_JS.filter(function (f) { return /\.innerHTML\s*=|insertAdjacentHTML|\beval\(|new Function\(|document\.write/.test(stripComments(read(f))); });
  const html = read('panel/index.html');
  if (/\son[a-z]+=/i.test(html) || /<script(?![^>]*\bsrc=)[^>]*>/i.test(html) || /<style/i.test(html) || /\sstyle=/i.test(html)) offenders.push('panel/index.html');
  eq(offenders, []);
});

test('KVKK: veri girişinde yalnız toplu sayı alanları; serbest metin/kişisel veri alanı yok', function () {
  const entry = read('panel/js/screens/entry.js');
  ok(entry.indexOf("el('textarea'") === -1, 'textarea var');
  eq(Object.keys(S.RECORD_MAP).sort(), ['activePhysicians', 'nonUrgentWaitMinutes', 'nonUrgentWaiting', 'occupancyPercent', 'urgentWaitMinutes', 'urgentWaiting']);
  ok(!/\b(tc|tckn|kimlik|hasta(Adi|Ad)|patient)\b/i.test(stripComments(entry)), 'kişisel veri alanı adı bulundu');
});

test('Panel metinlerinde ünlem, "canlı/anlık", "en iyi" yok', function () {
  const all = JSON.stringify(AR.Strings.data.panel).toLocaleLowerCase('tr-TR');
  ['!', 'canlı', 'anlık', 'gerçek zamanlı', 'en iyi'].forEach(function (w) { ok(all.indexOf(w) === -1, w); });
});

test('Panel yüklenirken konsol uyarısı yok', function () {
  eq(loadWarnings, []);
});

results.forEach(function (r) { console.log((r.ok ? '  ✔ ' : '  ✘ ') + r.name + (r.ok ? '' : '\n      → ' + r.message.split('\n').join('\n        '))); });
const failed = results.filter(function (r) { return !r.ok; }).length;
console.log('\n' + (results.length - failed) + ' geçti, ' + failed + ' kaldı (toplam ' + results.length + ').');
process.exitCode = failed ? 1 : 0;

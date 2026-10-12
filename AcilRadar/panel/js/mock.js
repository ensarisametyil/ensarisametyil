/* =============================================================================
 * panel/js/mock.js
 * NE İŞE YARAR : Panel için SAHTE arka uç. docs/SOZLESME-PANEL.md'deki uçları
 *                taklit eder: giriş/çıkış/oturum, hastaneler, kayıtlar, denetim
 *                kaydı, kullanıcılar. Sunucu tarafı yetki denetimini, doğrulamayı,
 *                Idempotency-Key'i ve giriş deneme sınırını (429) da uygular.
 *                Tarayıcıdaki 'mock' ortamı ve tools/mock-server.js aynı kodu kullanır.
 * VERDİĞİ      : AcilRadar.Panel.Mock → createBackend(nowMs), ACCOUNTS, PASSWORD
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Örnek hesaplar: SEED_USERS (parola: PASSWORD)
 *   - Geçmiş kayıt sayısı: HISTORY_HOURS, HISTORY_STEP_MINUTES
 * NOT: Gerçek veri DEĞİLDİR; kişi adları "Örnek …" biçimindedir. Veriler bellekte
 *      tutulur, sayfa yenilenince sıfırlanır. Canlı ortamda bu dosya yüklenmez.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.Panel.Config;
  const Rules = AR.Panel.Rules;
  const iso = AR.Mock.istanbulIso;

  const PASSWORD = 'Ornek-Parola-1';
  const MS_PER_MINUTE = 60000;
  const MS_PER_SECOND = 1000;
  const SESSION_MINUTES = 30;
  const LOGIN_MAX_ATTEMPTS = 5;
  const LOCK_SECONDS = 60;
  const HISTORY_HOURS = 48;
  const HISTORY_STEP_MINUTES = 30;
  const STALE_SAMPLE_ID = 'ornek-06';
  const STALE_SAMPLE_AGE_MINUTES = 75;
  const PAGE_SIZE_MAX = 100;
  const CROWDING_FROM = { medium: 50, high: 80 };
  const SEED_AUDIT_RECORDS = 12;
  const DAILY_SWING = 0.15;
  const WAIT_SPREAD = 1.4;
  const URGENT_SHARE = 0.25;
  const PATIENTS_PER_LOAD = 48;
  const MINUTES_PER_PATIENT = 9;
  const HOURS_PER_DAY = 24;
  const MINUTES_PER_HOUR = 60;
  const URGENT_WAIT = [5, 20];
  const HTTP = { OK: 200, CREATED: 201, NO_CONTENT: 204, BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, UNPROCESSABLE: 422, TOO_MANY: 429 };

  const SEED_USERS = [
    { userId: 'u-personel', name: 'Örnek Personel', email: 'personel@ornek.test', role: 'hospital_staff', hospitalId: 'ornek-01', active: true },
    { userId: 'u-yonetici', name: 'Örnek Yönetici', email: 'yonetici@ornek.test', role: 'hospital_admin', hospitalId: 'ornek-01', active: true },
    { userId: 'u-il', name: 'Örnek İl Görüntüleyici', email: 'il@ornek.test', role: 'province_viewer', hospitalId: null, active: true },
    { userId: 'u-sistem', name: 'Örnek Sistem Yöneticisi', email: 'sistem@ornek.test', role: 'system_admin', hospitalId: null, active: true },
    { userId: 'u-personel-2', name: 'Örnek Personel İki', email: 'personel2@ornek.test', role: 'hospital_staff', hospitalId: 'ornek-02', active: true },
    { userId: 'u-pasif', name: 'Örnek Pasif Kullanıcı', email: 'pasif@ornek.test', role: 'hospital_staff', hospitalId: 'ornek-01', active: false }
  ];

  /* ---- Yardımcılar ------------------------------------------------------------- */

  function crowdingFor(percent) {
    if (percent >= CROWDING_FROM.high) return 'high';
    if (percent >= CROWDING_FROM.medium) return 'medium';
    return 'low';
  }

  function respond(status, body, extra) {
    return Object.assign({ status: status, headers: {}, body: body === undefined ? null : body }, extra || {});
  }

  function fail(status, code, fields, headers) {
    const error = { code: code, message: 'Örnek sunucu hatası (' + code + ')' };
    if (fields) error.fields = fields;
    return respond(status, { error: error }, { headers: headers || {} });
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function localDate(ms) {
    return iso(ms).slice(0, 10);
  }

  /** Tekrarlanabilir dalgalanma: saat ve hastaneye göre 0–1 arası. */
  function wave(index, ms) {
    const hour = new Date(ms).getUTCHours();
    return Math.sin(((hour + index * 3) / HOURS_PER_DAY) * Math.PI * 2);
  }

  /* ---- Başlangıç verisi -------------------------------------------------------- */

  function buildRecord(sample, index, createdAtMs, seq, author) {
    const load = Math.min(1, Math.max(0.05, sample.baseLoad + wave(index, createdAtMs) * DAILY_SWING));
    const occupancy = Math.round(load * 100);
    const waiting = Math.round(load * PATIENTS_PER_LOAD);
    const waitLow = Math.round((waiting / sample.physicians) * MINUTES_PER_PATIENT);
    return {
      recordId: 'r-' + seq,
      hospitalId: sample.id,
      createdAt: iso(createdAtMs),
      createdBy: { userId: author.userId, name: author.name },
      occupancyPercent: occupancy,
      crowdingLevel: crowdingFor(occupancy),
      greenWaiting: waiting,
      yellowWaiting: Math.round(waiting * URGENT_SHARE),
      activePhysicians: sample.physicians,
      estimatedGreenWaitMinutes: [waitLow, Math.round(waitLow * WAIT_SPREAD)],
      estimatedYellowWaitMinutes: URGENT_WAIT.slice()
    };
  }

  function seedRecords(state, nowMs) {
    const steps = (HISTORY_HOURS * MINUTES_PER_HOUR) / HISTORY_STEP_MINUTES;
    AR.Mock.SAMPLES.forEach(function (sample, index) {
      const author = state.users.find(function (u) { return u.hospitalId === sample.id && u.role === 'hospital_staff'; }) || state.users[0];
      const offset = sample.id === STALE_SAMPLE_ID ? STALE_SAMPLE_AGE_MINUTES : (index % 3) * 4 + 3;
      for (let i = steps - 1; i >= 0; i -= 1) {
        const at = nowMs - (offset + i * HISTORY_STEP_MINUTES) * MS_PER_MINUTE;
        state.seq += 1;
        state.records.push(buildRecord(sample, index, at, state.seq, author));
      }
    });
  }

  function seedAudit(state) {
    const recent = state.records.slice().sort(function (a, b) { return Date.parse(b.createdAt) - Date.parse(a.createdAt); }).slice(0, SEED_AUDIT_RECORDS);
    recent.reverse().forEach(function (record) {
      const actor = state.users.find(function (u) { return u.userId === record.createdBy.userId; });
      addAudit(state, Date.parse(record.createdAt), actor, 'record.create', { type: 'hospital', id: record.hospitalId, label: hospitalName(state, record.hospitalId) }, [
        { field: 'occupancyPercent', from: null, to: record.occupancyPercent }
      ], record.hospitalId);
    });
  }

  function hospitalName(state, id) {
    const hospital = state.hospitals.find(function (h) { return h.hospitalId === id; });
    return hospital ? hospital.name : id;
  }

  function addAudit(state, atMs, actor, action, target, changes, hospitalId) {
    state.seq += 1;
    state.audit.push({
      auditId: 'a-' + state.seq,
      at: iso(atMs),
      actor: { userId: actor.userId, name: actor.name, role: actor.role },
      action: action,
      target: target,
      changes: changes,
      hospitalId: hospitalId || null
    });
  }

  /* ---- Oturum ------------------------------------------------------------------ */

  function toPanelUser(raw) {
    return { id: raw.userId, role: raw.role, hospitalId: raw.hospitalId, active: raw.active };
  }

  function publicUser(raw) {
    return { userId: raw.userId, name: raw.name, email: raw.email, role: raw.role, hospitalId: raw.hospitalId, active: raw.active, lastLoginAt: raw.lastLoginAt || null };
  }

  function sessionBody(state, session, nowMs) {
    const user = state.users.find(function (u) { return u.userId === session.userId; });
    return { user: publicUser(user), session: { expiresAt: iso(session.expiresAtMs), serverTime: iso(nowMs) }, twoFactorRequired: false };
  }

  function currentSession(state, token, nowMs) {
    const session = token ? state.sessions[token] : null;
    if (!session || session.expiresAtMs <= nowMs) return null;
    const user = state.users.find(function (u) { return u.userId === session.userId; });
    return user && user.active ? { session: session, user: user } : null;
  }

  function newToken(state) {
    state.seq += 1;
    return 'mock-' + state.seq + '-' + Math.random().toString(36).slice(2);
  }

  function login(state, req) {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const lock = state.attempts[email] || { count: 0, lockedUntilMs: 0 };
    if (lock.lockedUntilMs > req.nowMs) {
      return fail(HTTP.TOO_MANY, 'RATE_LIMITED', null, { 'Retry-After': String(Math.ceil((lock.lockedUntilMs - req.nowMs) / MS_PER_SECOND)) });
    }
    const user = state.users.find(function (u) { return u.email === email; });
    if (!user || body.password !== PASSWORD) {
      lock.count += 1;
      if (lock.count >= LOGIN_MAX_ATTEMPTS) {
        lock.lockedUntilMs = req.nowMs + LOCK_SECONDS * MS_PER_SECOND;
        lock.count = 0;
      }
      state.attempts[email] = lock;
      return fail(HTTP.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    }
    if (!user.active) return fail(HTTP.FORBIDDEN, 'ACCOUNT_INACTIVE');
    delete state.attempts[email];
    const token = newToken(state);
    const session = { userId: user.userId, expiresAtMs: req.nowMs + SESSION_MINUTES * MS_PER_MINUTE };
    state.sessions[token] = session;
    user.lastLoginAt = iso(req.nowMs);
    addAudit(state, req.nowMs, user, 'auth.login', { type: 'user', id: user.userId, label: user.name }, [], user.hospitalId);
    return respond(HTTP.OK, sessionBody(state, session, req.nowMs), { session: { set: token, expiresAtMs: session.expiresAtMs, userId: user.userId } });
  }

  function logout(state, req, auth) {
    if (auth) {
      addAudit(state, req.nowMs, auth.user, 'auth.logout', { type: 'user', id: auth.user.userId, label: auth.user.name }, [], auth.user.hospitalId);
      delete state.sessions[req.sessionToken];
    }
    return respond(HTTP.NO_CONTENT, null, { session: { clear: true } });
  }

  /** /auth/me: kayan oturum — her çağrı süreyi yeniler. */
  function me(state, req, auth) {
    auth.session.expiresAtMs = req.nowMs + SESSION_MINUTES * MS_PER_MINUTE;
    return respond(HTTP.OK, sessionBody(state, auth.session, req.nowMs), { session: { set: req.sessionToken, expiresAtMs: auth.session.expiresAtMs, userId: auth.user.userId } });
  }

  /* ---- Hastaneler ve kayıtlar ------------------------------------------------- */

  function latestRecord(state, hospitalId) {
    return state.records.filter(function (r) { return r.hospitalId === hospitalId; })
      .reduce(function (best, r) { return !best || Date.parse(r.createdAt) > Date.parse(best.createdAt) ? r : best; }, null);
  }

  function listHospitals(state, req, auth) {
    const actor = toPanelUser(auth.user);
    const items = state.hospitals.filter(function (h) { return Rules.canAccessHospital(actor, h.hospitalId); })
      .map(function (h) { return Object.assign({}, h, { latest: latestRecord(state, h.hospitalId) }); });
    return respond(HTTP.OK, { items: items });
  }

  function paginate(list, query) {
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(query.pageSize, 10) || cfg.PAGE_SIZE));
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    return { items: list.slice((page - 1) * pageSize, page * pageSize), page: page, pageSize: pageSize, total: list.length };
  }

  function inDateRange(ms, query) {
    const day = localDate(ms);
    return (!query.from || day >= query.from) && (!query.to || day <= query.to);
  }

  function sequenceOf(id) {
    return parseInt(String(id).replace(/^\D+/, ''), 10) || 0;
  }

  /** En yeni üstte; aynı andaysa sonra oluşturulan üstte (kararlı sıra). */
  function byNewest(field, idField) {
    return function (a, b) { return Date.parse(b[field]) - Date.parse(a[field]) || sequenceOf(b[idField]) - sequenceOf(a[idField]); };
  }

  function hospitalGuard(state, auth, hospitalId) {
    if (!state.hospitals.some(function (h) { return h.hospitalId === hospitalId; })) return fail(HTTP.NOT_FOUND, 'NOT_FOUND');
    if (!Rules.canAccessHospital(toPanelUser(auth.user), hospitalId)) return fail(HTTP.FORBIDDEN, 'FORBIDDEN');
    return null;
  }

  function listRecords(state, req, auth, hospitalId) {
    const denied = hospitalGuard(state, auth, hospitalId);
    if (denied) return denied;
    if (!Rules.validateDateRange(req.query.from, req.query.to).ok) return fail(HTTP.BAD_REQUEST, 'BAD_REQUEST');
    const list = state.records.filter(function (r) { return r.hospitalId === hospitalId && inDateRange(Date.parse(r.createdAt), req.query); }).sort(byNewest('createdAt', 'recordId'));
    return respond(HTTP.OK, paginate(list, req.query));
  }

  // Sunucu alan adı ↔ doğrulama alanı (aralıklarda en az/en çok ayrı alan).
  const SERVER_RECORD_FIELDS = {
    occupancyPercent: 'occupancyPercent',
    nonUrgentWaiting: 'greenWaiting',
    urgentWaiting: 'yellowWaiting',
    activePhysicians: 'activePhysicians',
    nonUrgentWaitMinutes: 'estimatedGreenWaitMinutes',
    urgentWaitMinutes: 'estimatedYellowWaitMinutes'
  };

  function serverValidateRecord(body) {
    const input = {};
    Object.keys(SERVER_RECORD_FIELDS).forEach(function (name) {
      const raw = body[SERVER_RECORD_FIELDS[name]];
      if (Rules.RANGE_FIELDS.indexOf(name) !== -1) {
        input[name + 'Min'] = Array.isArray(raw) && typeof raw[0] === 'number' ? String(raw[0]) : '';
        input[name + 'Max'] = Array.isArray(raw) && typeof raw[1] === 'number' ? String(raw[1]) : '';
      } else {
        input[name] = typeof raw === 'number' ? String(raw) : '';
      }
    });
    const result = Rules.validateRecord(input);
    const fields = {};
    Object.keys(result.errors).forEach(function (formField) {
      const base = formField.replace(/(Min|Max)$/, '');
      const key = result.errors[formField].key;
      fields[SERVER_RECORD_FIELDS[base]] = key === 'min' || key === 'max' ? 'outOfRange' : key;
    });
    return { ok: result.ok, values: result.values, fields: fields };
  }

  function recordChanges(previous, record) {
    return Object.keys(SERVER_RECORD_FIELDS).map(function (name) {
      const field = SERVER_RECORD_FIELDS[name];
      const before = previous ? previous[field] : null;
      return JSON.stringify(before) === JSON.stringify(record[field]) ? null : { field: name, from: before, to: record[field] };
    }).filter(Boolean);
  }

  function createRecord(state, req, auth, hospitalId) {
    const denied = hospitalGuard(state, auth, hospitalId);
    if (denied) return denied;
    if (!Rules.canCreateRecord(toPanelUser(auth.user), hospitalId)) return fail(HTTP.FORBIDDEN, 'FORBIDDEN');
    const checked = serverValidateRecord(req.body || {});
    if (!checked.ok) return fail(HTTP.UNPROCESSABLE, 'VALIDATION', checked.fields);
    const previous = latestRecord(state, hospitalId);
    state.seq += 1;
    const v = checked.values;
    const record = {
      recordId: 'r-' + state.seq, hospitalId: hospitalId, createdAt: iso(req.nowMs),
      createdBy: { userId: auth.user.userId, name: auth.user.name },
      occupancyPercent: v.occupancyPercent, crowdingLevel: crowdingFor(v.occupancyPercent),
      greenWaiting: v.nonUrgentWaiting, yellowWaiting: v.urgentWaiting, activePhysicians: v.activePhysicians,
      estimatedGreenWaitMinutes: v.nonUrgentWaitMinutes, estimatedYellowWaitMinutes: v.urgentWaitMinutes
    };
    state.records.push(record);
    addAudit(state, req.nowMs, auth.user, 'record.create', { type: 'hospital', id: hospitalId, label: hospitalName(state, hospitalId) }, recordChanges(previous, record), hospitalId);
    return respond(HTTP.CREATED, { record: record });
  }

  /* ---- Denetim kaydı ve kullanıcılar ------------------------------------------ */

  function scopeFilter(auth, allCapability) {
    const actor = toPanelUser(auth.user);
    return function (item) { return Rules.can(actor, allCapability) || item.hospitalId === actor.hospitalId; };
  }

  function listAudit(state, req, auth) {
    if (!Rules.can(toPanelUser(auth.user), 'audit.view')) return fail(HTTP.FORBIDDEN, 'FORBIDDEN');
    if (!Rules.validateDateRange(req.query.from, req.query.to).ok) return fail(HTTP.BAD_REQUEST, 'BAD_REQUEST');
    const list = state.audit.filter(scopeFilter(auth, 'hospitals.all'))
      .filter(function (a) { return inDateRange(Date.parse(a.at), req.query); }).sort(byNewest('at', 'auditId'));
    const page = paginate(list, req.query);
    page.items = page.items.map(function (a) { const copy = clone(a); delete copy.hospitalId; return copy; });
    return respond(HTTP.OK, page);
  }

  function listUsers(state, req, auth) {
    if (!Rules.can(toPanelUser(auth.user), 'users.manage')) return fail(HTTP.FORBIDDEN, 'FORBIDDEN');
    const list = state.users.filter(scopeFilter(auth, 'users.all')).map(publicUser);
    return respond(HTTP.OK, paginate(list, req.query));
  }

  function createUser(state, req, auth) {
    const actor = toPanelUser(auth.user);
    if (!Rules.can(actor, 'users.manage')) return fail(HTTP.FORBIDDEN, 'FORBIDDEN');
    const checked = Rules.validateUser(req.body || {}, actor);
    const fields = {};
    Object.keys(checked.errors).forEach(function (f) { fields[f] = checked.errors[f].key === 'tooLong' ? 'outOfRange' : checked.errors[f].key; });
    if (!fields.email && state.users.some(function (u) { return u.email === checked.values.email; })) fields.email = 'emailTaken';
    if (Object.keys(fields).length > 0) return fail(HTTP.UNPROCESSABLE, 'VALIDATION', fields);
    state.seq += 1;
    const user = Object.assign({ userId: 'u-' + state.seq, active: true, lastLoginAt: null }, checked.values);
    state.users.push(user);
    addAudit(state, req.nowMs, auth.user, 'user.create', { type: 'user', id: user.userId, label: user.name }, [{ field: 'role', from: null, to: user.role }], user.hospitalId);
    return respond(HTTP.CREATED, { user: publicUser(user) });
  }

  function updateUser(state, req, auth, userId) {
    const actor = toPanelUser(auth.user);
    const target = state.users.find(function (u) { return u.userId === userId; });
    if (!target) return fail(HTTP.NOT_FOUND, 'NOT_FOUND');
    if (!Rules.canEditUser(actor, toPanelUser(target))) return fail(HTTP.FORBIDDEN, 'FORBIDDEN');
    const body = req.body || {};
    if (body.role !== undefined && Rules.assignableRoles(actor).indexOf(body.role) === -1) return fail(HTTP.UNPROCESSABLE, 'VALIDATION', { role: 'roleNotAllowed' });
    if (body.active !== undefined && typeof body.active !== 'boolean') return fail(HTTP.UNPROCESSABLE, 'VALIDATION', { active: 'generic' });
    const changes = [];
    ['role', 'active'].forEach(function (field) {
      if (body[field] !== undefined && body[field] !== target[field]) {
        changes.push({ field: field, from: target[field], to: body[field] });
        target[field] = body[field];
      }
    });
    if (target.active === false) Object.keys(state.sessions).forEach(function (token) { if (state.sessions[token].userId === target.userId) delete state.sessions[token]; });
    addAudit(state, req.nowMs, auth.user, 'user.update', { type: 'user', id: target.userId, label: target.name }, changes, target.hospitalId);
    return respond(HTTP.OK, { user: publicUser(target) });
  }

  /* ---- Yönlendirme ------------------------------------------------------------- */

  const STATE_CHANGING = ['POST', 'PATCH', 'PUT', 'DELETE'];

  /** İstek → yanıt. req: { method, path, query, body, headers (küçük harf), sessionToken, nowMs } */
  function handle(state, req) {
    if (STATE_CHANGING.indexOf(req.method) !== -1 && (req.headers || {})[cfg.CLIENT_HEADER.name.toLowerCase()] !== cfg.CLIENT_HEADER.value) {
      return fail(HTTP.FORBIDDEN, 'FORBIDDEN');
    }
    if (req.method === 'POST' && req.path === cfg.PATHS.login) return login(state, req);
    const auth = currentSession(state, req.sessionToken, req.nowMs);
    if (req.method === 'POST' && req.path === cfg.PATHS.logout) return logout(state, req, auth);
    if (!auth) return fail(HTTP.UNAUTHORIZED, 'UNAUTHORIZED', null);
    return route(state, req, auth);
  }

  function route(state, req, auth) {
    const records = req.path.match(/^\/api\/v1\/panel\/hospitals\/([^/]+)\/records$/);
    const user = req.path.match(/^\/api\/v1\/panel\/users\/([^/]+)$/);
    const key = req.method + ' ' + (records ? 'records' : user ? 'user' : req.path);
    switch (key) {
      case 'GET ' + cfg.PATHS.me: return me(state, req, auth);
      case 'GET ' + cfg.PATHS.hospitals: return listHospitals(state, req, auth);
      case 'GET records': return listRecords(state, req, auth, decodeURIComponent(records[1]));
      case 'POST records': return withIdempotency(state, req, function () { return createRecord(state, req, auth, decodeURIComponent(records[1])); });
      case 'GET ' + cfg.PATHS.audit: return listAudit(state, req, auth);
      case 'GET ' + cfg.PATHS.users: return listUsers(state, req, auth);
      case 'POST ' + cfg.PATHS.users: return withIdempotency(state, req, function () { return createUser(state, req, auth); });
      case 'PATCH user': return withIdempotency(state, req, function () { return updateUser(state, req, auth, decodeURIComponent(user[1])); });
      default: return fail(HTTP.NOT_FOUND, 'NOT_FOUND');
    }
  }

  /** Aynı Idempotency-Key ile gelen tekrar, ilk yanıtın AYNISINI alır (çift kayıt olmaz). */
  function withIdempotency(state, req, run) {
    const key = (req.headers || {})['idempotency-key'];
    if (!key) return run();
    if (state.idempotency[key]) return clone(state.idempotency[key]);
    const result = run();
    if (result.status < HTTP.BAD_REQUEST) state.idempotency[key] = clone(result);
    return result;
  }

  /**
   * Yeni bir sahte arka uç.
   * @param {number} nowMs  başlangıç verisinin üretileceği an
   * @returns {{handle:function(Object):Object, restoreSession:function(string, Object)}}
   */
  function createBackend(nowMs) {
    const state = {
      seq: 0,
      users: clone(SEED_USERS),
      hospitals: AR.Mock.SAMPLES.map(function (s) { return { hospitalId: s.id, name: s.name, district: s.district, ownership: 'public' }; }),
      records: [],
      audit: [],
      sessions: {},
      attempts: {},
      idempotency: {}
    };
    seedRecords(state, nowMs);
    seedAudit(state);
    return {
      handle: function (req) { return handle(state, req); },
      // Tarayıcıdaki örnek ortamda sayfa yenilenince oturum geri yüklenir (gerçekte çerez yapar).
      restoreSession: function (token, saved) {
        if (token && saved && saved.userId) state.sessions[token] = { userId: saved.userId, expiresAtMs: saved.expiresAtMs };
      }
    };
  }

  AR.Panel.Mock = Object.freeze({
    createBackend: createBackend,
    PASSWORD: PASSWORD,
    ACCOUNTS: SEED_USERS.filter(function (u) { return u.active; }).map(function (u) { return { email: u.email, role: u.role }; })
  });
})(window.AcilRadar = window.AcilRadar || {});

/* =============================================================================
 * panel/js/api.js
 * NE İŞE YARAR : Panelde sunucuyla konuşan TEK dosya. Tüm istekler request()
 *                çekirdeğinden geçer: yöntem (GET/POST/PATCH), oturum çerezi,
 *                CSRF başlığı, Idempotency-Key, zaman aşımı, güvenli yeniden deneme,
 *                429/Retry-After ve 401'de oturumu güvenle kapatma kancası.
 * VERDİĞİ      : AcilRadar.Panel.Api → login, logout, me, hospitals, records,
 *                createRecord, audit, users, createUser, updateUser,
 *                newIdempotencyKey, setUnauthorizedHandler, setRequestHook, PanelApiError
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Ortam/adres: panel/js/config.js › ENVIRONMENT (burası değil)
 *   - Uç yolları: panel/js/config.js › PATHS
 * NOT: Yanıt biçimi panel/js/schema.js'te yorumlanır; bu dosya biçim bilmez.
 * NOT: Yazma istekleri YALNIZ Idempotency-Key taşıyorsa yeniden denenir
 *      (aynı anahtarla tekrar, sunucuda çift kayıt oluşturmaz).
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.Panel.Config;
  const Schema = AR.Panel.Schema;
  const MS_PER_SECOND = 1000;
  const HTTP_NO_CONTENT = 204;
  const RETRYABLE = ['NETWORK', 'TIMEOUT', 'INTERNAL', 'UNAVAILABLE'];
  const STATE_CHANGING = ['POST', 'PATCH', 'PUT', 'DELETE'];
  // Konsola yalnız altyapı sorunları yazılır; yanlış parola, doğrulama hatası gibi
  // olağan kullanıcı durumları uyarı üretmez.
  const LOGGED_CODES = ['NETWORK', 'TIMEOUT', 'INTERNAL', 'UNAVAILABLE', 'INVALID_RESPONSE', 'BAD_REQUEST', 'UNKNOWN'];

  class PanelApiError extends Error {
    constructor(code, info) {
      super(code);
      this.name = 'PanelApiError';
      this.code = code;
      this.status = (info && info.status) || 0;
      this.fields = (info && info.fields) || {};
      this.retryAfterMs = (info && info.retryAfterMs) || 0;
    }
  }

  let unauthorizedHandler = null;
  let requestHook = null;

  /** 401 gelince (oturum bitti) çağrılır: app.js güvenli çıkışı yapar. */
  function setUnauthorizedHandler(fn) {
    unauthorizedHandler = fn;
  }

  /** İleride (ör. Authorization başlığı) tek noktadan değişiklik için kanca: fn(init, url) → init */
  function setRequestHook(fn) {
    requestHook = typeof fn === 'function' ? fn : null;
  }

  /** Her form gönderimi için benzersiz anahtar (aynı gönderimin tekrarı aynı anahtarı kullanır). */
  function newIdempotencyKey() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  function fillPath(template, id) {
    return template.replace('{id}', encodeURIComponent(id));
  }

  function parseRetryAfter(value) {
    if (!value) return 0;
    const seconds = /^\d+$/.test(String(value).trim()) ? Number(value) : (Date.parse(value) - Date.now()) / MS_PER_SECOND;
    if (!Number.isFinite(seconds) || seconds <= 0) return 0;
    return Math.min(seconds, cfg.REQUEST.MAX_RETRY_AFTER_SECONDS) * MS_PER_SECOND;
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /* ---- 1. Yanıt işleme (gerçek ve örnek sunucu için ortak) ------------------ */

  /** @param {{status:number, body:*, headers:{get:function(string):?string}}} res */
  function handleResult(res, options) {
    if (res.status === HTTP_NO_CONTENT) return null;
    if (res.status >= 200 && res.status < 300) {
      if (res.body === undefined) throw new PanelApiError('INVALID_RESPONSE', { status: res.status });
      return res.body;
    }
    const normalized = Schema.normalizeError(res.status, res.body);
    const error = new PanelApiError(normalized.code, { status: res.status, fields: normalized.fields, retryAfterMs: parseRetryAfter(res.headers.get('Retry-After')) });
    if (error.code === 'UNAUTHORIZED' && !options.allowUnauthorized && unauthorizedHandler) unauthorizedHandler();
    return Promise.reject(error);
  }

  /* ---- 2. Gerçek ağ --------------------------------------------------------------- */

  function buildUrl(path, params) {
    const base = AR.Config.ENVIRONMENTS[cfg.ENVIRONMENT].apiBaseUrl || '';
    const url = new URL(base + path, window.location.href);
    Object.keys(params || {}).forEach(function (name) {
      if (params[name] !== null && params[name] !== undefined && params[name] !== '') url.searchParams.set(name, params[name]);
    });
    return url.toString();
  }

  function buildInit(method, options, signal) {
    const headers = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (STATE_CHANGING.indexOf(method) !== -1) headers[cfg.CLIENT_HEADER.name] = cfg.CLIENT_HEADER.value;
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    return {
      method: method,
      headers: headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: cfg.CREDENTIALS,
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: signal
    };
  }

  async function readBody(response) {
    const type = response.headers.get('Content-Type') || '';
    const raw = await response.text();
    if (!raw) return null;
    if (type.indexOf('json') === -1) return undefined;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return undefined;
    }
  }

  async function networkAttempt(method, path, options) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(function () { timedOut = true; controller.abort(); }, cfg.REQUEST.TIMEOUT_MS);
    const url = buildUrl(path, options.params);
    let response;
    try {
      const init = buildInit(method, options, controller.signal);
      response = await fetch(url, requestHook ? requestHook(init, url) : init);
    } catch (error) {
      throw new PanelApiError(timedOut ? 'TIMEOUT' : 'NETWORK');
    } finally {
      clearTimeout(timer);
    }
    return { status: response.status, body: await readBody(response), headers: response.headers };
  }

  /* ---- 3. Tarayıcı içi örnek sunucu ---------------------------------------------- */

  let mockBackend = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = src;
      script.addEventListener('load', resolve);
      script.addEventListener('error', function () { reject(new PanelApiError('NETWORK')); });
      document.head.appendChild(script);
    });
  }

  function readMockSession() {
    try {
      return JSON.parse(window.sessionStorage.getItem(cfg.MOCK.SESSION_STORAGE_KEY) || 'null');
    } catch (error) {
      return null;
    }
  }

  function writeMockSession(value) {
    try {
      if (value) window.sessionStorage.setItem(cfg.MOCK.SESSION_STORAGE_KEY, JSON.stringify(value));
      else window.sessionStorage.removeItem(cfg.MOCK.SESSION_STORAGE_KEY);
    } catch (error) {
      // Depolama yoksa örnek oturum yalnız bu sayfa açıkken sürer.
    }
  }

  async function ensureMock() {
    if (mockBackend) return mockBackend;
    for (const src of cfg.MOCK.SCRIPTS) {
      if (src.indexOf('mock-data') !== -1 && AR.Mock) continue;
      if (src.indexOf('mock.js') !== -1 && AR.Panel.Mock) continue;
      await loadScript(src);
    }
    mockBackend = AR.Panel.Mock.createBackend(Date.now());
    const saved = readMockSession();
    if (saved) mockBackend.restoreSession(saved.token, saved);
    return mockBackend;
  }

  async function mockAttempt(method, path, options) {
    const backend = await ensureMock();
    await wait(cfg.MOCK.DELAY_MS);
    const saved = readMockSession();
    const init = buildInit(method, options, null);
    const lowerHeaders = {};
    Object.keys(init.headers).forEach(function (k) { lowerHeaders[k.toLowerCase()] = init.headers[k]; });
    const res = backend.handle({
      method: method, path: path, query: options.params || {}, nowMs: Date.now(),
      body: options.body === undefined ? null : JSON.parse(JSON.stringify(options.body)),
      headers: lowerHeaders, sessionToken: saved ? saved.token : null
    });
    if (res.session && res.session.set) writeMockSession({ token: res.session.set, userId: res.session.userId, expiresAtMs: res.session.expiresAtMs });
    if (res.session && res.session.clear) writeMockSession(null);
    const headers = res.headers || {};
    return { status: res.status, body: res.body, headers: { get: function (name) { return headers[name] || null; } } };
  }

  /* ---- 4. İstek çekirdeği ------------------------------------------------------------ */

  /**
   * @param {string} method
   * @param {string} path
   * @param {{params?:Object, body?:Object, idempotencyKey?:string, allowUnauthorized?:boolean}} [options]
   */
  async function request(method, path, options) {
    const opts = options || {};
    const canRetry = method === 'GET' || Boolean(opts.idempotencyKey);
    const r = cfg.REQUEST;
    for (let tryIndex = 0; ; tryIndex += 1) {
      if (navigator.onLine === false) throw new PanelApiError('OFFLINE');
      try {
        const res = cfg.ENVIRONMENT === 'mock' ? await mockAttempt(method, path, opts) : await networkAttempt(method, path, opts);
        return await handleResult(res, opts);
      } catch (error) {
        const failure = error instanceof PanelApiError ? error : new PanelApiError('UNKNOWN');
        if (!canRetry || RETRYABLE.indexOf(failure.code) === -1 || tryIndex >= r.MAX_RETRIES) {
          if (LOGGED_CODES.indexOf(failure.code) !== -1) logFailure(method, path, failure);
          throw failure;
        }
        await wait(Math.min(r.RETRY_BASE_DELAY_MS * Math.pow(2, tryIndex), r.RETRY_MAX_DELAY_MS));
      }
    }
  }

  function logFailure(method, path, error) {
    console.warn(AR.Strings.text('dev.prefix') + ' ' + AR.Strings.text('panel.dev.requestFailed', { method: method, path: path, code: error.code, status: error.status || '-' }));
  }

  /** Biçim hatasını (PanelSchemaError) arayüz hatasına çevirir. */
  async function parse(promise, normalizer) {
    const body = await promise;
    try {
      return normalizer(body);
    } catch (error) {
      throw new PanelApiError('INVALID_RESPONSE');
    }
  }

  /* ---- 5. Uç noktalar --------------------------------------------------------------- */

  const P = cfg.PATHS;

  AR.Panel.Api = Object.freeze({
    login: function (email, password) {
      return parse(request('POST', P.login, { body: { email: email, password: password }, allowUnauthorized: true }), Schema.normalizeSession);
    },
    logout: function () {
      return request('POST', P.logout, { allowUnauthorized: true });
    },
    me: function () {
      return parse(request('GET', P.me, { allowUnauthorized: true }), Schema.normalizeSession);
    },
    hospitals: function () {
      return parse(request('GET', P.hospitals), Schema.normalizeHospitals);
    },
    records: function (hospitalId, query) {
      return parse(request('GET', fillPath(P.records, hospitalId), { params: query }), function (b) { return Schema.normalizePage(b, Schema.normalizeRecord, 'record'); });
    },
    createRecord: function (hospitalId, values, idempotencyKey) {
      return parse(request('POST', fillPath(P.records, hospitalId), { body: Schema.toServerRecord(values), idempotencyKey: idempotencyKey }), function (b) {
        const record = Schema.normalizeRecord(b && b.record);
        if (!record) throw new Schema.PanelSchemaError('record');
        return record;
      });
    },
    audit: function (query) {
      return parse(request('GET', P.audit, { params: query }), function (b) { return Schema.normalizePage(b, Schema.normalizeAudit, 'audit'); });
    },
    users: function (query) {
      return parse(request('GET', P.users, { params: query }), function (b) { return Schema.normalizePage(b, Schema.normalizeUser, 'user'); });
    },
    createUser: function (values, idempotencyKey) {
      return parse(request('POST', P.users, { body: Schema.toServerUser(values), idempotencyKey: idempotencyKey }), function (b) {
        const user = Schema.normalizeUser(b && b.user);
        if (!user) throw new Schema.PanelSchemaError('user');
        return user;
      });
    },
    updateUser: function (userId, patch, idempotencyKey) {
      return parse(request('PATCH', fillPath(P.user, userId), { body: patch, idempotencyKey: idempotencyKey }), function (b) {
        const user = Schema.normalizeUser(b && b.user);
        if (!user) throw new Schema.PanelSchemaError('user');
        return user;
      });
    },
    newIdempotencyKey: newIdempotencyKey,
    setUnauthorizedHandler: setUnauthorizedHandler,
    setRequestHook: setRequestHook,
    PanelApiError: PanelApiError
  });
})(window.AcilRadar = window.AcilRadar || {});

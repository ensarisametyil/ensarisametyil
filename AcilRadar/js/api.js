/* =============================================================================
 * js/api.js
 * NE İŞE YARAR : Sunucuyla konuşan TEK dosya. Tüm istekler request() çekirdeğinden
 *                geçer: zaman aşımı, üstel beklemeli yeniden deneme, 429/Retry-After,
 *                ETag/If-None-Match, "en son istek kazanır" iptali, istek kancası.
 *                Yanıtı yorumlamaz; biçim işi js/schema.js'tedir.
 * VERDİĞİ      : AcilRadar.Api → getHospitals({ at, region }), setRequestHook(fn),
 *                buildUrl(path, params), ApiError
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Arka uç adresi / ortam: js/config.js (ENVIRONMENT, ENVIRONMENTS) — burası değil.
 *   - Kimlik doğrulama (ileride): setRequestHook(function (init) { … return init; })
 *     ile Authorization başlığı ya da credentials: 'include' eklenir. Tek nokta budur.
 * NOT (GİZLİLİK): İsteğe konum, kimlik ya da çerez EKLENMEZ.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.Config;
  const Schema = AR.Schema;
  const HTTP_NOT_MODIFIED = 304;
  const MS_PER_SECOND = 1000;
  const RETRYABLE_CODES = ['NETWORK', 'TIMEOUT', 'INTERNAL', 'UNAVAILABLE'];

  /**
   * Arayüzün anladığı hata. code → strings.js › errors.codes
   * (ABORTED: daha yeni bir istek başladı; arayüz bunu yok sayar.)
   */
  class ApiError extends Error {
    constructor(code, info) {
      super(code);
      this.name = 'ApiError';
      this.code = code;
      this.status = (info && info.status) || 0;
      this.retryAfterMs = (info && info.retryAfterMs) || 0;
    }
  }

  let requestHook = null;
  let activeController = null;
  const etagCache = new Map();

  /** İleride kimlik doğrulama için tek kanca: fn(init, url) → init */
  function setRequestHook(fn) {
    requestHook = typeof fn === 'function' ? fn : null;
  }

  function buildUrl(path, params) {
    const base = cfg.ENVIRONMENTS[cfg.ENVIRONMENT].apiBaseUrl || '';
    const url = new URL(base + path, window.location.href);
    Object.keys(params || {}).forEach(function (name) {
      if (params[name] != null) url.searchParams.set(name, params[name]);
    });
    return url.toString();
  }

  /** Retry-After: saniye ya da HTTP tarihi → ms (üst sınırlı). */
  function parseRetryAfter(value) {
    if (!value) return 0;
    const seconds = /^\d+$/.test(value.trim()) ? Number(value) : (Date.parse(value) - Date.now()) / MS_PER_SECOND;
    if (!Number.isFinite(seconds) || seconds <= 0) return 0;
    return Math.min(seconds, cfg.REQUEST.MAX_RETRY_AFTER_SECONDS) * MS_PER_SECOND;
  }

  function wait(ms, signal) {
    return new Promise(function (resolve, reject) {
      const timer = setTimeout(resolve, ms);
      if (signal) signal.addEventListener('abort', function () {
        clearTimeout(timer);
        reject(new ApiError('ABORTED'));
      }, { once: true });
    });
  }

  /* ---- 1. Tek istek ------------------------------------------------------- */

  function buildInit(url, signal) {
    const headers = { Accept: 'application/json' };
    const cached = etagCache.get(url);
    if (cached) headers['If-None-Match'] = cached.etag;
    const init = { method: 'GET', headers: headers, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: signal };
    return requestHook ? requestHook(init, url) : init;
  }

  async function readJson(response) {
    const type = response.headers.get('Content-Type') || '';
    const body = await response.text();
    if (type.indexOf('json') === -1) return { ok: false };
    try {
      return { ok: true, value: JSON.parse(body) };
    } catch (error) {
      return { ok: false };
    }
  }

  async function handleResponse(response, url) {
    if (response.status === HTTP_NOT_MODIFIED && etagCache.has(url)) return etagCache.get(url).body;
    const parsed = await readJson(response);
    if (!response.ok) {
      const code = Schema.normalizeErrorBody(response.status, parsed.ok ? parsed.value : null);
      throw new ApiError(code, { status: response.status, retryAfterMs: parseRetryAfter(response.headers.get('Retry-After')) });
    }
    if (!parsed.ok) throw new ApiError('INVALID_RESPONSE', { status: response.status });
    const etag = response.headers.get('ETag');
    if (etag) etagCache.set(url, { etag: etag, body: parsed.value });
    return parsed.value;
  }

  /** Tek deneme: zaman aşımı, dış iptal sinyali ve ağ hatası ayrımı. */
  async function attempt(url, outerSignal) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(function () { timedOut = true; controller.abort(); }, cfg.REQUEST.TIMEOUT_MS);
    const onOuterAbort = function () { controller.abort(); };
    outerSignal.addEventListener('abort', onOuterAbort, { once: true });
    try {
      const response = await fetch(url, buildInit(url, controller.signal));
      return await handleResponse(response, url);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (outerSignal.aborted) throw new ApiError('ABORTED');
      throw new ApiError(timedOut ? 'TIMEOUT' : 'NETWORK');
    } finally {
      clearTimeout(timer);
      outerSignal.removeEventListener('abort', onOuterAbort);
    }
  }

  /* ---- 2. İstek çekirdeği: yeniden deneme -------------------------------- */

  /**
   * Tüm istekler buradan geçer.
   * @param {string} path    ör. '/api/v1/hospitals'
   * @param {{params?:Object, signal:AbortSignal}} options
   * @returns {Promise<*>} çözümlenmiş JSON
   */
  async function request(path, options) {
    const url = buildUrl(path, options.params);
    const r = cfg.REQUEST;
    for (let tryIndex = 0; ; tryIndex += 1) {
      if (navigator.onLine === false) throw new ApiError('OFFLINE');
      try {
        return await attempt(url, options.signal);
      } catch (error) {
        const retryable = RETRYABLE_CODES.indexOf(error.code) !== -1;
        if (!retryable || tryIndex >= r.MAX_RETRIES) throw error;
        await wait(Math.min(r.RETRY_BASE_DELAY_MS * Math.pow(2, tryIndex), r.RETRY_MAX_DELAY_MS), options.signal);
      }
    }
  }

  /* ---- 3. Uç noktalar ----------------------------------------------------- */

  /** Örnek veri dosyası yalnız 'mock' ortamında ve ilk istekte yüklenir (canlıda hiç inmez). */
  function ensureMock() {
    if (AR.Mock) return Promise.resolve(AR.Mock);
    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = cfg.MOCK.SCRIPT;
      script.addEventListener('load', function () { if (AR.Mock) resolve(AR.Mock); else reject(new ApiError('UNKNOWN')); });
      script.addEventListener('error', function () { reject(new ApiError('NETWORK')); });
      document.head.appendChild(script);
    });
  }

  /** 'mock' ortamında sunucu yerine js/mock-data.js yanıt verir (aynı biçim, aynı doğrulama). */
  async function mockRequest(query, signal) {
    const mock = await ensureMock();
    const res = await mock.respond(query, signal);
    if (signal.aborted) throw new ApiError('ABORTED');
    if (res.status >= 400) {
      const retryAfter = res.headers && res.headers['Retry-After'];
      throw new ApiError(Schema.normalizeErrorBody(res.status, res.body), { status: res.status, retryAfterMs: parseRetryAfter(retryAfter) });
    }
    return res.body;
  }

  function toApiError(error) {
    if (error instanceof ApiError) return error;
    if (error instanceof Schema.SchemaError) return new ApiError(error.code);
    return new ApiError('UNKNOWN');
  }

  /**
   * Hastaneleri getirir. Yeni çağrı, sürmekte olan eskisini iptal eder.
   * @param {{at:string, region:?string}} query
   * @returns {Promise<ApiResponse>}
   */
  async function getHospitals(query) {
    if (activeController) activeController.abort();
    const controller = new AbortController();
    activeController = controller;
    try {
      const raw = cfg.ENVIRONMENT === 'mock'
        ? await mockRequest(query, controller.signal)
        : await request(cfg.API_PATHS.hospitals, { params: { at: query.at, region: query.region }, signal: controller.signal });
      return Schema.normalizeResponse(raw, Date.now());
    } catch (error) {
      throw toApiError(error);
    } finally {
      if (activeController === controller) activeController = null;
    }
  }

  AR.Api = Object.freeze({
    getHospitals: getHospitals,
    setRequestHook: setRequestHook,
    buildUrl: buildUrl,
    ApiError: ApiError
  });
})(window.AcilRadar = window.AcilRadar || {});

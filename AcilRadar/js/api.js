/* =============================================================================
 * DOSYA ADI    : js/api.js
 * NE İŞE YARAR : Sunucuyla konuşan TEK dosya. İsteği atar, zaman aşımı ve bir
 *                kez yeniden deneme uygular, yanıtı doğrular ve uygulamanın geri
 *                kalanının kullandığı temiz biçime (ApiResponse) çevirir.
 *                Başka hiçbir dosya sunucunun JSON biçimini bilmez.
 * NEYİ ALIR    : AcilRadar.config (API_URL, USE_MOCK, süreler), AcilRadar.mock,
 *                AcilRadar.text (hata metinleri).
 * NEYİ VERİR   : AcilRadar.api → fetchHospitals(timeSlot), parseResponse(raw), ApiError
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Sunucu yeni bir alan gönderiyor ve arayüzde göstermek istiyorsunuz:
 *       1) aşağıdaki normalizeHospital() içine alanı ekleyin (varsayılanıyla),
 *       2) js/ui/cards.js içinde ilgili yere yazdırın (metni js/strings.js'e ekleyin).
 *   - Zorunlu alan listesini değiştirmek: REQUIRED_CHECKS.
 *   - Adres / zaman aşımı / yeniden deneme: js/config.js.
 * NOT: Bu dosya isteğe konum, kimlik ya da çerez EKLEMEZ (credentials: 'omit').
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.config;
  const text = AR.text;
  const HTTP_SERVER_ERROR_MIN = 500;

  /**
   * Sunucudan gelen tek bir hastane (doğrulanmış ve varsayılanları doldurulmuş).
   * @typedef {Object} Hospital
   * @property {string}   hospitalId
   * @property {string}   name
   * @property {string}   district
   * @property {number}   lat
   * @property {number}   lng
   * @property {boolean}  childER                     Çocuk acili var mı
   * @property {number}   occupancyPercent            0–100
   * @property {'low'|'medium'|'high'} crowdingLevel
   * @property {?number}  greenWaiting                Yeşil alanda bekleyen hasta (yoksa null)
   * @property {?number}  yellowWaiting
   * @property {?number}  activePhysicians
   * @property {number[]} estimatedGreenWaitMinutes   [alt, üst]
   * @property {?number[]} estimatedYellowWaitMinutes [alt, üst] ya da null
   * @property {string}   updatedAt                   ISO 8601
   * @property {boolean}  isForecast                  İleri saat öngörüsü mü
   * @property {'simulated'|'hospital'|'official'|'unknown'} dataSource
   */

  /**
   * api.js'in uygulamaya verdiği yanıt.
   * @typedef {Object} ApiResponse
   * @property {?string}    generatedAt   Sunucunun verdiği üretim zamanı (ISO) ya da null
   * @property {string}     dataSource    Genel kaynak (meta'dan ya da kayıtlardan)
   * @property {boolean}    isSimulated   Kayıtlardan biri bile simülasyonsa true
   * @property {Hospital[]} hospitals
   * @property {number}     receivedAt    Tarayıcının yanıtı aldığı an (ms)
   */

  /** Kullanıcıya gösterilebilir Türkçe iletili hata. */
  class ApiError extends Error {
    /**
     * @param {string} message      Kullanıcıya gösterilecek Türkçe ileti
     * @param {{retryable?: boolean, detail?: string, status?: number}} [info]
     */
    constructor(message, info) {
      super(message);
      this.name = 'ApiError';
      this.retryable = Boolean(info && info.retryable);
      this.detail = (info && info.detail) || '';
      this.status = (info && info.status) || 0;
    }
  }

  /* ---- 1. İstek ---------------------------------------------------------- */

  function buildUrl(timeSlot) {
    const url = new URL(cfg.API_URL, window.location.href);
    url.searchParams.set('at', timeSlot);
    return url.toString();
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function readErrorDetail(response) {
    try {
      const body = await response.json();
      return body && typeof body.error === 'string' ? body.error : '';
    } catch (error) {
      return '';
    }
  }

  /** Tek bir istek: zaman aşımı + HTTP durum + JSON çözümleme. */
  async function fetchOnce(url) {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, cfg.REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'omit',          // çerez/kimlik GÖNDERME
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        signal: controller.signal
      });
    } catch (error) {
      const timedOut = error && error.name === 'AbortError';
      throw new ApiError(text(timedOut ? 'error.timeout' : 'error.network'), { retryable: true });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new ApiError(text('error.server', { status: response.status }), {
        retryable: response.status >= HTTP_SERVER_ERROR_MIN,
        status: response.status,
        detail: detail
      });
    }
    try {
      return await response.json();
    } catch (error) {
      throw new ApiError(text('error.invalidJson'));
    }
  }

  /** Ağ hatası, zaman aşımı ya da 5xx durumunda REQUEST_RETRY_COUNT kez yeniden dener. */
  async function fetchWithRetry(url) {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await fetchOnce(url);
      } catch (error) {
        if (!error.retryable || attempt >= cfg.REQUEST_RETRY_COUNT) throw error;
        await wait(cfg.REQUEST_RETRY_DELAY_MS);
      }
    }
  }

  /* ---- 2. Doğrulama ve dönüştürme ---------------------------------------- */

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  function isMinuteRange(value) {
    return Array.isArray(value) && value.length === 2 &&
      isFiniteNumber(value[0]) && isFiniteNumber(value[1]) && value[0] >= 0 && value[0] <= value[1];
  }

  function isValidDate(value) {
    return typeof value === 'string' && !Number.isNaN(Date.parse(value));
  }

  // Zorunlu alanlar ve denetimleri. Biri tutmazsa kayıt atlanır ve konsola yazılır.
  const REQUIRED_CHECKS = {
    hospitalId: function (v) { return isNonEmptyString(v) || isFiniteNumber(v); },
    name: isNonEmptyString,
    district: isNonEmptyString,
    lat: function (v) { return isFiniteNumber(v) && Math.abs(v) <= 90; },
    lng: function (v) { return isFiniteNumber(v) && Math.abs(v) <= 180; },
    occupancyPercent: function (v) { return isFiniteNumber(v) && v >= 0 && v <= 100; },
    crowdingLevel: function (v) { return cfg.CROWDING_LEVELS.indexOf(v) !== -1; },
    estimatedGreenWaitMinutes: isMinuteRange,
    updatedAt: isValidDate
  };

  function findInvalidFields(item) {
    return Object.keys(REQUIRED_CHECKS).filter(function (field) {
      return !REQUIRED_CHECKS[field](item[field]);
    });
  }

  function optionalCount(value) {
    return isFiniteNumber(value) && value >= 0 ? Math.round(value) : null;
  }

  function normalizeSource(value, fallback) {
    return cfg.DATA_SOURCES.indexOf(value) !== -1 ? value : fallback;
  }

  /**
   * Ham kaydı Hospital biçimine çevirir; geçersizse null döndürür.
   * Bilinmeyen (gelecekte eklenecek) alanlar bilerek yok sayılır.
   * @returns {?Hospital}
   */
  function normalizeHospital(item, index, defaultSource) {
    const record = item && typeof item === 'object' ? item : {};
    const invalid = findInvalidFields(record);
    if (invalid.length > 0) {
      console.warn(text('dev.skippedHospital', {
        index: index + 1,
        id: record.hospitalId != null ? String(record.hospitalId) : '?',
        fields: invalid.join(', ')
      }));
      return null;
    }
    return {
      hospitalId: String(record.hospitalId),
      name: record.name.trim(),
      district: record.district.trim(),
      lat: record.lat,
      lng: record.lng,
      childER: record.childER === true,
      occupancyPercent: Math.round(record.occupancyPercent),
      crowdingLevel: record.crowdingLevel,
      greenWaiting: optionalCount(record.greenWaiting),
      yellowWaiting: optionalCount(record.yellowWaiting),
      activePhysicians: optionalCount(record.activePhysicians),
      estimatedGreenWaitMinutes: [record.estimatedGreenWaitMinutes[0], record.estimatedGreenWaitMinutes[1]],
      estimatedYellowWaitMinutes: isMinuteRange(record.estimatedYellowWaitMinutes)
        ? [record.estimatedYellowWaitMinutes[0], record.estimatedYellowWaitMinutes[1]] : null,
      updatedAt: record.updatedAt,
      isForecast: record.isForecast === true,
      dataSource: normalizeSource(record.dataSource, defaultSource)
    };
  }

  function readMeta(raw) {
    if (raw.meta == null) return {};
    if (typeof raw.meta !== 'object') {
      console.warn(text('dev.badMeta'));
      return {};
    }
    return raw.meta;
  }

  /**
   * Sunucu yanıtını doğrular ve ApiResponse'a çevirir.
   * Yeni biçim { meta, hospitals } ve eski biçim { hospitals } desteklenir.
   * @param {*} raw  JSON.parse sonucu
   * @returns {ApiResponse}
   */
  function parseResponse(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.hospitals)) {
      console.error(text('dev.missingHospitals'), raw);
      throw new ApiError(text('error.invalidShape'));
    }
    const meta = readMeta(raw);
    const metaSource = normalizeSource(meta.dataSource, 'unknown');
    const hospitals = raw.hospitals
      .map(function (item, index) { return normalizeHospital(item, index, metaSource); })
      .filter(Boolean);
    if (raw.hospitals.length > 0 && hospitals.length === 0) {
      throw new ApiError(text('error.noValidHospital'));
    }
    const isSimulated = metaSource === 'simulated' ||
      hospitals.some(function (hospital) { return hospital.dataSource === 'simulated'; });
    return {
      generatedAt: isValidDate(meta.generatedAt) ? meta.generatedAt : null,
      dataSource: metaSource !== 'unknown' ? metaSource : (hospitals[0] ? hospitals[0].dataSource : 'unknown'),
      isSimulated: isSimulated,
      hospitals: hospitals,
      receivedAt: Date.now()
    };
  }

  /* ---- 3. Dışarıya açılan tek fonksiyon ---------------------------------- */

  /**
   * Hastaneleri getirir. USE_MOCK açıksa ağa çıkmadan sahte veri kullanır,
   * ama sahte veri de AYNI doğrulamadan geçer (arka uç sözleşmesi sınansın diye).
   * @param {string} timeSlot  'now' | '2h' | 'evening'
   * @returns {Promise<ApiResponse>}
   */
  async function fetchHospitals(timeSlot) {
    const slot = cfg.TIME_SLOTS.indexOf(timeSlot) !== -1 ? timeSlot : cfg.DEFAULT_TIME_SLOT;
    let raw;
    if (cfg.USE_MOCK) {
      try {
        raw = await AR.mock.respond(slot);
      } catch (error) {
        throw new ApiError(text('error.mock'), { retryable: false });
      }
    } else {
      raw = await fetchWithRetry(buildUrl(slot));
    }
    return parseResponse(raw);
  }

  AR.api = Object.freeze({
    fetchHospitals: fetchHospitals,
    parseResponse: parseResponse,
    buildUrl: buildUrl,
    ApiError: ApiError
  });
})(window.AcilRadar = window.AcilRadar || {});

/* =============================================================================
 * js/schema.js
 * NE İŞE YARAR : Sunucunun JSON biçimini bilen TEK dosya. Ham yanıtı doğrular,
 *                güvenli tür dönüşümü ve sınır denetimi yapar, uygulamanın iç
 *                modeline (Hospital, ApiResponse) çevirir. Hata zarfını koda çevirir.
 * VERDİĞİ      : AcilRadar.Schema → normalizeResponse(raw, receivedAtMs),
 *                normalizeErrorBody(status, body), SchemaError, FIELD_MAP
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Sunucu bir alanın ADINI değiştirdi → yalnız FIELD_MAP / RESPONSE_MAP'te
 *     sağ taraftaki adı değiştirin. Başka hiçbir dosya değişmez.
 *   - Yeni alan göstermek → FIELD_RULES'a kural ekleyin, sonra js/ui/cards.js.
 *   - Hangi kurum türleri gösterilir (devlet/özel): js/config.js › ALLOWED_OWNERSHIP
 * NOT: Tek hastanenin bozukluğu sayfayı DÜŞÜRMEZ: kayıt atlanır, konsola yazılır.
 *      Bilinmeyen (yeni) alanlar sessizce yok sayılır (küçük sürüm uyumu).
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.Config;
  const dev = AR.Strings.data.dev;
  const MAX_LATITUDE = 90;
  const MAX_LONGITUDE = 180;
  const MAX_PERCENT = 100;

  /**
   * Uygulamanın iç hastane modeli.
   * @typedef {Object} Hospital
   * @property {string}  id
   * @property {string}  name
   * @property {string}  district
   * @property {number}  lat
   * @property {number}  lng
   * @property {boolean} childER
   * @property {number}  occupancyPercent           0–100
   * @property {'low'|'medium'|'high'} crowdingLevel
   * @property {?number} nonUrgentWaiting           Acil olmayan başvurularda bekleyen (sunucu: greenWaiting)
   * @property {?number} urgentWaiting              Daha acil başvurularda bekleyen (sunucu: yellowWaiting)
   * @property {?number} activePhysicians
   * @property {number[]} nonUrgentWaitMinutes      [en az, en çok]
   * @property {number[]} urgentWaitMinutes         [en az, en çok]
   * @property {number}  updatedAtMs
   * @property {boolean} isForecast
   * @property {'simulated'|'hospital'|'official'} dataSource
   * @property {'public'|'private'} ownership    public = devlet hastanesi
   */

  /**
   * normalizeResponse() çıktısı.
   * @typedef {Object} ApiResponse
   * @property {string}  schemaVersion
   * @property {number}  generatedAtMs   Sunucu saatine göre üretim anı
   * @property {boolean} serverClock     generatedAt sunucudan geldiyse true
   * @property {number}  receivedAtMs    Tarayıcının yanıtı aldığı an (tarayıcı saati)
   * @property {?string} region
   * @property {?{level:'info'|'warning', text:string}} notice
   * @property {Hospital[]} hospitals
   * @property {'simulated'|'hospital'|'official'|'mixed'|'none'} dataSource
   * @property {boolean} isSimulated
   * @property {number}  skippedCount     Bozuk olduğu için atlanan kayıt sayısı
   * @property {number}  excludedCount    Kurum türü izinli olmadığı için gösterilmeyen kayıt sayısı
   */

  /** Sözleşme dışı yanıt. code: INVALID_RESPONSE | UNSUPPORTED_SCHEMA */
  class SchemaError extends Error {
    constructor(code, detail) {
      super(code);
      this.name = 'SchemaError';
      this.code = code;
      this.detail = detail || '';
    }
  }

  // İç ad → sunucudaki ad. Sunucu alan adı değişirse YALNIZ burası değişir.
  const FIELD_MAP = Object.freeze({
    id: 'hospitalId',
    name: 'name',
    district: 'district',
    lat: 'lat',
    lng: 'lng',
    childER: 'childER',
    occupancyPercent: 'occupancyPercent',
    crowdingLevel: 'crowdingLevel',
    nonUrgentWaiting: 'greenWaiting',
    urgentWaiting: 'yellowWaiting',
    activePhysicians: 'activePhysicians',
    nonUrgentWaitMinutes: 'estimatedGreenWaitMinutes',
    urgentWaitMinutes: 'estimatedYellowWaitMinutes',
    updatedAtMs: 'updatedAt',
    isForecast: 'isForecast',
    dataSource: 'dataSource',
    ownership: 'ownership'
  });

  const RESPONSE_MAP = Object.freeze({
    schemaVersion: 'schemaVersion',
    generatedAt: 'generatedAt',
    region: 'region',
    notice: 'notice',
    hospitals: 'hospitals',
    error: 'error',
    errorCode: 'code'
  });

  const KNOWN_ERROR_CODES = ['RATE_LIMITED', 'BAD_REQUEST', 'UNAVAILABLE', 'INTERNAL'];
  const HTTP = { BAD_REQUEST: 400, TOO_MANY: 429, UNAVAILABLE: 503, SERVER_MIN: 500 };

  /* ---- Konsol ------------------------------------------------------------ */

  function fill(template, params) {
    return template.replace(/\{(\w+)\}/g, function (match, name) {
      return params[name] != null ? String(params[name]) : match;
    });
  }

  function warn(template, params) {
    console.warn(dev.prefix + ' ' + fill(template, params || {}));
  }

  /* ---- Güvenli tür dönüşümleri -------------------------------------------- */

  const INVALID = Object.freeze({ invalid: true });
  const NUMERIC_TEXT = /^\s*-?\d+(\.\d+)?\s*$/;

  /** Sayı ya da sayı yazısı ("62") → sayı; diğer her şey → NaN. */
  function toNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (typeof value === 'string' && NUMERIC_TEXT.test(value)) return Number(value);
    return NaN;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseText(maxLength) {
    return function (value) {
      if (typeof value !== 'string' && typeof value !== 'number') return INVALID;
      const textValue = String(value).replace(/\s+/g, ' ').trim();
      if (textValue === '') return INVALID;
      return { value: textValue.length > maxLength ? textValue.slice(0, maxLength - 1) + '…' : textValue };
    };
  }

  function parseCoordinate(limit) {
    return function (value) {
      const num = toNumber(value);
      return Number.isNaN(num) || Math.abs(num) > limit ? INVALID : { value: num };
    };
  }

  /** Sınır dışı sayıyı aralığa çeker ve bunu bildirir (clamped). */
  function parseBounded(min, max) {
    return function (value) {
      const num = toNumber(value);
      if (Number.isNaN(num)) return INVALID;
      const bounded = Math.round(clamp(num, min, max));
      return { value: bounded, clamped: bounded !== Math.round(num) ? { raw: num, min: min, max: max } : null };
    };
  }

  function parseEnum(allowed) {
    return function (value) {
      return allowed.indexOf(value) === -1 ? INVALID : { value: value };
    };
  }

  function parseBoolean(value) {
    if (value === true || value === 'true') return { value: true };
    if (value === false || value === 'false') return { value: false };
    return INVALID;
  }

  /** [en az, en çok] dakika. en az > en çok ise geçersiz (tahmin uydurulmaz). */
  function parseMinuteRange(value) {
    if (!Array.isArray(value) || value.length !== 2) return INVALID;
    const low = toNumber(value[0]);
    const high = toNumber(value[1]);
    if (Number.isNaN(low) || Number.isNaN(high) || low < 0 || low > high) return INVALID;
    const max = cfg.LIMITS.MAX_WAIT_MINUTES;
    if (high > max) return INVALID;
    return { value: [Math.round(low), Math.round(high)] };
  }

  function parseDate(value) {
    if (typeof value !== 'string') return INVALID;
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? INVALID : { value: ms };
  }

  // Her alanın kuralı. required:false olanlar eksikse varsayılanla devam edilir.
  const L = cfg.LIMITS;
  const FIELD_RULES = {
    id: { required: true, parse: parseText(L.MAX_ID_LENGTH) },
    name: { required: true, parse: parseText(L.MAX_TEXT_LENGTH) },
    district: { required: true, parse: parseText(L.MAX_TEXT_LENGTH) },
    lat: { required: true, parse: parseCoordinate(MAX_LATITUDE) },
    lng: { required: true, parse: parseCoordinate(MAX_LONGITUDE) },
    childER: { required: false, fallback: false, parse: parseBoolean },
    occupancyPercent: { required: true, parse: parseBounded(0, MAX_PERCENT) },
    crowdingLevel: { required: true, parse: parseEnum(cfg.CROWDING_LEVELS) },
    nonUrgentWaiting: { required: false, fallback: null, parse: parseBounded(0, L.MAX_COUNT) },
    urgentWaiting: { required: false, fallback: null, parse: parseBounded(0, L.MAX_COUNT) },
    activePhysicians: { required: false, fallback: null, parse: parseBounded(0, L.MAX_COUNT) },
    nonUrgentWaitMinutes: { required: true, parse: parseMinuteRange },
    urgentWaitMinutes: { required: true, parse: parseMinuteRange },
    updatedAtMs: { required: true, parse: parseDate },
    isForecast: { required: true, parse: parseBoolean },
    dataSource: { required: true, parse: parseEnum(cfg.DATA_SOURCES) },
    ownership: { required: true, parse: parseEnum(cfg.OWNERSHIP_TYPES) }
  };

  /* ---- Hastane kaydı ------------------------------------------------------ */

  function readField(record, name, rule, report) {
    const raw = record[FIELD_MAP[name]];
    if (raw === undefined || raw === null) {
      if (rule.required) report.invalid.push(FIELD_MAP[name]);
      return rule.fallback === undefined ? null : rule.fallback;
    }
    const parsed = rule.parse(raw);
    if (parsed.invalid) {
      if (rule.required) report.invalid.push(FIELD_MAP[name]);
      return rule.fallback === undefined ? null : rule.fallback;
    }
    if (parsed.clamped) report.clamped.push({ field: FIELD_MAP[name], info: parsed.clamped });
    return parsed.value;
  }

  /** @returns {?Hospital} geçersizse null */
  function normalizeHospital(record, index) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      warn(dev.skippedHospital, { index: index + 1, id: '?', fields: '*' });
      return null;
    }
    const report = { invalid: [], clamped: [] };
    const hospital = {};
    Object.keys(FIELD_RULES).forEach(function (name) {
      hospital[name] = readField(record, name, FIELD_RULES[name], report);
    });
    const label = hospital.id || '?';
    if (report.invalid.length > 0) {
      warn(dev.skippedHospital, { index: index + 1, id: label, fields: report.invalid.join(', ') });
      return null;
    }
    report.clamped.forEach(function (item) {
      warn(dev.clamped, { index: index + 1, id: label, field: item.field, value: item.info.raw, min: item.info.min, max: item.info.max });
    });
    return hospital;
  }

  /**
   * Geçerli kayıtları süzer, yinelenen kimlikleri atar, üst sınırı uygular ve
   * yalnız izinli kurum türlerini (config › ALLOWED_OWNERSHIP) bırakır.
   * @returns {{hospitals: Hospital[], excluded: number}}
   */
  function normalizeHospitals(list) {
    const max = cfg.LIMITS.MAX_HOSPITALS;
    if (list.length > max) warn(dev.tooMany, { count: list.length, max: max });
    const seen = new Set();
    const result = { hospitals: [], excluded: 0 };
    list.slice(0, max).forEach(function (record, index) {
      const hospital = normalizeHospital(record, index);
      if (!hospital) return;
      if (seen.has(hospital.id)) {
        warn(dev.duplicateId, { index: index + 1, id: hospital.id });
        return;
      }
      seen.add(hospital.id);
      // NOT: İzinli olmayan tür (ör. özel hastane) bilinçli bir seçimdir; uyarı yazılmaz.
      if (cfg.ALLOWED_OWNERSHIP.indexOf(hospital.ownership) === -1) {
        result.excluded += 1;
        return;
      }
      result.hospitals.push(hospital);
    });
    return result;
  }

  /* ---- Yanıtın üst düzeyi ------------------------------------------------- */

  /** "1.0" → 1. Yoksa 1.0 varsayılır; ana sürüm farklıysa UNSUPPORTED_SCHEMA. */
  function checkVersion(raw) {
    const value = raw[RESPONSE_MAP.schemaVersion];
    if (value === undefined || value === null) {
      warn(dev.schemaMissing);
      return '1.0';
    }
    const major = parseInt(String(value), 10);
    if (major !== cfg.SCHEMA_MAJOR_VERSION) {
      warn(dev.schemaMajor, { server: value, client: cfg.SCHEMA_MAJOR_VERSION });
      throw new SchemaError('UNSUPPORTED_SCHEMA', String(value));
    }
    return String(value);
  }

  function readNotice(value) {
    if (value === undefined || value === null) return null;
    const textValue = value && typeof value.text === 'string' ? value.text.replace(/\s+/g, ' ').trim() : '';
    if (!textValue || cfg.NOTICE_LEVELS.indexOf(value.level) === -1) {
      warn(dev.badNotice);
      return null;
    }
    return { level: value.level, text: textValue.slice(0, cfg.LIMITS.MAX_NOTICE_LENGTH) };
  }

  function overallSource(hospitals) {
    const sources = new Set(hospitals.map(function (h) { return h.dataSource; }));
    if (sources.size === 0) return 'none';
    return sources.size === 1 ? hospitals[0].dataSource : 'mixed';
  }

  /**
   * Ham sunucu yanıtını iç modele çevirir.
   * @param {*} raw              JSON.parse sonucu
   * @param {number} receivedAtMs Yanıtın alındığı an (tarayıcı saati)
   * @returns {ApiResponse}
   * @throws {SchemaError}
   */
  function normalizeResponse(raw, receivedAtMs) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      warn(dev.notObject);
      throw new SchemaError('INVALID_RESPONSE', 'not-object');
    }
    const schemaVersion = checkVersion(raw);
    const list = raw[RESPONSE_MAP.hospitals];
    if (!Array.isArray(list)) {
      warn(dev.noHospitals);
      throw new SchemaError('INVALID_RESPONSE', 'no-hospitals');
    }
    const normalized = normalizeHospitals(list);
    const hospitals = normalized.hospitals;
    if (list.length > 0 && hospitals.length === 0 && normalized.excluded === 0) throw new SchemaError('INVALID_RESPONSE', 'all-invalid');
    const generated = parseDate(raw[RESPONSE_MAP.generatedAt]);
    if (generated.invalid) warn(dev.generatedAtMissing);
    const region = raw[RESPONSE_MAP.region];
    return {
      schemaVersion: schemaVersion,
      generatedAtMs: generated.invalid ? receivedAtMs : generated.value,
      serverClock: !generated.invalid,
      receivedAtMs: receivedAtMs,
      region: typeof region === 'string' ? region : null,
      notice: readNotice(raw[RESPONSE_MAP.notice]),
      hospitals: hospitals,
      dataSource: overallSource(hospitals),
      isSimulated: hospitals.some(function (h) { return h.dataSource === 'simulated'; }),
      skippedCount: Math.min(list.length, cfg.LIMITS.MAX_HOSPITALS) - hospitals.length - normalized.excluded,
      excludedCount: normalized.excluded
    };
  }

  /**
   * Hata yanıtını uygulama koduna çevirir. Sunucunun "message" alanı
   * bilerek KULLANILMAZ (kullanıcıya doğrudan gösterilmez).
   * @returns {string} RATE_LIMITED | BAD_REQUEST | UNAVAILABLE | INTERNAL | UNKNOWN
   */
  function normalizeErrorBody(status, body) {
    const envelope = body && typeof body === 'object' ? body[RESPONSE_MAP.error] : null;
    const code = envelope && typeof envelope === 'object' ? envelope[RESPONSE_MAP.errorCode] : null;
    if (KNOWN_ERROR_CODES.indexOf(code) !== -1) return code;
    if (status === HTTP.TOO_MANY) return 'RATE_LIMITED';
    if (status === HTTP.BAD_REQUEST) return 'BAD_REQUEST';
    if (status === HTTP.UNAVAILABLE) return 'UNAVAILABLE';
    if (status >= HTTP.SERVER_MIN) return 'INTERNAL';
    return 'UNKNOWN';
  }

  AR.Schema = Object.freeze({
    FIELD_MAP: FIELD_MAP,
    SchemaError: SchemaError,
    normalizeResponse: normalizeResponse,
    normalizeErrorBody: normalizeErrorBody,
    toNumber: toNumber
  });
})(window.AcilRadar = window.AcilRadar || {});

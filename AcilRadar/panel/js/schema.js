/* =============================================================================
 * panel/js/schema.js
 * NE İŞE YARAR : Panelde sunucu JSON biçimini bilen TEK dosya. Yanıtları iç modele
 *                çevirir (kullanıcı, oturum, hastane, kayıt, denetim, sayfa), yazma
 *                isteklerinde iç modeli sunucu adlarına çevirir ve hata zarfını
 *                { code, fields } biçimine getirir.
 * VERDİĞİ      : AcilRadar.Panel.Schema
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Sunucu bir alanın adını değiştirdi → RECORD_MAP / USER_MAP sağ tarafı.
 *   - Sözleşme: docs/SOZLESME-PANEL.md
 * NOT: Geçersiz tek kayıt listeyi düşürmez; atlanır ve konsola yazılır.
 *      Sunucunun "message" alanı kullanıcıya gösterilmez; yalnız kodlar kullanılır.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.Panel.Config;
  const siteCfg = AR.Config;
  const t = AR.Strings.text;

  /**
   * @typedef {Object} PanelRecord
   * @property {string} id
   * @property {string} hospitalId
   * @property {number} createdAtMs
   * @property {string} createdByName
   * @property {number} occupancyPercent
   * @property {?string} crowdingLevel
   * @property {number} nonUrgentWaiting
   * @property {number} urgentWaiting
   * @property {number} activePhysicians
   * @property {number[]} nonUrgentWaitMinutes
   * @property {number[]} urgentWaitMinutes
   */

  /**
   * @typedef {Object} PanelSession
   * @property {PanelUser} user
   * @property {number} expiresInMs     Oturumun kalan süresi (sunucu saatine göre)
   * @property {number} serverTimeMs    Sunucunun yanıt anındaki saati (cihaz saati farkı için)
   * @property {boolean} twoFactorRequired
   */

  // İç ad → sunucu adı (kayıt). Yazma isteklerinde de bu tablo kullanılır.
  const RECORD_MAP = Object.freeze({
    occupancyPercent: 'occupancyPercent',
    nonUrgentWaiting: 'greenWaiting',
    urgentWaiting: 'yellowWaiting',
    activePhysicians: 'activePhysicians',
    nonUrgentWaitMinutes: 'estimatedGreenWaitMinutes',
    urgentWaitMinutes: 'estimatedYellowWaitMinutes'
  });

  const USER_MAP = Object.freeze({
    id: 'userId',
    name: 'name',
    email: 'email',
    role: 'role',
    hospitalId: 'hospitalId',
    active: 'active',
    lastLoginAt: 'lastLoginAt'
  });

  const ERROR_CODES = ['BAD_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'VALIDATION',
    'RATE_LIMITED', 'UNAVAILABLE', 'INTERNAL', 'INVALID_CREDENTIALS', 'ACCOUNT_INACTIVE'];
  const STATUS_CODES = { 400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 422: 'VALIDATION', 429: 'RATE_LIMITED', 503: 'UNAVAILABLE' };
  const HTTP_SERVER_MIN = 500;
  // Alan hatası kodları → panel.validation.* (bilinmeyen kod → 'generic')
  const FIELD_ERROR_KEYS = ['required', 'integer', 'outOfRange', 'rangeOrder', 'email', 'emailTaken', 'roleNotAllowed', 'hospitalRequired'];

  class PanelSchemaError extends Error {
    constructor(detail) {
      super('INVALID_RESPONSE');
      this.code = 'INVALID_RESPONSE';
      this.detail = detail;
    }
  }

  function warnSkipped(kind) {
    console.warn(t('dev.prefix') + ' ' + t('panel.dev.skipped', { kind: kind }));
  }

  /* ---- Temel dönüştürücüler -------------------------------------------------- */

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function text(value) {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
  }

  function date(value) {
    const ms = typeof value === 'string' ? Date.parse(value) : NaN;
    return Number.isNaN(ms) ? null : ms;
  }

  function count(value, max) {
    const num = AR.Schema.toNumber(value);
    return Number.isNaN(num) || num < 0 || num > max ? null : Math.round(num);
  }

  function range(value) {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const low = count(value[0], cfg.RECORD_LIMITS.WAIT_MAX_MINUTES);
    const high = count(value[1], cfg.RECORD_LIMITS.WAIT_MAX_MINUTES);
    return low === null || high === null || low > high ? null : [low, high];
  }

  /** Listeyi dönüştürür; geçersiz öğeleri atlar. */
  function mapList(list, mapper, kind) {
    if (!Array.isArray(list)) throw new PanelSchemaError(kind);
    return list.map(mapper).filter(function (item) {
      if (!item) warnSkipped(kind);
      return Boolean(item);
    });
  }

  /* ---- Kullanıcı ve oturum -------------------------------------------------- */

  /** @returns {?PanelUser} */
  function normalizeUser(raw) {
    if (!isObject(raw)) return null;
    const user = {
      id: text(String(raw[USER_MAP.id] == null ? '' : raw[USER_MAP.id])),
      name: text(raw[USER_MAP.name]),
      email: text(raw[USER_MAP.email]),
      role: cfg.ROLES.indexOf(raw[USER_MAP.role]) !== -1 ? raw[USER_MAP.role] : null,
      hospitalId: text(raw[USER_MAP.hospitalId]),
      active: raw[USER_MAP.active] !== false,
      lastLoginAtMs: date(raw[USER_MAP.lastLoginAt])
    };
    if (!user.id || !user.name || !user.email || !user.role) return null;
    if (cfg.HOSPITAL_ROLES.indexOf(user.role) !== -1 && !user.hospitalId) return null;
    return user;
  }

  /**
   * /auth/login ve /auth/me yanıtı.
   * @returns {PanelSession}
   */
  function normalizeSession(raw) {
    if (!isObject(raw)) throw new PanelSchemaError('session');
    const user = normalizeUser(raw.user);
    if (!user) throw new PanelSchemaError('session.user');
    const session = isObject(raw.session) ? raw.session : {};
    const expires = date(session.expiresAt);
    const serverTime = date(session.serverTime);
    if (expires === null || serverTime === null) throw new PanelSchemaError('session.expiresAt');
    return { user: user, expiresInMs: Math.max(0, expires - serverTime), serverTimeMs: serverTime, twoFactorRequired: raw.twoFactorRequired === true };
  }

  /* ---- Hastane ve kayıt -------------------------------------------------------- */

  /** @returns {?PanelRecord} */
  function normalizeRecord(raw) {
    if (!isObject(raw)) return null;
    const L = cfg.RECORD_LIMITS;
    const record = {
      id: text(String(raw.recordId == null ? '' : raw.recordId)),
      hospitalId: text(raw.hospitalId),
      createdAtMs: date(raw.createdAt),
      createdByName: isObject(raw.createdBy) ? text(raw.createdBy.name) : null,
      occupancyPercent: count(raw[RECORD_MAP.occupancyPercent], L.PERCENT_MAX),
      crowdingLevel: siteCfg.CROWDING_LEVELS.indexOf(raw.crowdingLevel) !== -1 ? raw.crowdingLevel : null,
      nonUrgentWaiting: count(raw[RECORD_MAP.nonUrgentWaiting], L.COUNT_MAX),
      urgentWaiting: count(raw[RECORD_MAP.urgentWaiting], L.COUNT_MAX),
      activePhysicians: count(raw[RECORD_MAP.activePhysicians], L.PHYSICIANS_MAX),
      nonUrgentWaitMinutes: range(raw[RECORD_MAP.nonUrgentWaitMinutes]),
      urgentWaitMinutes: range(raw[RECORD_MAP.urgentWaitMinutes])
    };
    const required = ['id', 'hospitalId', 'createdAtMs', 'occupancyPercent', 'nonUrgentWaiting', 'urgentWaiting', 'activePhysicians', 'nonUrgentWaitMinutes', 'urgentWaitMinutes'];
    return required.every(function (key) { return record[key] !== null; }) ? record : null;
  }

  function normalizeHospital(raw) {
    if (!isObject(raw)) return null;
    const hospital = {
      id: text(raw.hospitalId),
      name: text(raw.name),
      district: text(raw.district),
      ownership: siteCfg.OWNERSHIP_TYPES.indexOf(raw.ownership) !== -1 ? raw.ownership : null,
      latest: raw.latest == null ? null : normalizeRecord(raw.latest)
    };
    if (!hospital.id || !hospital.name || !hospital.ownership) return null;
    // Sitenin kuralı panelde de geçerli: yalnız izinli kurum türleri (şu an devlet).
    return siteCfg.ALLOWED_OWNERSHIP.indexOf(hospital.ownership) === -1 ? null : hospital;
  }

  function normalizeHospitals(raw) {
    if (!isObject(raw) || !Array.isArray(raw.items)) throw new PanelSchemaError('hospitals');
    // İzinli olmayan kurum türü (ör. özel hastane) bilinçli olarak ve uyarısız ayıklanır.
    const allowed = raw.items.filter(function (item) {
      return !isObject(item) || siteCfg.ALLOWED_OWNERSHIP.indexOf(item.ownership) !== -1 || siteCfg.OWNERSHIP_TYPES.indexOf(item.ownership) === -1;
    });
    return mapList(allowed, normalizeHospital, 'hospital');
  }

  /* ---- Denetim kaydı ------------------------------------------------------------ */

  function normalizeChange(raw) {
    if (!isObject(raw) || !text(raw.field)) return null;
    return { field: raw.field, from: raw.from === undefined ? null : raw.from, to: raw.to === undefined ? null : raw.to };
  }

  function normalizeAudit(raw) {
    if (!isObject(raw)) return null;
    const entry = {
      id: text(String(raw.auditId == null ? '' : raw.auditId)),
      atMs: date(raw.at),
      actorName: isObject(raw.actor) ? text(raw.actor.name) : null,
      action: text(raw.action),
      targetLabel: isObject(raw.target) ? text(raw.target.label) : null,
      changes: Array.isArray(raw.changes) ? raw.changes.map(normalizeChange).filter(Boolean) : []
    };
    return entry.id && entry.atMs !== null && entry.action ? entry : null;
  }

  /* ---- Sayfalı liste --------------------------------------------------------- */

  /**
   * { items, page, pageSize, total } → { items, page, pages, total }
   * @param {function} mapper  normalizeRecord | normalizeAudit | normalizeUser
   */
  function normalizePage(raw, mapper, kind) {
    if (!isObject(raw)) throw new PanelSchemaError(kind);
    const items = mapList(raw.items, mapper, kind);
    const pageSize = count(raw.pageSize, Number.MAX_SAFE_INTEGER) || cfg.PAGE_SIZE;
    const total = count(raw.total, Number.MAX_SAFE_INTEGER);
    const page = count(raw.page, Number.MAX_SAFE_INTEGER) || 1;
    const safeTotal = total === null ? items.length : total;
    return { items: items, page: page, pages: Math.max(1, Math.ceil(safeTotal / pageSize)), total: safeTotal };
  }

  /* ---- Yazma istekleri: iç model → sunucu ------------------------------------- */

  function toServerRecord(values) {
    const body = {};
    Object.keys(RECORD_MAP).forEach(function (name) { body[RECORD_MAP[name]] = values[name]; });
    return body;
  }

  function toServerUser(values) {
    return { name: values.name, email: values.email, role: values.role, hospitalId: values.hospitalId };
  }

  /* ---- Hata zarfı -------------------------------------------------------------- */

  /** Sunucudaki alan adını formdaki alan adına çevirir (aralıklarda "en az" kutusu). */
  function formFieldFor(serverField) {
    const recordName = Object.keys(RECORD_MAP).find(function (k) { return RECORD_MAP[k] === serverField; });
    if (recordName) return AR.Panel.Rules.RANGE_FIELDS.indexOf(recordName) !== -1 ? recordName + 'Min' : recordName;
    const userName = Object.keys(USER_MAP).find(function (k) { return USER_MAP[k] === serverField; });
    return userName || null;
  }

  /**
   * @returns {{code:string, fields:Object<string, {key:string}>}}
   */
  function normalizeError(status, body) {
    const envelope = isObject(body) && isObject(body.error) ? body.error : {};
    let code = ERROR_CODES.indexOf(envelope.code) !== -1 ? envelope.code : STATUS_CODES[status];
    if (!code) code = status >= HTTP_SERVER_MIN ? 'INTERNAL' : 'UNKNOWN';
    const fields = {};
    if (isObject(envelope.fields)) {
      Object.keys(envelope.fields).forEach(function (serverField) {
        const formField = formFieldFor(serverField);
        const raw = envelope.fields[serverField];
        if (formField) fields[formField] = { key: FIELD_ERROR_KEYS.indexOf(raw) !== -1 ? raw : 'generic' };
      });
    }
    return { code: code, fields: fields };
  }

  AR.Panel.Schema = Object.freeze({
    normalizeSession: normalizeSession,
    normalizeUser: normalizeUser,
    normalizeHospitals: normalizeHospitals,
    normalizeRecord: normalizeRecord,
    normalizeAudit: normalizeAudit,
    normalizePage: normalizePage,
    toServerRecord: toServerRecord,
    toServerUser: toServerUser,
    normalizeError: normalizeError,
    PanelSchemaError: PanelSchemaError,
    RECORD_MAP: RECORD_MAP
  });
})(window.AcilRadar = window.AcilRadar || {});

/* =============================================================================
 * panel/js/rules.js
 * NE İŞE YARAR : Panelin SAF kuralları: rol → yetki denetimi ve form doğrulama
 *                (veri girişi, kullanıcı ekleme, tarih aralığı). DOM'a dokunmaz,
 *                ağa çıkmaz; Node testleri doğrudan sınar.
 * VERDİĞİ      : AcilRadar.Panel.Rules
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Rol tablosu: panel/js/config.js › ROLE_CAPABILITIES (burası değil)
 *   - Alan sınırları: panel/js/config.js › RECORD_LIMITS, USER_LIMITS
 *   - Hata metinleri: panel/js/strings.js › panel.validation
 * NOT (GÜVENLİK): Bu denetimler kullanıcıyı yönlendirmek içindir. Aynı kurallar
 *      sunucuda da uygulanmalıdır; arayüzü atlatan istek sunucuda reddedilir.
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.Panel.Config;
  const INTEGER = /^\s*\d+\s*$/;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

  /* ---- 1. Yetkiler ----------------------------------------------------------- */

  /**
   * Panel kullanıcısı (js/schema.js iç modeli).
   * @typedef {Object} PanelUser
   * @property {string}  id
   * @property {string}  name
   * @property {string}  email
   * @property {string}  role
   * @property {?string} hospitalId  hastaneye bağlı rollerde dolu
   * @property {boolean} active
   */

  /** @returns {boolean} */
  function can(user, capability) {
    if (!user || !user.active) return false;
    const list = cfg.ROLE_CAPABILITIES[user.role] || [];
    return list.indexOf(capability) !== -1;
  }

  /** Bu kullanıcı bu hastanenin verisini görebilir/girebilir mi? */
  function canAccessHospital(user, hospitalId) {
    if (!user || !hospitalId) return false;
    return can(user, 'hospitals.all') || user.hospitalId === hospitalId;
  }

  function canCreateRecord(user, hospitalId) {
    return can(user, 'records.create') && canAccessHospital(user, hospitalId);
  }

  /** Kullanıcının atayabileceği roller (yetkisi yoksa boş dizi). */
  function assignableRoles(actor) {
    if (!can(actor, 'users.manage')) return [];
    return (cfg.ASSIGNABLE_ROLES[actor.role] || []).slice();
  }

  /** Yönetici bu kullanıcıyı düzenleyebilir mi? (kendi hesabı ve kapsam dışı hariç) */
  function canEditUser(actor, target) {
    if (!can(actor, 'users.manage') || !target || actor.id === target.id) return false;
    if (assignableRoles(actor).indexOf(target.role) === -1) return false;
    return can(actor, 'users.all') || target.hospitalId === actor.hospitalId;
  }

  /* ---- 2. Doğrulama yardımcıları -------------------------------------------- */

  /** @typedef {{key:string, params?:Object}} FieldError  key → panel.validation.* */

  function readInteger(raw, min, max) {
    const value = raw == null ? '' : String(raw);
    if (value.trim() === '') return { error: { key: 'required' } };
    if (!INTEGER.test(value)) return { error: { key: 'integer' } };
    const num = Number(value);
    if (num < min) return { error: { key: 'min', params: { min: min } } };
    if (num > max) return { error: { key: 'max', params: { max: max } } };
    return { value: num };
  }

  function readRange(rawMin, rawMax, limit) {
    const low = readInteger(rawMin, 0, limit);
    const high = readInteger(rawMax, 0, limit);
    const errors = {};
    if (low.error) errors.min = low.error;
    if (high.error) errors.max = high.error;
    if (!low.error && !high.error && low.value > high.value) errors.min = { key: 'rangeOrder' };
    return { value: [low.value, high.value], errors: errors };
  }

  /* ---- 3. Veri girişi formu ------------------------------------------------- */

  // Form alanı → [en az, en çok]. Alan adları panel/js/schema.js iç modeliyle aynıdır.
  function integerFields() {
    const L = cfg.RECORD_LIMITS;
    return {
      occupancyPercent: [0, L.PERCENT_MAX],
      nonUrgentWaiting: [0, L.COUNT_MAX],
      urgentWaiting: [0, L.COUNT_MAX],
      activePhysicians: [0, L.PHYSICIANS_MAX]
    };
  }

  const RANGE_FIELDS = ['nonUrgentWaitMinutes', 'urgentWaitMinutes'];

  /**
   * Veri girişi formunu doğrular. Girdi, form alanlarının ham metinleridir:
   * { occupancyPercent: '62', nonUrgentWaiting: '34', …, nonUrgentWaitMinutesMin: '20', nonUrgentWaitMinutesMax: '40', … }
   * @returns {{ok:boolean, values:Object, errors:Object<string, FieldError>}}
   *          errors anahtarı form alanının adıdır (ör. 'urgentWaitMinutesMin').
   */
  function validateRecord(input) {
    const values = {};
    const errors = {};
    const fields = integerFields();
    Object.keys(fields).forEach(function (name) {
      const read = readInteger(input[name], fields[name][0], fields[name][1]);
      if (read.error) errors[name] = read.error;
      else values[name] = read.value;
    });
    RANGE_FIELDS.forEach(function (name) {
      const range = readRange(input[name + 'Min'], input[name + 'Max'], cfg.RECORD_LIMITS.WAIT_MAX_MINUTES);
      if (range.errors.min) errors[name + 'Min'] = range.errors.min;
      if (range.errors.max) errors[name + 'Max'] = range.errors.max;
      if (!range.errors.min && !range.errors.max) values[name] = range.value;
    });
    return { ok: Object.keys(errors).length === 0, values: values, errors: errors };
  }

  /* ---- 4. Kullanıcı formu --------------------------------------------------- */

  /**
   * @param {{name:string, email:string, role:string, hospitalId:string}} input
   * @param {PanelUser} actor  ekleyen yönetici
   */
  function validateUser(input, actor) {
    const errors = {};
    const L = cfg.USER_LIMITS;
    const name = String(input.name || '').trim();
    const email = String(input.email || '').trim();
    if (!name) errors.name = { key: 'required' };
    else if (name.length > L.NAME_MAX) errors.name = { key: 'tooLong', params: { max: L.NAME_MAX } };
    if (!email) errors.email = { key: 'required' };
    else if (email.length > L.EMAIL_MAX || !EMAIL.test(email)) errors.email = { key: 'email' };
    if (!input.role) errors.role = { key: 'required' };
    else if (assignableRoles(actor).indexOf(input.role) === -1) errors.role = { key: 'roleNotAllowed' };
    const needsHospital = cfg.HOSPITAL_ROLES.indexOf(input.role) !== -1;
    const hospitalId = can(actor, 'users.all') ? input.hospitalId : actor.hospitalId;
    if (needsHospital && !hospitalId) errors.hospitalId = { key: 'hospitalRequired' };
    return {
      ok: Object.keys(errors).length === 0,
      values: { name: name, email: email.toLowerCase(), role: input.role, hospitalId: needsHospital ? hospitalId : null },
      errors: errors
    };
  }

  /* ---- 5. Tarih süzgeci ----------------------------------------------------- */

  /** Boş ya da YYYY-AA-GG; başlangıç bitişten sonra olamaz. */
  function validateDateRange(from, to) {
    const okFormat = function (v) { return !v || ISO_DATE.test(v); };
    if (!okFormat(from) || !okFormat(to)) return { ok: false };
    if (from && to && from > to) return { ok: false };
    return { ok: true };
  }

  AR.Panel.Rules = Object.freeze({
    can: can,
    canAccessHospital: canAccessHospital,
    canCreateRecord: canCreateRecord,
    canEditUser: canEditUser,
    assignableRoles: assignableRoles,
    validateRecord: validateRecord,
    validateUser: validateUser,
    validateDateRange: validateDateRange,
    RANGE_FIELDS: RANGE_FIELDS
  });
})(window.AcilRadar = window.AcilRadar || {});

/* =============================================================================
 * tests/lib/json-schema-lite.js
 * NE İŞE YARAR : docs/hospitals.schema.json'u doğrulamak için KÜÇÜK, bağımlılıksız
 *                bir JSON Schema (2020-12) alt kümesi doğrulayıcısı.
 * DESTEKLENEN  : type, required, properties, items, minItems, maxItems, minimum,
 *                maximum, minLength, maxLength, pattern, enum, oneOf, $ref (#/$defs/..)
 * NOT: Yalnız testlerde kullanılır. Arka uç ekibi aynı şemayı kendi dilindeki tam
 *      bir doğrulayıcıyla (ör. ajv, jsonschema) kullanabilir.
 * ========================================================================== */
'use strict';

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && Number.isInteger(value)) return 'integer';
  return typeof value;
}

function matchesType(value, expected) {
  const actual = typeOf(value);
  const list = Array.isArray(expected) ? expected : [expected];
  return list.some(function (type) {
    return type === actual || (type === 'number' && actual === 'integer');
  });
}

function resolveRef(root, ref) {
  return ref.replace(/^#\//, '').split('/').reduce(function (node, key) { return node[key]; }, root);
}

function validate(schema, value, root, at, errors) {
  if (schema.$ref) return validate(resolveRef(root, schema.$ref), value, root, at, errors);
  if (schema.oneOf) {
    const passing = schema.oneOf.filter(function (option) { return validate(option, value, root, at, []).length === 0; });
    if (passing.length !== 1) errors.push(at + ': oneOf seçeneklerinden tam biri tutmalı (' + passing.length + ' tuttu)');
    return errors;
  }
  if (schema.type && !matchesType(value, schema.type)) {
    errors.push(at + ': tür ' + JSON.stringify(schema.type) + ' beklenirdi, ' + typeOf(value) + ' geldi');
    return errors;
  }
  if (schema.enum && schema.enum.indexOf(value) === -1) errors.push(at + ': izinli değerlerden biri değil (' + JSON.stringify(value) + ')');
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) errors.push(at + ': ' + value + ' < ' + schema.minimum);
    if (schema.maximum != null && value > schema.maximum) errors.push(at + ': ' + value + ' > ' + schema.maximum);
  }
  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) errors.push(at + ': çok kısa');
    if (schema.maxLength != null && value.length > schema.maxLength) errors.push(at + ': çok uzun');
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(at + ': biçim uyumsuz (' + value + ')');
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) errors.push(at + ': en az ' + schema.minItems + ' öğe');
    if (schema.maxItems != null && value.length > schema.maxItems) errors.push(at + ': en çok ' + schema.maxItems + ' öğe');
    if (schema.items) value.forEach(function (item, i) { validate(schema.items, item, root, at + '[' + i + ']', errors); });
  }
  if (typeOf(value) === 'object') {
    (schema.required || []).forEach(function (key) {
      if (!(key in value)) errors.push(at + ': zorunlu alan yok: ' + key);
    });
    Object.keys(schema.properties || {}).forEach(function (key) {
      if (key in value) validate(schema.properties[key], value[key], root, at + '.' + key, errors);
    });
  }
  return errors;
}

/**
 * @param {Object} rootSchema  şema belgesinin tamamı
 * @param {*} value
 * @param {string} [pointer]   ör. '#/$defs/errorEnvelope'; yoksa kök şema
 * @returns {string[]} hata listesi (boşsa geçerli)
 */
function validateAgainst(rootSchema, value, pointer) {
  const schema = pointer ? resolveRef(rootSchema, pointer) : rootSchema;
  return validate(schema, value, rootSchema, '$', []);
}

module.exports = { validateAgainst: validateAgainst };

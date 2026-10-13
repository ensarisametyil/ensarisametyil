/* =============================================================================
 * motor/tests/lib/harness.js
 * NE İŞE YARAR : Bağımlılıksız küçük test düzeneği: test(), eşitlik/yakınlık
 *                denetimleri ve sonuç sayımı. tests/run-all.js tarafından kullanılır.
 * ========================================================================== */
'use strict';

const tests = [];
let currentFile = '';

function setFile(name) {
  currentFile = name;
}

function test(name, fn) {
  tests.push({ file: currentFile, name: name, fn: fn });
}

function fail(message) {
  throw new Error(message);
}

const assert = {
  ok: function (value, message) { if (!value) fail(message || 'beklenen: doğru'); },
  equal: function (actual, expected, message) {
    if (actual !== expected) fail((message ? message + ' — ' : '') + 'beklenen ' + JSON.stringify(expected) + ', gelen ' + JSON.stringify(actual));
  },
  deepEqual: function (actual, expected, message) {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) fail((message ? message + ' — ' : '') + 'beklenen ' + b.slice(0, 300) + ', gelen ' + a.slice(0, 300));
  },
  near: function (actual, expected, tolerance, message) {
    if (!(Math.abs(actual - expected) <= tolerance)) fail((message ? message + ' — ' : '') + 'beklenen ≈' + expected + ' (±' + tolerance + '), gelen ' + actual);
  },
  between: function (value, lo, hi, message) {
    if (!(value >= lo && value <= hi)) fail((message ? message + ' — ' : '') + value + ' ∉ [' + lo + ', ' + hi + ']');
  },
  throws: function (fn, message) {
    let threw = false;
    try { fn(); } catch (e) { threw = true; }
    if (!threw) fail(message || 'hata bekleniyordu');
  }
};

async function runAll(filter) {
  const results = [];
  for (const t of tests) {
    if (filter && t.file.indexOf(filter) === -1) continue;
    const started = Date.now();
    try {
      await t.fn();
      results.push({ file: t.file, name: t.name, ok: true, ms: Date.now() - started });
    } catch (error) {
      results.push({ file: t.file, name: t.name, ok: false, ms: Date.now() - started, message: String(error && error.message || error).split('\n')[0] });
    }
  }
  return results;
}

module.exports = { test: test, assert: assert, runAll: runAll, setFile: setFile };

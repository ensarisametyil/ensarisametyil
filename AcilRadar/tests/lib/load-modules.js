/* =============================================================================
 * tests/lib/load-modules.js
 * NE İŞE YARAR : Tarayıcı için yazılmış js/*.js dosyalarını Node'da, ayrı bir
 *                sanal ortamda (vm) yükler; testler aynı kodu sınar.
 * NOT: DOM gerektirmeyen modüller yüklenir (config, strings, storage, schema,
 *      mock-data, calc, api). Çizim (ui/*) testleri tarayıcıda çalışır (tests/unit.html).
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const CORE_FILES = ['js/config.js', 'js/strings.js', 'js/storage.js', 'js/schema.js', 'js/mock-data.js', 'js/calc.js', 'js/api.js'];

/**
 * @param {{quiet?:boolean, files?:string[]}} [options] quiet: konsol uyarılarını toplar
 * @returns {{AR:Object, warnings:string[], sandbox:Object}}
 */
function loadModules(options) {
  const opts = options || {};
  const warnings = [];
  const quietConsole = {
    log: console.log,
    info: function () {},
    warn: function () { warnings.push(Array.prototype.join.call(arguments, ' ')); },
    error: function () { warnings.push(Array.prototype.join.call(arguments, ' ')); }
  };
  const sandbox = {
    console: opts.quiet === false ? console : quietConsole,
    Intl: Intl, URL: URL, URLSearchParams: URLSearchParams,
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    AbortController: AbortController, fetch: globalThis.fetch,
    navigator: { onLine: true }
  };
  sandbox.window = sandbox;
  sandbox.window.location = { href: 'http://localhost/', search: '' };
  vm.createContext(sandbox);
  (opts.files || CORE_FILES).forEach(function (file) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  });
  return { AR: sandbox.AcilRadar, warnings: warnings, sandbox: sandbox };
}

module.exports = { loadModules: loadModules, ROOT: ROOT };

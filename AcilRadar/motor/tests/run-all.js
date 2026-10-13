#!/usr/bin/env node
/* =============================================================================
 * motor/tests/run-all.js
 * NE İŞE YARAR : Motorun TÜM testlerini tek komutla çalıştırır:
 *   node motor/tests/run-all.js            (hepsi)
 *   node motor/tests/run-all.js property   (adında "property" geçen dosyalar)
 * Çıkış kodu: hepsi geçtiyse 0, aksi 1. Sonuç tablosu motor/out/test-results.json'a yazılır.
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const harness = require('./lib/harness.js');

const DIRS = ['unit', 'property', 'golden', 'robustness', 'perf'];

DIRS.forEach(function (dir) {
  const full = path.join(__dirname, dir);
  if (!fs.existsSync(full)) return;
  fs.readdirSync(full).filter(function (f) { return /\.test\.js$/.test(f); }).sort().forEach(function (f) {
    harness.setFile(dir + '/' + f);
    require(path.join(full, f));
  });
});

harness.runAll(process.argv[2]).then(function (results) {
  let file = '';
  results.forEach(function (r) {
    if (r.file !== file) { file = r.file; console.log('\n' + file); }
    console.log((r.ok ? '  ✔ ' : '  ✘ ') + r.name + ' (' + r.ms + ' ms)' + (r.ok ? '' : '\n      → ' + r.message));
  });
  const perfPath = path.join(__dirname, 'perf', 'perf.test.js');
  const perf = require.cache[perfPath] ? require(perfPath).results : {};
  if (Object.keys(perf).length) {
    console.log('\nPerformans (ms):');
    Object.keys(perf).forEach(function (k) { const p = perf[k]; console.log('  ' + k + ': p50 ' + p.p50 + ' · p95 ' + p.p95 + ' · en çok ' + p.max + ' (n=' + p.n + ')'); });
  }
  const failed = results.filter(function (r) { return !r.ok; }).length;
  console.log('\n' + (results.length - failed) + ' geçti, ' + failed + ' kaldı (toplam ' + results.length + ').');
  const outDir = path.join(__dirname, '..', 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'test-results.json'), JSON.stringify({ when: new Date().toISOString(), node: process.version, results: results, perf: perf }, null, 2));
  process.exitCode = failed ? 1 : 0;
});

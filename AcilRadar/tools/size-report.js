#!/usr/bin/env node
/* =============================================================================
 * tools/size-report.js
 * NE İŞE YARAR : Sayfanın yüklediği JS + CSS dosyalarının boyut tablosunu çıkarır
 *                (sıkıştırılmamış ve gzip) ve performans bütçesiyle karşılaştırır.
 *                Leaflet (vendor/) ve yalnız 'mock' ortamında inen js/mock-data.js hariçtir.
 * KULLANIM     : node tools/size-report.js [--markdown]
 * NOT: Bütçe aşılırsa çıkış kodu 1 olur.
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const BUDGET_BYTES = 120 * 1024;
const EXCLUDED = ['js/mock-data.js'];

function list(dir, ext) {
  return fs.readdirSync(path.join(ROOT, dir)).filter(function (f) { return f.endsWith(ext); }).map(function (f) { return dir + '/' + f; });
}

const files = list('js', '.js').concat(list('js/ui', '.js'), list('css', '.css'))
  .filter(function (f) { return EXCLUDED.indexOf(f) === -1; });

const rows = files.map(function (file) {
  const data = fs.readFileSync(path.join(ROOT, file));
  return { file: file, raw: data.length, gzip: zlib.gzipSync(data, { level: 9 }).length };
}).sort(function (a, b) { return b.raw - a.raw; });

const total = rows.reduce(function (sum, r) { return { raw: sum.raw + r.raw, gzip: sum.gzip + r.gzip }; }, { raw: 0, gzip: 0 });
const kb = function (bytes) { return (bytes / 1024).toFixed(1) + ' KB'; };
const markdown = process.argv.indexOf('--markdown') !== -1;

if (markdown) {
  console.log('| Dosya | Sıkıştırılmamış | gzip |');
  console.log('|---|---:|---:|');
  rows.forEach(function (r) { console.log('| ' + r.file + ' | ' + kb(r.raw) + ' | ' + kb(r.gzip) + ' |'); });
  console.log('| **Toplam** | **' + kb(total.raw) + '** | **' + kb(total.gzip) + '** |');
} else {
  rows.forEach(function (r) { console.log(r.file.padEnd(24) + kb(r.raw).padStart(10) + kb(r.gzip).padStart(10)); });
  console.log('TOPLAM'.padEnd(24) + kb(total.raw).padStart(10) + kb(total.gzip).padStart(10));
}
const ok = total.raw <= BUDGET_BYTES;
console.log('\nBütçe (sıkıştırılmamış): ' + kb(total.raw) + ' / ' + kb(BUDGET_BYTES) + ' → ' + (ok ? 'GEÇTİ' : 'AŞILDI'));
process.exitCode = ok ? 0 : 1;

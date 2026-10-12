#!/usr/bin/env node
/* =============================================================================
 * tools/check-contrast.js
 * NE İŞE YARAR : css/tokens.css içindeki renkleri okur ve arayüzde KULLANILAN her
 *                yazı/zemin ve sınır/zemin çiftinin WCAG kontrast oranını açık ve
 *                koyu tema için HESAPLAR. Bir çift eşiğin altındaysa çıkış kodu 1.
 * KULLANIM     : node tools/check-contrast.js            (tablo yazdırır)
 *                node tools/check-contrast.js --markdown (docs için Markdown tablo)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK:
 *   - Yeni bir renk çifti kullanmaya başladıysanız PAIRS listesine ekleyin.
 * NOT: Yalnız geliştirme aracıdır; bağımlılığı yoktur, sayfaya yüklenmez.
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const TOKENS = path.join(__dirname, '..', 'css', 'tokens.css');

// [açıklama, ön plan jetonu, arka plan jetonu, gereken oran]
// 7 = ana metin hedefi (AAA), 4.5 = normal metin (AA), 3 = büyük metin / arayüz öğesi sınırı.
const PAIRS = [
  ['Ana metin / yüzey', 'c-text', 'c-surface', 7],
  ['Ana metin / zemin', 'c-text', 'c-bg', 7],
  ['Başlık / yüzey', 'c-heading', 'c-surface', 7],
  ['İkincil metin / yüzey', 'c-text-2', 'c-surface', 4.5],
  ['İkincil metin / zemin', 'c-text-2', 'c-bg', 4.5],
  ['İkincil metin / yüzey-2', 'c-text-2', 'c-surface-2', 4.5],
  ['Bağlantı / yüzey', 'c-link', 'c-surface', 4.5],
  ['Bağlantı / zemin', 'c-link', 'c-bg', 4.5],
  ['Bağlantı / yüzey-2', 'c-link', 'c-surface-2', 4.5],
  ['Birincil düğme yazısı', 'c-on-primary', 'c-primary', 4.5],
  ['Birincil düğme (üstüne gelme)', 'c-on-primary', 'c-primary-hover', 4.5],
  ['Birincil düğme (basılı)', 'c-on-primary', 'c-primary-active', 4.5],
  ['112 düğmesi', 'c-on-danger', 'c-danger', 4.5],
  ['112 düğmesi (üstüne gelme)', 'c-on-danger', 'c-danger-hover', 4.5],
  ['Seçili segment/çip', 'c-selected-fg', 'c-selected-bg', 4.5],
  ['Seçili segment / yazı boyutu düğmesi', 'c-seg-on-fg', 'c-seg-on-bg', 4.5],
  ['Seçili segment / yüzey (ayırt edilebilirlik)', 'c-seg-on-bg', 'c-surface', 3],
  ['Tonlu (ikincil) düğme', 'c-tonal-fg', 'c-tonal-bg', 7],
  ['Tonlu düğme (üstüne gelme)', 'c-tonal-fg', 'c-tonal-hover', 4.5],
  ['Başlık / tanıtım zemini', 'c-heading', 'c-hero-bg', 7],
  ['İkincil metin / tanıtım zemini', 'c-text-2', 'c-hero-bg', 4.5],
  ['Bağlantı / tanıtım zemini', 'c-link', 'c-hero-bg', 4.5],
  ['Form sınırı / tanıtım zemini', 'c-line-strong', 'c-hero-bg', 3],
  ['Az yoğun rozeti', 'c-low-fg', 'c-low-bg', 4.5],
  ['Orta yoğun rozeti', 'c-medium-fg', 'c-medium-bg', 4.5],
  ['Çok yoğun rozeti', 'c-high-fg', 'c-high-bg', 4.5],
  ['Güncel bilgi yok rozeti', 'c-stale-fg', 'c-stale-bg', 4.5],
  ['Bilgi zemini', 'c-info-fg', 'c-info-bg', 4.5],
  ['Uyarı zemini (hayati tehlike, hata)', 'c-warn-fg', 'c-warn-bg', 4.5],
  ['Ana metin / uyarı zemini', 'c-text', 'c-warn-bg', 4.5],
  ['İkincil metin / uyarı zemini (hata kutusu)', 'c-text-2', 'c-warn-bg', 4.5],
  ['İkincil metin / bilgi zemini', 'c-text-2', 'c-info-bg', 4.5],
  ['Örnek veri bandı', 'c-sample-fg', 'c-sample-bg', 4.5],
  ['Çevrimdışı bandı', 'c-offline-fg', 'c-offline-bg', 4.5],
  ['Altbilgi yazısı', 'c-footer-fg', 'c-footer-bg', 4.5],
  ['Altbilgi ikincil yazı', 'c-footer-fg-2', 'c-footer-bg', 4.5],
  ['İşaretçi/sıra: az yoğun', 'c-on-primary', 'c-low-solid', 4.5],
  ['İşaretçi/sıra: orta yoğun', 'c-on-primary', 'c-medium-solid', 4.5],
  ['İşaretçi/sıra: çok yoğun', 'c-on-primary', 'c-high-solid', 4.5],
  ['İşaretçi/sıra: güncel bilgi yok', 'c-on-primary', 'c-stale-solid', 4.5],
  ['Form sınırı / yüzey', 'c-line-strong', 'c-surface', 3],
  ['Form sınırı / zemin', 'c-line-strong', 'c-bg', 3],
  ['Seçili sınır, öneri kutusu / yüzey', 'c-selected-line', 'c-surface', 3],
  ['Odak halkası / yüzey', 'c-focus', 'c-surface', 3],
  ['Odak halkası / zemin', 'c-focus', 'c-bg', 3],
  ['Hayati tehlike kutusu sınırı / zemin', 'c-danger-line', 'c-bg', 3],
  ['Durum şeridi/halka az / yüzey', 'c-low-line', 'c-surface', 3],
  ['Durum şeridi/halka orta / yüzey', 'c-medium-line', 'c-surface', 3],
  ['Durum şeridi/halka çok / yüzey', 'c-high-line', 'c-surface', 3],
  ['Durum şeridi eski / yüzey', 'c-stale-line', 'c-surface', 3],
  ['Seçili çip sınırı az / az zemini', 'c-low-line', 'c-low-bg', 3],
  ['Seçili çip sınırı orta / orta zemini', 'c-medium-line', 'c-medium-bg', 3],
  ['Seçili çip sınırı çok / çok zemini', 'c-high-line', 'c-high-bg', 3]
];

function readBlock(css, startPattern) {
  const start = css.search(startPattern);
  if (start === -1) return {};
  const open = css.indexOf('{', css.indexOf(':root', start));
  const close = css.indexOf('}', open);
  const vars = {};
  const re = /--([\w-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g;
  let m;
  const body = css.slice(open, close);
  while ((m = re.exec(body))) vars[m[1]] = m[2].toUpperCase();
  return vars;
}

function luminance(hex) {
  const channels = [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16) / 255; });
  const linear = channels.map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function evaluate(themeName, vars) {
  return PAIRS.map(function (pair) {
    const fg = vars[pair[1]];
    const bg = vars[pair[2]];
    if (!fg || !bg) return { theme: themeName, label: pair[0], fg: pair[1], bg: pair[2], ratio: 0, need: pair[3], ok: false, missing: true };
    const value = ratio(fg, bg);
    return { theme: themeName, label: pair[0], fgHex: fg, bgHex: bg, ratio: value, need: pair[3], ok: value >= pair[3] };
  });
}

function main() {
  const css = fs.readFileSync(TOKENS, 'utf8');
  const light = readBlock(css, /^:root\s*\{/m);
  const dark = Object.assign({}, light, readBlock(css, /@media \(prefers-color-scheme: dark\)/));
  const results = evaluate('Açık', light).concat(evaluate('Koyu', dark));
  const markdown = process.argv.indexOf('--markdown') !== -1;
  if (markdown) {
    console.log('| Tema | Çift | Ön plan | Arka plan | Oran | Gereken | Sonuç |');
    console.log('|---|---|---|---|---|---|---|');
  }
  results.forEach(function (r) {
    const value = r.missing ? 'jeton yok' : r.ratio.toFixed(2) + ':1';
    if (markdown) console.log('| ' + [r.theme, r.label, r.fgHex || r.fg, r.bgHex || r.bg, value, r.need + ':1', r.ok ? 'Geçti' : 'KALDI'].join(' | ') + ' |');
    else console.log((r.ok ? 'GEÇTİ ' : 'KALDI ') + r.theme.padEnd(5) + ' ' + r.label.padEnd(40) + ' ' + value.padStart(9) + '  (≥ ' + r.need + ')');
  });
  const failed = results.filter(function (r) { return !r.ok; });
  if (!markdown) console.log('\n' + (results.length - failed.length) + '/' + results.length + ' çift eşiği geçti.');
  process.exitCode = failed.length > 0 ? 1 : 0;
}

main();

/* =============================================================================
 * panel/js/csv.js
 * NE İŞE YARAR : Tabloları CSV dosyasına çevirir ve indirir. Türkçe Excel'de
 *                doğru açılsın diye noktalı virgül ayırıcı ve UTF-8 BOM kullanır.
 * VERDİĞİ      : AcilRadar.Panel.Csv → build(columns, rows), download(fileName, content),
 *                fileName(kind, scope, dateText)
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: ayırıcı ve dosya adı öneki: panel/js/config.js › CSV
 * NOT (GÜVENLİK): "=", "+", "-", "@" ile başlayan hücreler başına ' eklenerek yazılır;
 *      böylece tablo programında formül olarak çalıştırılamaz (CSV enjeksiyonu).
 * ========================================================================== */
(function (AR) {
  'use strict';

  const cfg = AR.Panel.Config;
  const BOM = '﻿';
  const LINE_END = '\r\n';
  const FORMULA_START = /^[=+\-@\t\r]/;

  function cell(value) {
    let text = value === null || value === undefined ? '' : String(value);
    if (FORMULA_START.test(text)) text = '\'' + text;
    const needsQuotes = text.indexOf(cfg.CSV.SEPARATOR) !== -1 || /["\r\n]/.test(text) || text !== text.trim();
    return needsQuotes ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  /**
   * @param {{label:string, value:function(Object):*}[]} columns
   * @param {Object[]} rows
   * @returns {string}
   */
  function build(columns, rows) {
    const lines = [columns.map(function (c) { return cell(c.label); }).join(cfg.CSV.SEPARATOR)];
    rows.forEach(function (row) {
      lines.push(columns.map(function (c) { return cell(c.value(row)); }).join(cfg.CSV.SEPARATOR));
    });
    return BOM + lines.join(LINE_END) + LINE_END;
  }

  /** "acilradar-kayitlar-ornek-01-2026-10-12.csv" (güvenli karakterler) */
  function fileName(kind, scope, dateText) {
    return [cfg.CSV.FILE_PREFIX, kind, scope, dateText].filter(Boolean).join('-').replace(/[^A-Za-z0-9_.-]/g, '_') + '.csv';
  }

  /** Tarayıcıya dosyayı indirtir (sunucuya bir şey gönderilmez). */
  function download(name, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  AR.Panel.Csv = Object.freeze({ build: build, download: download, fileName: fileName });
})(window.AcilRadar = window.AcilRadar || {});

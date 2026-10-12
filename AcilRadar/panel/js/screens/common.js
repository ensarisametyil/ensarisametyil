/* =============================================================================
 * panel/js/screens/common.js
 * NE İŞE YARAR : Ekranların ortak yardımcıları: hata kodu → Türkçe metin, tüm
 *                sayfaları toplayıp CSV'ye hazırlama, bugünün tarihi (dosya adı için).
 * VERDİĞİ      : AcilRadar.Panel.Screens.common
 * NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK: CSV satır sınırı → panel/js/config.js › EXPORT_MAX_ROWS
 * ========================================================================== */
(function (AR) {
  'use strict';

  const t = AR.Strings.text;
  const cfg = AR.Panel.Config;

  function errorMessage(code) {
    return t(AR.Strings.has('panel.errors.codes.' + code) ? 'panel.errors.codes.' + code : 'panel.errors.codes.UNKNOWN');
  }

  /**
   * Sayfaları sırayla çeker (EXPORT_PAGE_SIZE'lık), EXPORT_MAX_ROWS'ta durur.
   * @param {function(number, number):Promise<{items:Object[], pages:number}>} fetchPage (sayfa, boyut)
   * @returns {Promise<{rows:Object[], limited:boolean}>}
   */
  async function collectAllPages(fetchPage) {
    const rows = [];
    for (let page = 1; ; page += 1) {
      const result = await fetchPage(page, cfg.EXPORT_PAGE_SIZE);
      Array.prototype.push.apply(rows, result.items);
      if (rows.length >= cfg.EXPORT_MAX_ROWS) return { rows: rows.slice(0, cfg.EXPORT_MAX_ROWS), limited: true };
      if (page >= result.pages || result.items.length === 0) return { rows: rows, limited: false };
    }
  }

  /** CSV indirme akışı: düğme kilitlenir, bitince sonuç bildirilir. */
  function runExport(button, fetchPage, columns, fileName) {
    const F = AR.Panel.UI.form;
    F.setBusy(button, true);
    return collectAllPages(fetchPage).then(function (result) {
      AR.Panel.Csv.download(fileName, AR.Panel.Csv.build(columns, result.rows));
      AR.Panel.UI.shell.notify('success', result.limited
        ? t('panel.common.exportLimited', { max: AR.Strings.format.number(cfg.EXPORT_MAX_ROWS) })
        : t('panel.common.exported', { count: AR.Strings.format.number(result.rows.length) }));
    }).catch(function (error) {
      if (error.code !== 'UNAUTHORIZED') AR.Panel.UI.shell.notify('error', errorMessage(error.code));
    }).then(function () {
      F.setBusy(button, false);
    });
  }

  /** "2026-10-12" (Türkiye saatine göre bugün) */
  function todayText(nowMs) {
    // NOT: 'en-CA' biçimi YYYY-AA-GG verir; yalnız dosya adı içindir (kullanıcıya gösterilmez).
    return new Intl.DateTimeFormat('en-CA', { timeZone: AR.Config.TIME_ZONE }).format(new Date(nowMs));
  }

  /** Sayfa numarasını güvenle okur. */
  function pageParam(value) {
    const page = parseInt(value, 10);
    return Number.isFinite(page) && page > 0 ? page : 1;
  }

  AR.Panel.Screens = AR.Panel.Screens || {};
  AR.Panel.Screens.common = Object.freeze({
    errorMessage: errorMessage,
    collectAllPages: collectAllPages,
    runExport: runExport,
    todayText: todayText,
    pageParam: pageParam
  });
})(window.AcilRadar = window.AcilRadar || {});

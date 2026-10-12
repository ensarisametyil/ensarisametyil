/* =============================================================================
 * tests/unit/browser-runner.js
 * NE İŞE YARAR : tests/unit.html için çalıştırıcı. Sonucu sayfaya yazar ve
 *                document.body.dataset.result = "pass" | "fail" yapar (otomasyon için).
 * ========================================================================== */
(function () {
  'use strict';

  function deepEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  const assert = {
    ok: function (value, message) { if (!value) throw new Error(message || 'koşul sağlanmadı'); },
    equal: function (a, b, message) { if (a !== b) throw new Error((message || 'eşit değil') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); },
    deepEqual: function (a, b, message) { if (!deepEqual(a, b)) throw new Error((message || 'eşit değil') + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b)); }
  };

  function report(name, error) {
    const item = document.createElement('li');
    item.textContent = (error ? '✘ ' : '✔ ') + name + (error ? ' → ' + error.message : '');
    item.className = error ? 'field-status--warning' : '';
    document.getElementById('results').appendChild(item);
  }

  async function main() {
    const original = console.warn;
    console.warn = function () {};
    let failed = 0;
    for (const testCase of window.AcilRadarTests) {
      try {
        await testCase.run(window.AcilRadar, assert);
        report(testCase.name, null);
      } catch (error) {
        failed += 1;
        report(testCase.name, error);
      }
    }
    console.warn = original;
    const total = window.AcilRadarTests.length;
    document.getElementById('summary').textContent = (total - failed) + ' geçti, ' + failed + ' kaldı (toplam ' + total + ').';
    document.body.dataset.result = failed ? 'fail' : 'pass';
  }

  main();
})();

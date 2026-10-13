#!/usr/bin/env node
/* =============================================================================
 * motor/tools/report.js
 * NE İŞE YARAR : Geriye dönük test çıktısını (motor/out/backtest.json) ve test
 *   sonuçlarını (motor/out/test-results.json) TEK bir Türkçe Markdown rapora yazar:
 *   motor/docs/DOGRULAMA_RAPORU.md
 * KULLANIM: node motor/tools/report.js [backtest.json yolu]
 * KURAL: Sonuç SEÇİLMEZ — kötü çıkan ölçüler de yazılır. Her sayı "sentetik" etiketlidir.
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'out');
const DOC = path.join(__dirname, '..', 'docs', 'DOGRULAMA_RAPORU.md');
const METHODS = ['engine', 'engine-raw', 'persistence', 'seasonal', 'ses', 'naive'];
const METHOD_NAME = { engine: 'Motor (kalibre)', 'engine-raw': 'Motor (ham)', persistence: '(a) Süreklilik', seasonal: '(b) Mevsimsel saf', ses: '(c) Üstel düzeltme', naive: '(n) Bugünkü formül' };
const BENCHMARKS = ['persistence', 'seasonal', 'ses', 'naive'];
const HORIZON_NAME = { 0: 'şimdi', 30: '+30 dk', 60: '+60 dk', 120: '+120 dk', 180: '+180 dk', 240: '+240 dk', evening: 'akşam 20:00' };
const TARGET_NAME = { occupancy: 'Doluluk (puan)', waitGreen: 'Yeşil bekleme (dk)', waitYellow: 'Sarı bekleme (dk)' };
const V1 = { mae: 22.3, coverage: 0.76, occ: { 60: 6.9, 120: 10.0, 240: 12.7 }, level: { 60: 0.86, 120: 0.83, 240: 0.80 } };

const f1 = function (v) { return v === null || v === undefined || !isFinite(v) ? '—' : v.toFixed(1).replace('.', ','); };
const f2 = function (v) { return v === null || v === undefined || !isFinite(v) ? '—' : v.toFixed(2).replace('.', ','); };
const pct = function (v) { return v === null || v === undefined || !isFinite(v) ? '—' : '%' + Math.round(v * 100); };
const mean = function (a) { const b = a.filter(function (v) { return v !== null && v !== undefined && isFinite(v); }); return b.length ? b.reduce(function (x, y) { return x + y; }, 0) / b.length : null; };

/** Tohumlar arası: ortalama [en az–en çok] */
function spread(values, fmt) {
  const v = values.filter(function (x) { return x !== null && x !== undefined && isFinite(x); });
  if (!v.length) return '—';
  const m = mean(v);
  if (v.length === 1) return fmt(m);
  return fmt(m) + ' [' + fmt(Math.min.apply(null, v)) + '–' + fmt(Math.max.apply(null, v)) + ']';
}

function metricOf(run, method, target, horizon, field) {
  const m = run.summary.overall[method + '|' + target + '|' + horizon];
  return m ? m[field] : null;
}

function table(head, rows) {
  return ['| ' + head.join(' | ') + ' |', '|' + head.map(function () { return '---'; }).join('|') + '|'].concat(rows.map(function (r) { return '| ' + r.join(' | ') + ' |'; })).join('\n');
}

function byRegime(runs) {
  const g = {};
  runs.forEach(function (r) { (g[r.regime] = g[r.regime] || []).push(r); });
  return g;
}

/* ---- Bölümler ------------------------------------------------------------------------ */

function verdictSection(regimeRuns, target, horizons) {
  const rows = [];
  horizons.forEach(function (h) {
    const methods = BENCHMARKS.filter(function (m) { return metricOf(regimeRuns[0], m, target, h, 'mae') !== null && metricOf(regimeRuns[0], m, target, h, 'mae') !== undefined; });
    if (!methods.length) return;
    const meanMae = function (m) { return mean(regimeRuns.map(function (r) { return metricOf(r, m, target, h, 'mae'); })); };
    const best = methods.slice().sort(function (a, b) { return meanMae(a) - meanMae(b); })[0];
    const diffs = regimeRuns.map(function (r) { return metricOf(r, best, target, h, 'mae') - metricOf(r, 'engine', target, h, 'mae'); });
    const wins = diffs.filter(function (d) { return d > 0; }).length;
    const n = diffs.length;
    const md = mean(diffs);
    let verdict;
    if (wins === n && md >= 1 && n >= 5) verdict = '**Motor tutarlı üstün** (' + wins + '/' + n + ' tohum; tek yönlü işaret testi p = ' + f2(Math.pow(0.5, n)) + ')';
    else if (wins === 0 && n >= 2) verdict = '**Motor daha kötü** → bu ufukta ' + METHOD_NAME[best] + ' kullanılmalı';
    else if (md > 0) verdict = 'Motor ortalamada iyi ama tutarlı değil (' + wins + '/' + n + ')';
    else verdict = 'Anlamlı fark yok / motor geride (' + wins + '/' + n + ') → ' + METHOD_NAME[best] + ' yeterli';
    rows.push([HORIZON_NAME[h] || h, METHOD_NAME[best], spread(regimeRuns.map(function (r) { return metricOf(r, best, target, h, 'mae'); }), f1),
      spread(regimeRuns.map(function (r) { return metricOf(r, 'engine', target, h, 'mae'); }), f1), f1(md), verdict]);
  });
  return table(['Ufuk', 'En iyi kıyas', 'Kıyas MAE', 'Motor MAE', 'Fark (kıyas − motor)', 'Karar'], rows);
}

function maeTable(regimeRuns, target, horizons, field) {
  const fmt = field === 'coverage' || field === 'levelAccuracy' ? pct : f1;
  const methods = METHODS.filter(function (m) { return regimeRuns[0].summary.overall[m + '|' + target + '|' + horizons[0]]; });
  return table(['Yöntem'].concat(horizons.map(function (h) { return HORIZON_NAME[h] || h; })), methods.map(function (m) {
    return [METHOD_NAME[m]].concat(horizons.map(function (h) { return spread(regimeRuns.map(function (r) { return metricOf(r, m, target, h, field); }), fmt); }));
  }));
}

function detailTable(regimeRuns, target, horizons) {
  const fields = [['mae', 'MAE', f1], ['rmse', 'RMSE', f1], ['bias', 'Sapma', f1], ['pinball10', 'Pinball 0,1', f2], ['pinball50', 'Pinball 0,5', f2],
    ['pinball90', 'Pinball 0,9', f2], ['coverage', '%80 aralık kapsaması', pct], ['width', 'Aralık genişliği', f1]];
  if (target === 'occupancy') fields.push(['levelAccuracy', 'Seviye doğruluğu', pct]);
  return table(['Ölçü (motor, kalibre)'].concat(horizons.map(function (h) { return HORIZON_NAME[h] || h; })), fields.map(function (f) {
    return [f[1]].concat(horizons.map(function (h) { return spread(regimeRuns.map(function (r) { return metricOf(r, 'engine', target, h, f[0]); }), f[2]); }));
  }));
}

function confusion(regimeRuns, horizon) {
  const sum = { low: { low: 0, medium: 0, high: 0 }, medium: { low: 0, medium: 0, high: 0 }, high: { low: 0, medium: 0, high: 0 } };
  regimeRuns.forEach(function (r) {
    const m = r.summary.overall['engine|occupancy|' + horizon];
    if (!m) return;
    Object.keys(sum).forEach(function (t) { Object.keys(sum[t]).forEach(function (p) { sum[t][p] += m.confusion[t][p]; }); });
  });
  const names = { low: 'az', medium: 'orta', high: 'çok' };
  return table(['Gerçek ↓ / Tahmin →', 'az', 'orta', 'çok'], Object.keys(sum).map(function (t) { return [names[t], sum[t].low, sum[t].medium, sum[t].high]; }));
}

function reliabilityTable(regimeRuns, horizon) {
  const bins = regimeRuns[0].summary.reliability[horizon].map(function (b, i) {
    const all = regimeRuns.map(function (r) { return r.summary.reliability[horizon][i]; });
    const n = all.reduce(function (a, x) { return a + x.n; }, 0);
    const w = function (k) { const s = all.reduce(function (a, x) { return a + (x[k] || 0) * x.n; }, 0); return n ? s / n : null; };
    return [f2(b.from) + '–' + f2(b.to), n, pct(w('predicted')), pct(w('observed'))];
  });
  return table(['"Çok yoğun" olasılığı (tahmin)', 'n', 'Ortalama tahmin', 'Gerçekleşen oran'], bins);
}

function segmentTable(regimeRuns) {
  const segs = [['heavy=true', 'Ağır yük (ρ ≥ 0,85)'], ['heavy=false', 'Hafif yük (ρ < 0,85)'], ['weekend=false', 'Hafta içi'], ['weekend=true', 'Hafta sonu'], ['night=false', 'Gündüz'], ['night=true', 'Gece (22–08)']];
  const rows = [];
  segs.forEach(function (s) {
    ['occupancy', 'waitGreen'].forEach(function (t) {
      const get = function (m, f) { return regimeRuns.map(function (r) { const x = r.summary.segments[s[0] + '|' + m + '|' + t + '|120']; return x ? x[f] : null; }); };
      rows.push([s[1], TARGET_NAME[t], spread(get('engine', 'n'), function (v) { return String(Math.round(v)); }), spread(get('engine', 'mae'), f1), spread(get('engine', 'bias'), f1),
        spread(get('engine', 'coverage'), pct), spread(get('seasonal', 'mae'), f1), spread(get('persistence', 'mae'), f1)]);
    });
  });
  return table(['Kesit (+120 dk)', 'Hedef', 'n', 'Motor MAE', 'Motor sapma', 'Motor kapsama', 'Mevsimsel MAE', 'Süreklilik MAE'], rows);
}

function thresholdTable(regimeRuns) {
  return table(['Eşikler (orta/çok)', 'Seviye doğruluğu (+120 dk)', 'Gerçek dağılım az / orta / çok'], ['45/75', '50/80', '55/85'].map(function (id) {
    const acc = regimeRuns.map(function (r) { return r.summary.thresholds[id].levelAccuracy; });
    const ts = function (k) { return mean(regimeRuns.map(function (r) { return r.summary.thresholds[id].truthShare[k]; })); };
    return [id + (id === '50/80' ? ' (kullanılan)' : ''), spread(acc, pct), pct(ts('low')) + ' / ' + pct(ts('medium')) + ' / ' + pct(ts('high'))];
  }));
}

function eveningTable(regimeRuns) {
  const rows = [];
  ['simulated', 'seasonal'].forEach(function (mode) {
    ['engine', 'seasonal', 'persistence'].forEach(function (m) {
      const get = function (f) { return regimeRuns.map(function (r) { const x = r.summary.evening[mode + '|' + m + '|occupancy']; return x ? x[f] : null; }); };
      rows.push([mode === 'simulated' ? 'benzetim (≤ 8 sa önce)' : 'mevsimsel öncül (> 8 sa önce)', METHOD_NAME[m], spread(get('n'), function (v) { return String(Math.round(v)); }), spread(get('mae'), f1), spread(get('coverage'), pct)]);
    });
  });
  return table(['Akşam tahmin türü', 'Yöntem', 'n', 'Doluluk MAE', 'Kapsama'], rows);
}

function ablationTable(data) {
  const base = {};
  data.runs.forEach(function (r) { base[r.regime + '/' + r.seed] = r; });
  const variants = {};
  data.ablations.forEach(function (a) { (variants[a.variant] = variants[a.variant] || []).push(a); });
  const rows = [];
  Object.keys(variants).forEach(function (v) {
    ['A', 'B', 'C'].forEach(function (rg) {
      const list = variants[v].filter(function (a) { return a.regime === rg; });
      if (!list.length) return;
      const d = function (target, field) {
        return list.map(function (a) { const b = base[rg + '/' + a.seed]; return metricOf(a, 'engine', target, '120', field) - metricOf(b, 'engine', target, '120', field); });
      };
      rows.push([v, rg, spread(d('occupancy', 'mae'), f1), spread(d('occupancy', 'coverage').map(function (x) { return x * 100; }), f1), spread(d('waitGreen', 'mae'), f1)]);
    });
  });
  return table(['Kapatılan bileşen', 'Rejim', 'Δ doluluk MAE (+120)', 'Δ kapsama (puan)', 'Δ yeşil bekleme MAE (+120)'], rows) +
    '\n\nΔ = (bileşen KAPALI) − (tam motor), aynı tohumlar (1, 2). **Pozitif Δ MAE → bileşen işe yarıyor** (kapatınca hata artıyor). Negatif ya da ≈ 0 → ölçülebilir kazanç yok.';
}

function driftLine(regimeRuns) {
  let alarms = 0;
  let total = 0;
  regimeRuns.forEach(function (r) { Object.keys(r.summary.drift).forEach(function (k) { total += 1; if (r.summary.drift[k].alarm) alarms += 1; }); });
  return alarms + ' / ' + total + ' hastane serisinde Page-Hinkley alarmı (+120 dk mutlak doluluk hatası, sınama dönemi).';
}

function tierTable(regimeRuns) {
  const tiers = ['full', 'partial', 'seasonal'];
  const names = { full: 'tam', partial: 'kısmi', seasonal: 'yalnız mevsimsel' };
  return table(['Düşüş basamağı', 'n', 'Doluluk MAE (+120)', 'Kapsama'], tiers.map(function (t) {
    const get = function (f) { return regimeRuns.map(function (r) { return r.summary.tiers[t] ? r.summary.tiers[t][f] : null; }); };
    return [names[t], spread(get('n'), function (v) { return String(Math.round(v)); }), spread(get('mae'), f1), spread(get('coverage'), pct)];
  }));
}

/* ---- Rapor ------------------------------------------------------------------------------ */

function build(data, tests) {
  const groups = byRegime(data.runs);
  const out = [];
  out.push('# Doluluk motoru · Doğrulama raporu (SENTETİK)');
  out.push('');
  out.push('> **Bu rapordaki bütün sayılar SENTETİK rejimlerde ölçülmüştür. Gerçek dünyadaki doğruluk bilinmiyor; gerçek doğrulama gölge mod pilotunda yapılacaktır (PILOT_PROTOKOLU.md).** Sonuçlar seçilmemiştir: kötü çıkan ölçüler de yazılıdır.');
  out.push('');
  out.push('- Üretim: `node motor/tools/backtest.js` → `node motor/tools/report.js` · Tarih: ' + data.when.slice(0, 10) + ' · Model ' + data.modelVersion + ' · Geriye dönük testte motor en çok ' + data.engineRuns + ' benzetim kullandı (üründe 1500).');
  out.push('- Tohumlar: her rejimde ' + groups[Object.keys(groups)[0]].length + ' tohum. Tablolarda **ortalama [en az–en çok]** (tohumlar arası).');
  out.push('- Dönemler zamanda ayrıdır: geçmiş (yalnız öğrenme) → ayar (conformal + sapma düzeltmesi + kıyas aralıkları) → **sınama (tüm ölçüler)**. Hiçbir ayar sınama verisine bakılarak yapılmadı.');
  out.push('- Yöntemler: ' + METHODS.map(function (m) { return METHOD_NAME[m]; }).join(', ') + '. (d) v1 motoru depoda bulunmadığı için kıyaslanamadı.');
  out.push('');
  out.push('## Rejimler');
  out.push('');
  out.push(table(['Rejim', 'Açıklama', 'Ortalama gerçek doluluk', 'Ağır yük payı (ρ ≥ 0,85)'], Object.keys(groups).map(function (rg) {
    const loads = []; const heavy = [];
    groups[rg].forEach(function (r) { r.loads.forEach(function (l) { loads.push(l.meanOccupancy); heavy.push(l.heavyShare); }); });
    return [rg, data.regimes[rg].name, f1(mean(loads)), pct(mean(heavy))];
  })));
  out.push('');
  out.push('Rejim A motorun kendi model ailesindendir (parametreleri farklı) → **döngüsel kontrol**; B, C, D motorun bilmediği mekanizmalar içerir. Asıl kanıt B–D\'dir.');
  out.push('');

  Object.keys(groups).forEach(function (rg) {
    const runs = groups[rg];
    out.push('## Rejim ' + rg + ' — ' + data.regimes[rg].name);
    out.push('');
    out.push('### Şampiyon–meydan okuyan kararı (doluluk)');
    out.push('');
    out.push(verdictSection(runs, 'occupancy', ['30', '60', '120', '180', '240', 'evening']));
    out.push('');
    out.push('### Şampiyon–meydan okuyan kararı (yeşil bekleme)');
    out.push('');
    out.push(verdictSection(runs, 'waitGreen', ['0', '60', '120', '240', 'evening']));
    out.push('');
    out.push('### Doluluk MAE (puan)');
    out.push('');
    out.push(maeTable(runs, 'occupancy', ['0', '30', '60', '120', '180', '240', 'evening'], 'mae'));
    out.push('');
    out.push('### Doluluk — %80 aralık kapsaması (hedef %78–82)');
    out.push('');
    out.push(maeTable(runs, 'occupancy', ['30', '60', '120', '180', '240', 'evening'], 'coverage'));
    out.push('');
    out.push('### Doluluk — seviye doğruluğu (az/orta/çok)');
    out.push('');
    out.push(maeTable(runs, 'occupancy', ['30', '60', '120', '180', '240', 'evening'], 'levelAccuracy'));
    out.push('');
    out.push('### Motorun tüm ölçüleri — doluluk');
    out.push('');
    out.push(detailTable(runs, 'occupancy', ['0', '30', '60', '120', '180', '240', 'evening']));
    out.push('');
    out.push('### Bekleme süresi MAE (dk)');
    out.push('');
    out.push('**Yeşil (acil olmayan):**');
    out.push('');
    out.push(maeTable(runs, 'waitGreen', ['0', '60', '120', '240', 'evening'], 'mae'));
    out.push('');
    out.push('**Sarı (daha acil):**');
    out.push('');
    out.push(maeTable(runs, 'waitYellow', ['0', '60', '120', '240', 'evening'], 'mae'));
    out.push('');
    out.push('### Motorun tüm ölçüleri — yeşil bekleme');
    out.push('');
    out.push(detailTable(runs, 'waitGreen', ['0', '60', '120', '240', 'evening']));
    out.push('');
    out.push('### Karışıklık matrisi (+120 dk, tohumlar toplamı)');
    out.push('');
    out.push(confusion(runs, '120'));
    out.push('');
    out.push('### Güvenilirlik tablosu (+120 dk)');
    out.push('');
    out.push(reliabilityTable(runs, '120'));
    out.push('');
    out.push('### Kesitler: ağır/hafif yük, hafta içi/sonu, gece/gündüz');
    out.push('');
    out.push(segmentTable(runs));
    out.push('');
    out.push('### Seviye eşiği hassasiyeti (±5 puan)');
    out.push('');
    out.push(thresholdTable(runs));
    out.push('');
    out.push('### Akşam 20:00: benzetim mi, mevsimsel öncül mü?');
    out.push('');
    out.push(eveningTable(runs));
    out.push('');
    out.push('### Düşüş basamakları');
    out.push('');
    out.push(tierTable(runs));
    out.push('');
    out.push('**Kayma denetimi:** ' + driftLine(runs));
    out.push('');
  });

  if (data.ablations && data.ablations.length) {
    out.push('## Bileşen kapatma deneyleri (karmaşıklık hak ediliyor mu?)');
    out.push('');
    out.push(ablationTable(data));
    out.push('');
  }

  out.push('## v1 referans değerleriyle karşılaştırma');
  out.push('');
  out.push('v1 bu depoda yok; aşağıdaki v1 sayıları görevde bildirilen, **doğrulanmamış** değerlerdir ve farklı bir sentetik dünyada, farklı tanımlarla ölçülmüş olabilir. **Doğrudan kıyas geçerli değildir**; yalnız büyüklük fikri vermek için yan yana yazılmıştır.');
  out.push('');
  const allRuns = data.runs.filter(function (r) { return r.regime !== 'D'; });
  out.push(table(['Ölçü', 'v1 (bildirilen)', 'v2 (A–C ortalaması, sentetik)'], [
    ['Doluluk hatası +60 dk (MAE, puan)', f1(V1.occ[60]), f1(mean(allRuns.map(function (r) { return metricOf(r, 'engine', 'occupancy', '60', 'mae'); })))],
    ['Doluluk hatası +120 dk', f1(V1.occ[120]), f1(mean(allRuns.map(function (r) { return metricOf(r, 'engine', 'occupancy', '120', 'mae'); })))],
    ['Doluluk hatası +240 dk', f1(V1.occ[240]), f1(mean(allRuns.map(function (r) { return metricOf(r, 'engine', 'occupancy', '240', 'mae'); })))],
    ['Doğru seviye +60 / +120 / +240', pct(V1.level[60]) + ' / ' + pct(V1.level[120]) + ' / ' + pct(V1.level[240]), ['60', '120', '240'].map(function (h) { return pct(mean(allRuns.map(function (r) { return metricOf(r, 'engine', 'occupancy', h, 'levelAccuracy'); }))); }).join(' / ')],
    ['Bekleme MAE (yeşil, +120 dk)', f1(V1.mae) + ' (tanımı bilinmiyor)', f1(mean(allRuns.map(function (r) { return metricOf(r, 'engine', 'waitGreen', '120', 'mae'); })))],
    ['%80 aralık kapsaması (doluluk +120)', pct(V1.coverage), pct(mean(allRuns.map(function (r) { return metricOf(r, 'engine', 'occupancy', '120', 'coverage'); })))]
  ]));
  out.push('');

  if (tests) {
    const failed = tests.results.filter(function (r) { return !r.ok; }).length;
    out.push('## Otomatik testler');
    out.push('');
    out.push('`node motor/tests/run-all.js` → **' + (tests.results.length - failed) + ' geçti, ' + failed + ' kaldı** (Node ' + tests.node + ').');
    out.push('');
    if (tests.perf && Object.keys(tests.perf).length) {
      out.push(table(['Performans ölçümü', 'p50 (ms)', 'p95 (ms)', 'en çok (ms)', 'n'], Object.keys(tests.perf).map(function (k) { const p = tests.perf[k]; return [k, p.p50, p.p95, p.max, p.n]; })));
      out.push('');
      out.push('Bütçe: tek hastane p95 ≤ 250 ms (Node). Süreler bu geliştirme makinesinde ölçülmüştür; sunucu donanımında yeniden ölçülmelidir.');
      out.push('');
    }
  }
  return out.join('\n') + '\n';
}

function main() {
  const file = process.argv[2] || path.join(OUT, 'backtest.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const testsFile = path.join(OUT, 'test-results.json');
  const tests = fs.existsSync(testsFile) ? JSON.parse(fs.readFileSync(testsFile, 'utf8')) : null;
  fs.writeFileSync(DOC, build(data, tests));
  console.log('Yazıldı: motor/docs/DOGRULAMA_RAPORU.md');
}

if (require.main === module) main();
module.exports = { build: build };

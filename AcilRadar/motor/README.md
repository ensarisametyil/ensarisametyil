# AcilRadar · Doluluk hesaplama motoru (v2)

Acil servislerin **tahmini** doluluk yüzdesini, doluluk seviyesini (az/orta/çok) ve bekleme aralıklarını şimdi, +2 saat ve akşam 20:00 için üretir. Her sayı bir **tahmindir**; ölçülmüş gibi sunulamaz. **Tıbbi karar aracı değildir.**

> Doğruluk durumu: motor yalnız **sentetik rejimlerde** sınanmıştır (`docs/DOGRULAMA_RAPORU.md`). Gerçek dünyadaki doğruluk bilinmiyor; gölge mod pilotunda ölçülecektir (`docs/PILOT_PROTOKOLU.md`).

## Hızlı başlangıç

```bash
node motor/tests/run-all.js                 # tüm testler (birim, özellik, altın dosya, dayanıklılık, performans)
node motor/tools/backtest.js --quick        # hızlı geriye dönük test (2 tohum)
node motor/tools/backtest.js                # tam geriye dönük test (4 rejim × 5 tohum + kapatma deneyleri, ~30 dk)
node motor/tools/report.js                  # → motor/docs/DOGRULAMA_RAPORU.md
node motor/tools/backtest.js --csv veri.csv # gerçek veriyle aynı rapor (şema: docs/VERI_GEREKSINIMLERI.md)
node tools/mock-server.js                   # örnek API, sayılar motordan (kapatmak için --engine=off)
```

```js
const engine = require('./motor/core/index.js');
const result = engine.computeHospital({
  hospitalId: 'ornek-01', updatedAt: '2026-10-13T13:55:00+03:00', dataSource: 'hospital',
  activePhysicians: 6, greenWaiting: 20, yellowWaiting: 6, boarding: 2, bedCapacity: 30, arrivalsLastHour: 14
}, { nowMs: Date.parse('2026-10-13T14:00:00+03:00') });
engine.toContract(result, '2h');   // EK-1 alanları + 1.2 isteğe bağlı alanlar
```

Tarayıcıda: `motor/core/*.js` dosyaları sırayla klasik `<script>` olarak yüklenir (`config, holidays, rng, time, quality, demand, service, queue, occupancy, forecast, calibrate, explain, fallback, index`) → `window.AcilRadarMotor.engine`. Ağır iş için Web Worker: `motor/tools/worker.js`.

## Mimari

| Dosya | Görev |
|---|---|
| `core/config.js` | Tüm ayarlar ve eşikler; birim ve gerekçe yanında. `DOĞRULANMALI` etiketliler varsayımdır |
| `core/rng.js` | Tohumlu üreteç (sfc32) + üstel, normal, log-normal, gamma, Poisson |
| `core/time.js`, `core/holidays.js` | Sabit UTC+3, akşam 20:00, resmî tatil / dini bayram / arife / bayram ertesi (veri dosyası, doğrulama düzeyli) |
| `core/quality.js` | Doğrulama, bayatlık, aykırı değer (sınırla + uyarı), eksik alan, güven düzeyi |
| `core/demand.js` | Başvuru hızı: saat-hafta örüntüsü, hiyerarşik Gamma-Poisson büzülme, gün türü etkisi, CUSUM ani artış |
| `core/service.js` | Sınıf başına log-normal muayene süresi, vardiya çizelgesi |
| `core/queue.js` | Olay güdümlü benzetim: 3 triyaj sınıfı, müdahalesiz öncelik, vazgeçme, yatak tıkanması, sıfır süreli ölçüm hastası |
| `core/occupancy.js` | Kapasite tabanlı doluluk; seviye; yüzdelikler. Bileşik endeks **uygulanmadı** (gerekçe config'te) |
| `core/forecast.js` | Monte Carlo (uyarlamalı koşu sayısı), ufuklar, erken uyarı eğrisi |
| `core/calibrate.js` | Sapma düzeltmesi + split-conformal kalibrasyon, Page-Hinkley kayma denetimi |
| `core/explain.js` | Karşıolgusal etken katkıları, en çok 3 şablon cümle |
| `core/fallback.js` | Düşüş basamakları: tam → kısmi → mevsimsel → bilinmiyor |
| `core/index.js` | `computeHospital`, `computeRegion` (önbellek + zaman sınırı), `toContract` |
| `tools/simulator.js` | Motordan bağımsız sentetik dünya (4 rejim) |
| `tools/backtest.js` | Kayan başlangıçlı geriye dönük test, kıyas modelleri, CSV yolu |
| `tools/report.js` | Türkçe doğrulama raporu |
| `tools/mock-adapter.js` | Örnek API için motor bağlayıcısı |
| `tools/worker.js` | İsteğe bağlı Worker / worker_threads sarmalayıcısı |

Çekirdek **sıfır bağımlılıklı**, saf ES2018'dir. DOM'a, ağa ya da dosyaya erişmez ve saati kendisi okumaz; zaman her çağrıda `nowMs` olarak verilir. Test ve araçlar da bağımlılıksızdır. Yalnız Node yerleşik modüllerini (`fs`, `path`, `worker_threads`) kullanırlar. Özellik tabanlı testler için kütüphane yerine 40 satırlık tohumlu bir yardımcı yazıldı (`tests/lib/property.js`); böylece ağ ya da npm erişimi gerekmez.

## Sözleşme

Çıktı EK-1 alanlarını **aynen** üretir. İsteğe bağlı 1.2 alanları şunlardır:
- `occupancyRange`
- `overCapacityShare`
- `confidence`
- `factors`
- `modelVersion`
- `definition`
- `assumedFields`
- `simulated`

Ayrıntı: `../docs/SOZLESME.md` › Sürüm 1.2 eki, şema: `../docs/hospitals.schema.json`. 1.1 sürümü daha önce `ownership` alanı için kullanıldığından yeni alanlar **1.2** oldu.

## Belgeler

- `docs/MODEL_KARTI.md`: modelin ne yaptığı, sınırları, güven kuralları ve eşik gerekçeleri.
- `docs/DOGRULAMA_RAPORU.md`: sentetik geriye dönük test sonuçları; kötü çıkanlar dahil.
- `docs/VERI_GEREKSINIMLERI.md`: hastaneden istenecek en küçük veri seti ve KVKK notları.
- `docs/PILOT_PROTOKOLU.md`: gölge mod, süre, ölçüler ve karar eşikleri.
- `docs/DEGISIKLIK.md`: sürüm geçmişi.
- `docs/ASAMA-1-RAPORU.md`: keşif ve mimari önerisi.

## Altın dosya

`tests/golden/golden.json` sabit girdilerin çıktısıdır. Kasıtlı model değişikliğinde şu sıra izlenir:
1. `config.MODEL_VERSION` artırılır.
2. `node motor/tests/golden/update.js` çalıştırılır.
3. `docs/DEGISIKLIK.md` güncellenir.

Sürüm artmadan çıktı değişirse test kalır.

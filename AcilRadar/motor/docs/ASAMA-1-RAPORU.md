# Doluluk Hesaplama Motoru · Aşama 1 raporu (keşif ve mimari önerisi)

Tarih: 13.10.2026 · Durum: **onay bekliyor** · Bu aşamada kod yazılmadı.

## 1. Özet

1. **`varis-motoru/` (v1) bu çalışma ortamında YOK.** Proje klasörünü, diskin tamamını ve depodaki üç dalı (`claude/youthful-allen-mgnt6d`, `claude/cv-analysis-career-assistant-roevl3`, `claude/amazing-franklin-lnogta`) aradım: `varis-motoru`, `test.js`, `dogrulama.js` ve `dogrulama-doluluk.js` adlı dosya bulunamadı.
2. Bu yüzden v1 çalıştırılamadı; görevde verilen v1 referans değerleri (bekleme MAE 22,3 dk, kapsama %76, doluluk hatası 6,9/10,0/12,7 puan …) **yeniden üretilemedi ve doğrulanamadı**. Rapor bunları "dışarıdan bildirilmiş, doğrulanmamış" diye taşır.
3. Depoda bugün bir "motor" yok. Doluluk sayıları `js/mock-data.js` içindeki **tek satırlık bir örnek formülle** üretiliyor (aşağıda §3). Bu bir tahmin modeli değil, yalnızca arayüzü çalıştırmak için kullanılan örnek veri.
4. Görevin kuralına uyarak motor **sıfırdan, spesifikasyona göre** yazılacak. v1 dosyaları sonradan gelirse kıyas listesine (d) olarak eklenir.
5. Önerilen mimari §5'te, riskler §4'te, varsayımlar §7'de. **Sözleşme sürümüyle ilgili bir düzeltme var:** 1.1 sürümü zaten kullanıldı (`ownership` alanı), bu yüzden yeni isteğe bağlı alanlar **1.2** olarak eklenmeli (§4, R2).

## 2. Değişen / yeni dosyalar

| Dosya | Durum |
|---|---|
| `motor/docs/ASAMA-1-RAPORU.md` | Yeni (bu rapor) |

Başka bir dosya değişmedi.

## 3. Mevcut durum (yeniden üretilen "temel")

### 3.1 v1
Bulunamadı (bkz. §1). Görevdeki v1 sayıları:

| Ölçü (v1, sentetik, **doğrulanmadı**) | Değer |
|---|---|
| Bekleme süresi MAE | 22,3 dk (saf yöntem 32,9) |
| %80 aralık kapsaması | %76 |
| Doluluk hatası +60 / +120 / +240 dk | 6,9 / 10,0 / 12,7 puan |
| Doğru seviye oranı +60 / +120 / +240 dk | %86 / %83 / %80 |
| Bilinen zayıflık | ρ ≥ 0,85'te bekleme ≈ 20 dk iyimser |

Bu sayıların hangi sentetik dünyada, hangi tohumla ve hangi doluluk tanımıyla ölçüldüğü bilinmiyor. Bu yüzden v2 ile **doğrudan kıyaslanamazlar**. Kıyas yapılacaksa v1 klasörü gerekir.

### 3.2 Depodaki bugünkü hesap (`js/mock-data.js › buildHospital`)
```
yük       = sınırla(baseLoad × saatKatsayısı{şimdi 1, +2 sa 1,08, akşam 1,2} ± 0,08 gürültü, 0,05–1)
doluluk % = yuvarla(yük × 100)                          seviye: <50 az, 50–79 orta, ≥80 çok
yeşil bekleyen = yuvarla(yük × 48)
yeşil bekleme  = [b, b × 1,4]  (b = bekleyen / hekim × 9 dk)
sarı bekleme   = [5, 20] sabit
```
- Kuyruk, gelir hızı, hizmet süresi, belirsizlik ve kalibrasyon yok. Aralık genişliği sabit ×1,4 çarpanından geliyor, ölçülmüş değil.
- Ön yüz bu sayıları yalnızca gösteriyor; seviyeyi (`crowdingLevel`) sunucudan alıyor.
- Bayatlık eşiği `STALE_AFTER_MINUTES = 30` (`js/config.js`).
- Panel veri girişi şu alanları topluyor: doluluk %, yeşil/sarı bekleyen, hekim sayısı, iki bekleme aralığı.
- Panelde **olmayan** alanlar: son 1 saatteki başvuru, yatış bekleyen, acil yatak/gözlem kapasitesi. Spesifikasyondaki model bu alanları ister (bkz. R6).

### 3.3 Sözleşme (EK-1) bağlantı noktaları
- Zorunlu alanlar, spesifikasyonun saydığı alanlarla birebir aynı: `occupancyPercent`, `crowdingLevel`, `greenWaiting`, `yellowWaiting`, `activePhysicians`, `estimatedGreenWaitMinutes`, `estimatedYellowWaitMinutes`, `updatedAt`, `isForecast`, `dataSource`.
- Şema `additionalProperties` açık; isteğe bağlı alan eklemek eski istemciyi bozmaz.
- `schemaVersion` deseni `^1\.[0-9]+$`. **Güncel sürüm 1.1** (`ownership`).

## 4. Eksikler ve riskler

| # | Risk / eksik | Etki | Önerilen yol |
|---|---|---|---|
| R1 | v1 yok | v1 kıyası (d) ve "v1'den kötü olmasın" denetimi yapılamaz | Kıyas (a) süreklilik, (b) mevsimsel saf, (c) üstel düzeltme ile yapılır. v1 sayıları rapora "doğrulanmamış" etiketiyle girer. v1 klasörü verilirse eklenir |
| R2 | Sözleşmede **1.1 dolu** (`ownership`) | Spesifikasyondaki "1.1" numarası çakışır | Yeni isteğe bağlı alanlar **1.2** olur (yine küçük sürüm; eski istemci bozulmaz). Alan adları ve türleri değişmez |
| R3 | Sözleşmede 2 triyaj sınıfı var (yeşil/sarı); model en az 3 sınıf istiyor | Kırmızı sınıf çıktıda yer almaz | Kuyrukta kırmızı/sarı/yeşil benzetilir. Kırmızı yalnız hekim kapasitesini tüketir; çıktıya alan olarak konmaz (alan eklemek gerekirse 1.x isteğe bağlı) |
| R4 | NEDOCS benzeri bileşik endeks | Katsayılar ezberden yazılırsa yanlış olabilir. Endeks hastane yatak sayısı, solunum cihazındaki hasta sayısı gibi panelde OLMAYAN girdiler ister | Katsayılar Aşama 3'te **birincil kaynaktan** doğrulanmaya çalışılır (Weiss vd., 2004, *Academic Emergency Medicine*). Kaynağa erişilemezse ya da girdiler yoksa tanım "**uygulanmadı — kaynak doğrulaması / girdi gerekli**" olarak kalır. Varsayılan tanım kapasite tabanlıdır |
| R5 | Resmî tatil ve dini bayram takvimi | Dini bayram tarihleri yıla göre değişir; ezberden yazılırsa yanlış olabilir | Takvim **veri dosyası** olarak tutulur; her satırda kaynak ve "doğrulandı mı" alanı olur. Sabit tatiller kanundan, bayramlar Diyanet / Cumhurbaşkanlığı ilanından alınır. Doğrulanamayan yıl "doğrulanmadı" diye işaretlenir ve motor o yıl için bayram etkisini **uygulamaz**. Takvimi siz de resmî kaynakla karşılaştırmalısınız |
| R6 | Model için gereken girdilerin bir kısmı (başvuru/saat, yatış bekleyen, yatak kapasitesi) panelde yok | Kapasite tabanlı doluluk için kapasite `hekim × capacityPerPhysician` varsayımına düşer; bu "DOĞRULANMALI" etiketlidir | Düşüş basamakları ve `assumedFields` ile açıkça belirtilir, güven düzeyi düşer. Panel alanlarının eklenmesi motor kapsamı dışında, ayrı bir iş olarak önerilir |
| R7 | **Döngüsellik:** motor kendi model ailesiyle üretilmiş veride sınanırsa iyi görünür | Sonuçlar abartılı çıkar | Motorun bilmediği mekanizmalarla en az 3 rejim (§5.4). Her ölçü rejime göre ayrı raporlanır; "kendi ailesi" rejimi ayrıca etiketlenir |
| R8 | Performans: 1500 benzetim × 6 ufuk + akşam + karşıolgusal açıklama | Node'da p95 ≤ 250 ms zorlayıcı olabilir | Tek koşu tüm ufukları birlikte üretir (ufuklar aynı yörüngenin anlık görüntüleri). Açıklama ortak rastgele sayılarla daha az benzetimle yapılır. Gerekirse yakınsama ölçütüne göre uyarlamalı benzetim sayısı. Sonuç ölçülüp raporlanır |
| R9 | Ön yüz boyut bütçesi zaten aşılmış (178,8 KB / 120 KB) | Motor tarayıcıda gönderilirse bütçe daha da aşılır | Motor **sunucuda** (ya da sahte sunucuda) çalışır; site yalnız sonucu gösterir. Tarayıcı uyumluluğu yalnız test ve isteğe bağlı Web Worker içindir |
| R10 | Gerçek veri yok | Hiçbir doğruluk iddiası yapılamaz | Tüm ölçüler "sentetik rejimlerde ölçüldü" etiketiyle verilir; gerçek doğrulama gölge mod pilotunda |
| R11 | Seviye eşikleri (50/80) gerekçesiz | Seviye doğruluğu eşiğe çok duyarlı olabilir | Eşikler `config.js`'e taşınır; ±5 puan hassasiyet analizi raporlanır |
| R12 | Bağımlılıksız özellik tabanlı test | fast-check gibi bir kütüphane kullanılmazsa küçük bir test yardımcısı yazmak gerekir | Tohumlu, bağımlılıksız küçük bir üreteç (`tests/lib/property.js`). Ağ/npm gerekmez |

## 5. Önerilen mimari (onaya sunulan)

### 5.1 Yer ve paketleme
```
AcilRadar/motor/
  core/        config · rng · time · holidays.data · quality · demand · service · queue ·
               occupancy · forecast · calibrate · explain · fallback · index
  tools/       simulator · backtest · report · (worker sarmalayıcı)
  tests/       run-all.js · unit/ · property/ · golden/ · robustness/ · perf/ · lib/
  docs/        MODEL_KARTI · VERI_GEREKSINIMLERI · PILOT_PROTOKOLU · DEGISIKLIK · README · aşama raporları
```
- **Çekirdek:** saf ES2018, sıfır bağımlılık; DOM, ağ, dosya ve saat okumaz (zaman parametre olarak gelir). Her dosya UMD benzeri tek bir sarmalayıcıyla hem Node'da (`require`) hem tarayıcıda (`window.AcilRadarMotor`) yüklenir; derleme adımı yok.
- **Mock sunucu entegrasyonu:** yeni bir mock sunucu yazılmaz, mevcut `AcilRadar/tools/mock-server.js` motoru kullanacak şekilde güncellenir (Aşama 4). Böylece site ve panel aynı uçla çalışmaya devam eder.
- Tek giriş: `computeHospital(input, options)` ve `computeRegion(inputs, options)`. Sürüm alanı `modelVersion: "2.0.0"`.

### 5.2 Veri akışı (tek hastane)
```
girdi → quality (doğrula, bayatlık, aykırı → sınırla + uyarı, assumedFields, güven)
      → fallback basamağı seç (tam / kısmi / yalnız mevsimsel öncül / "güncel bilgi yok")
      → demand (saat-hafta hızı × tatil × ani artış CUSUM; Gamma-Poisson büzülme)
      → service (sınıf başına log-normal; vardiya çizelgesi)
      → queue (Monte Carlo: 3 sınıf, müdahalesiz öncelik, LWBS, yatış tıkanması)
          tek yörüngeden 0/30/60/120/180/240 dk ve 20:00 anlık görüntüleri
      → occupancy (kapasite tabanlı; endeks yalnız girdiler + doğrulanmış katsayılar varsa)
      → calibrate (split-conformal düzeltme; ufuk × saat dilimi; veri yoksa "uygulanmadı")
      → explain (karşıolgusal, ortak rastgele sayılar; en çok 3 faktör, şablon cümle)
      → sözleşme alanları (EK-1 aynen + 1.2 isteğe bağlı alanlar)
```

### 5.3 Doluluk tanımları
1. **capacity** (varsayılan): (bekleyen + muayenede + yatış bekleyen) ÷ kapasite.
   - Kapasite, hastane `bedCapacity` verirse o; vermezse `hekim × capacityPerPhysician` (varsayım, "DOĞRULANMALI").
   - Gösterilen değer en çok 100; 100'ün üstü `overCapacityShare` olarak ayrıca raporlanır.
2. **index**: R4'teki koşullar sağlanırsa hesaplanır, yoksa çıktıda `definition: "capacity"` kalır ve endeks "uygulanmadı" diye raporlanır.

### 5.4 Sentetik dünya: en az 3 rejim (motorun bilmediği mekanizmalar)
| Rejim | Gelir | Hizmet | Ek mekanizma |
|---|---|---|---|
| R-A "kendi ailesi" (yalnız kontrol amaçlı, döngüsel) | Poisson, saat-hafta kalıbı | log-normal | — |
| R-B "ağır kuyruk + patlama" | Poisson + dalgalar hâlinde kaza patlamaları (toplu varış) | Gamma/Weibull karışımı | vardiya değişiminde 30 dk hekim düşüşü |
| R-C "tıkanma + bayram" | Bayram sonrası yığılma, hafta sonu kayması | log-normal, sınıf oranı zamanla kayar | yatış bekleyenlerin yatağı uzun süre bloklaması, LWBS oranı yüksek |
| R-D "kirli veri" (isteğe bağlı) | R-B ile aynı | R-B ile aynı | bayat kayıt, eksik alan, aykırı giriş |

Ayar (parametre öğrenme, conformal kalibrasyon) ve test verisi **zamanda ayrılır**: önceki haftalar ayar, sonraki haftalar test. Ayarda test verisine bakılmaz.

### 5.5 Ölçme planı (Aşama 3–4)
- **Kaydırmalı geriye dönük test:**
  - Rejim başına 8–12 sentetik hafta.
  - Ufuklar: 0, 30, 60, 120, 180, 240 dk ve 20:00.
  - En az 5 tohum; ortalama ve aralık verilir.
- **Ölçüler:**
  - Hata ve aralık: MAE, RMSE, sapma, pinball (0,1/0,5/0,9), %80 kapsama (hedef %78–82), aralık genişliği.
  - Seviye: doğruluk ve karışıklık matrisi, güvenilirlik tablosu.
  - Ayrı satırlar: ρ ≥ 0,85 ve ρ < 0,85, hafta içi / sonu, gece / gündüz.
- **Kıyas:** (a) süreklilik, (b) mevsimsel saf, (c) üstel düzeltme, (d) v1 (yoksa "yok"), (e) yeni motor. Yeni motor en iyi kıyasa göre anlamlı üstünlük göstermezse bu açıkça yazılır.
- **Kayma (drift) izleme:** Page-Hinkley; eşik aşılırsa "yeniden kalibrasyon gerekli".
- **Bileşen başına "işe yarıyor mu" denetimi:** her bileşen kapatılıp ölçülür. Örnek: sürü etkisi önleme, ani artış algısı, büzülme. Ölçülebilir kazanç getirmeyen bileşen çıkarılır ya da kapalı kalır.

### 5.6 Aşama planı (görevdekiyle aynı)
| Aşama | İçerik |
|---|---|
| 2 | config, rng, time + takvim, quality, demand, service, queue, occupancy + birim, özellik tabanlı ve altın dosya testleri |
| 3 | forecast, calibrate, explain, fallback + simulator (≥ 3 rejim) + backtest + kıyas modelleri |
| 4 | index, sözleşme 1.2 + şema + sözleşme testleri, mock-server, performans |
| 5 | MODEL_KARTI, VERI_GEREKSINIMLERI, PILOT_PROTOKOLU, README, DEGISIKLIK, nihai rapor |

## 6. Varsayımlar

1. v1 yok sayılır; motor sıfırdan yazılır (görevin "v1 yoksa" maddesi).
2. Motorun yeri `AcilRadar/motor/`. Mevcut site, panel ve testler değişmez; yalnız Aşama 4'te `tools/mock-server.js` ve sözleşme belgeleri güncellenir.
3. Yeni isteğe bağlı alanlar sözleşme **1.2** ile eklenir (R2).
4. Triyaj: kırmızı / sarı / yeşil. Sözleşmedeki "greenWaiting" = yeşil (acil olmayan), "yellowWaiting" = sarı (daha acil).
5. Türkiye saati sabit UTC+3 (2016'dan beri yaz saati uygulaması yok). Akşam 20:00 geçmişse "akşam" tahmini üretilmez; mevcut arayüz davranışı ("bugün için geçti") korunur.
6. Varsayılan doluluk tanımı: kapasite tabanlı. `capacityPerPhysician` varsayımsal bir başlangıç değeridir ve "DOĞRULANMALI" etiketlidir.
7. Seviye eşikleri başlangıçta mevcut değerlerle aynıdır (orta ≥ 50, çok ≥ 80); hassasiyet analiziyle raporlanır.
8. Bayatlık eşiği mevcut değerle aynıdır: 30 dk.
9. Testler `node motor/tests/run-all.js` ile çalışır. Proje kökünde `package.json` yok; `npm test` için kök dosya eklemek mevcut yapıyı değiştireceği için önerilmez (istenirse eklenir).
10. Özellik tabanlı testler bağımlılıksız, tohumlu küçük bir üreteçle yazılır.

## 7. Test edemediklerim / yapamadıklarım

- **v1 çalıştırılamadı.** v1 sayıları yeniden üretilemedi ve kıyaslanamadı.
- **Gerçek veri yok.** Hiçbir sayının gerçek dünyadaki doğruluğu ölçülemez; ancak pilotta gölge modda ölçülebilir.
- **NEDOCS katsayıları ve bayram tarihleri** bu aşamada doğrulanmadı; Aşama 2–3'te birincil kaynakla doğrulanacak, doğrulanamazsa kullanılmayacak.
- **Performans** henüz ölçülmedi (kod yok).

## 8. Onay

**Sonraki aşama için onay bekliyorum.**

Onay verirken lütfen şunları belirtin:
- **v1 kıyası:** v1 klasörünü ekleyebilecek misiniz? Eklemezseniz kıyas (d) "yok" kalır.
- **Sözleşme sürümü:** 1.2 önerisini (R2) kabul ediyor musunuz?
- **Motorun yeri:** `AcilRadar/motor/` uygun mu?

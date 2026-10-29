# Doluluk motoru · Model kartı (v2.2.0 — hibrit)

> **v2.2.0 — hibrit yöntem seçimi.** §8'deki sonuca göre ürün çıktısı tek bir model değil, ufka göre seçilen yöntemlerdir (`core/hybrid.js`, `config.HYBRID`):
>
> | Çıktı | Yöntem | Dayanak |
> |---|---|---|
> | Doluluk, şimdi ve +30/+60 dk | **Süreklilik** (bildirilen güncel doluluk aynen kalır) | B, C, D rejimlerinde motordan iyi ya da başa baş |
> | Doluluk, +2 saat (ve +180/+240) | **Mevsimsel ortalama** (aynı saat-gün, geçmiş; ≥ 2 örnek) | +120 dk'da motorla başa baş; daha basit |
> | Doluluk, akşam 20:00 | **Mevsimsel ortalama** (ufuk ne olursa olsun) | Akşamda 4 rejimin 4'ünde süreklilikten çok daha iyi, motordan iyi ya da eşit |
> | Yeşil ve sarı bekleme, "şimdi" | **Motor** | Bugünkü formülden A, B, D'de tutarlı üstün; sarıda dört rejimde de daha iyi |
> | Bekleme, ileri ufuklar | Bugünkü ürün formülü | Motorun ileri ufukta kanıtı yok (C'de daha kötü) |
>
> **Güven düzeyi ve etkenler yalnız "şimdi" yeşil bekleme için** üretilir ve gösterilir (etkenler dakika cinsindendir). Doluluk tahmini için güven, etken ve aralık yoktur. Mevsimsel örnek yetersizse +2 saatte süreklilik kullanılır ve `assumedFields` içinde `occupancyHistory` yazılır; akşam için sayı üretilmez.
>
> Doluluk için benzetim motoru ürün çıktısına **girmez**; `computeHospital` yine de çalışır ve gölge modda ölçülmeye devam edebilir. Aşağıdaki §2–§7 benzetim motorunu anlatır; §8 karar ve sonuçlardır.

## 1. Ne yapar, ne yapmaz

| Yapar | Yapmaz |
|---|---|
| Bir acil servisin şimdi, +30…+240 dk ve akşam 20:00 için **tahmini** doluluk yüzdesini, seviyesini (az/orta/çok), %80 aralığını ve yeşil/sarı bekleme aralığını üretir | Tıbbi karar vermez, tıbbi tavsiye üretmez, triyajın yerine geçmez |
| Tahminin güven düzeyini ve en çok 3 açıklama etkenini verir | Hasta bazlı veri işlemez (yalnız toplu sayılar — KVKK) |
| Veri bayatsa sayı üretmez ("güncel bilgi yok") | Hastaneleri sıralamaya ya da öne çıkarmaya ağırlık katmaz |
| Eksik veride kısmi çalışır ve eksikleri `assumedFields` ile açıkça söyler | "Kanıtlanmış doğruluk" iddia etmez — yalnız sentetik ölçüm vardır |

**Ana çıktı doluluk oranıdır.** Bekleme süresi (ve sitedeki "varış anı toplam süre") ikincildir.

## 2. Doluluk tanımı

**Kapasite tabanlı** (kullanılan): `(bekleyen + muayenede + yatış bekleyen) ÷ kapasite × 100`.

- **Kapasite:** hastanenin bildirdiği acil yatak/gözlem sayısı (`bedCapacity`). Bildirilmezse `hekim × 6`. Bu değer **VARSAYIMDIR — DOĞRULANMALI**; `assumedFields` içinde `bedCapacity` olarak belirtilir.
- **Gösterim:** gösterilen değer en çok 100'dür. 100'ü aşma olasılığı `overCapacityShare` olarak ayrıca verilir.
- **Bileşik endeks** (NEDOCS türü) **uygulanmadı**. Gerekçeler:
  1. Hastane yatak sayısı, solunum desteğindeki hasta sayısı, en uzun yatış bekleme süresi gibi girdiler asgari veri setinde yok.
  2. Endeks puanının yüzdeye dönüşümü tanımlı değil.
  3. Katsayılar bu çalışmada birincil kaynaktan doğrulanmadı ve ezberden yazılmadı.

## 3. Model

```
girdi → veri kalitesi → düşüş basamağı → talep (Gamma-Poisson + CUSUM) → hizmet (log-normal, vardiya)
      → kuyruk benzetimi (Monte Carlo, 3 triyaj sınıfı, vazgeçme, yatak tıkanması)
      → doluluk / bekleme dağılımları → kalibrasyon (sapma + conformal) → açıklama → sözleşme alanları
```

- **Talep:** saatlik örüntü × haftanın günü × gün türü (resmî tatil, dini bayram, arife, bayram ertesi) × ölçek × ani artış.
  - Ölçek, saat düzeltmesi ve gün türü geçmiş saatlik başvurudan **Gamma-Poisson büzülmeyle** öğrenilir: az veri olunca bölge öncülüne yakın kalır, çok veri olunca hastaneye özel değere gider.
  - Ani artış: son 24 saatin standartlaştırılmış artıklarında tek yönlü CUSUM ile algılanır. Etkisi ileriye doğru 90 dk yarılanma süresiyle söner.
- **Kuyruk:** olay güdümlü benzetim yapılır.
  - **Öncelik:** kırmızı > sarı > yeşil, müdahalesiz; yeşil hızlı alanda yatak istemez.
  - **Yatış bekleyenler:** yatağı bloklar; yatak doluysa yatak gerektiren hasta bekler.
  - **Ölçüm hastası:** her ufukta sıfır süreli bir ölçüm hastası sıraya girer ve bekleme süresini verir; kimseyi geciktirmez.
- **Belirsizlik:** üç kaynaktan gelir.
  1. Koşudan koşuya rastgelelik.
  2. Talep ölçeğinin sonsal dağılımı.
  3. Hizmet süresi ortancasının belirsizliği.
  
  Koşu sayısı en çok 1500, en az 300'dür. Doluluk yüzdelikleri art arda iki denetimde en çok max(1 puan, bir hastanın puanı) kayıyorsa durur.
- **Kalibrasyon:** ayrı bir ayar döneminden ufuk × saat dilimi hücresi başına iki şey öğrenilir:
  - **Sapma düzeltmesi:** artıkların ortancası.
  - **Split-conformal aralık genişletme/daraltma:** hedef nominal %80.
  
  Hücrede yeterli örnek yoksa ufuk geneli kullanılır; o da yoksa "uygulanmadı" yazılır.

### Bilinen sınırlılıklar

1. **Parametreler öğrenilmiyor:** haftanın günü etkisi, hizmet süreleri, yatış oranları ve sınıf payları **öncüldür, öğrenilmez**. Sapma düzeltmesi bunun bir kısmını telafi eder ama yapısal farkları gidermez.
2. **Kalibrasyon için gerçek veri gerekiyor:** kalibrasyon ve sapma düzeltmesi için ayar verisi gerekir. İlk günlerde (pilot başı) uygulanamaz ve ham aralıklar kullanılır.
3. **Akşam tahmini:** 8 saatten uzak akşam tahmini yalnız mevsimsel öncüldür. Bu sınır performans bütçesi için seçildi.
4. **Açıklamalar toplamsal değil:** her biri "yalnız bu etken olmasaydı" farkıdır; etkenler birbirini etkiler.
5. **Okul dönemi bilinmiyor:** doğrulanmış MEB takvimi eklenmedi; bayrak bilinmiyor (null) döner ve kullanılmaz.
6. **Bayram tarihleri ikincil kaynaklı:** 2025–2027 tarihleri resmî takvimi aktaran birden çok tutarlı kaynaktan alındı (`verification: 'secondary'`). Diyanet sitesi bu ortamdan erişilemedi; yayından önce birincil kaynakla karşılaştırılmalı.
7. **Sürü etkisi önleme yok:** yönlendirmenin hastane yüklerini nasıl değiştirdiği ölçülmeden bu bileşen eklenmedi.

## 4. Güven düzeyi (kural tablosu)

| Etken | 2 puan | 1 puan | 0 puan |
|---|---|---|---|
| Tazelik (verinin yaşı) | ≤ 10 dk | ≤ 20 dk | > 20 dk (30 dk üstünde zaten sayı yok) |
| Kaynak | `official` | `hospital` | `simulated` |
| Eksiksizlik | Çekirdek alan varsayılmadı ve eksik isteğe bağlı alan ≤ 2 | Çekirdek alan varsayılmadı | Çekirdek alan (hekim / bekleyen) varsayıldı |
| Geçmiş doğruluk (pilotta ölçülür) | `good` | Bilinmiyor ya da `fair` | `poor` |

Toplam puana göre düzey: ≥ 7 **yüksek**, ≥ 4 **orta**, aksi **düşük**.

Tavanlar:
- Örnek veri (`simulated`) her zaman **düşük**.
- Kısmi veri en çok **orta**.
- Yalnız mevsimsel öncül **düşük**.
- 8 saatten uzak akşam tahmini **düşük**.

Arayüz düşük güveni kartta etiketle gösterir; tahmin güveni kart ayrıntılarında da yazılıdır.

## 5. Seviye eşikleri

- **Değerler:** orta ≥ 50, çok ≥ 80.
- **Gerekçe:** mevcut ürünle tutarlılık ve kapasitenin yarısı / beşte dördü gibi anlaşılır sınırlar. Klinik bir standarttan alınmadı.
- **Hassasiyet:** ±5 puan oynatıldığında seviye dağılımı ve doğruluk `DOGRULAMA_RAPORU.md` › "Seviye eşiği hassasiyeti" bölümünde.
- **Kesinleşme:** eşikler pilotta hastanelerle birlikte kesinleşmeli.

## 6. Doğrulama özeti (SENTETİK)

Ayrıntı ve tüm tablolar: `DOGRULAMA_RAPORU.md` (model 2.1.0). Kapatma deneyleri: `DOGRULAMA_RAPORU_2.0.0.md`. Özet ve karar: `§8`.

## 7. Kullanım koşulları

- Çıktı her yerde "tahmin" olarak sunulur, "tıbbi karar aracı değildir" uyarısıyla birlikte. 112 her zaman erişilebilir kalır.
- Veri bayatsa sayı gösterilmez.
- Gerçek veriyle doğrulanmadan (`PILOT_PROTOKOLU.md` › karar eşikleri) halka açık gösterimde **kullanılmamalıdır**.

## 8. Sentetik doğrulama sonucu ve karar (model 2.1.0)

> Sayılar 4 sentetik rejimden gelir, rejim başına 5 tohum. Gösterim ortalamadır, köşeli parantezde en az–en çok. **Gerçek dünya değildir.**
> - Rejim A motorun kendi model ailesidir; döngüsel olduğu için yalnız kontroldür.
> - Asıl kanıt, motorun bilmediği mekanizmaları içeren B, C ve D rejimleridir.

### 8.1 Doluluk (ana çıktı) — en iyi kıyas modeline göre

| Ufuk | A (kontrol) | B | C | D |
|---|---|---|---|---|
| +30 dk | ≈ (motor 9,8 · süreklilik 10,3) | **daha kötü** (9,0 · 7,9) | **daha kötü** (6,3 · 5,2) | **daha kötü** (12,8 · 10,7) |
| +60 dk | **tutarlı üstün** (12,3 · 13,9; 5/5) | **daha kötü** (13,0 · 11,7) | geride (7,5 · 6,8) | geride (14,4 · 13,4) |
| +120 dk | iyi ama tutarsız (14,7 · 16,7) | iyi ama tutarsız (15,4 · 16,1) | geride (10,1 · 9,4) | ≈ (17,7 · 18,1) |
| +240 dk | iyi ama tutarsız (15,0 · 16,0) | ≈ (18,3 · 18,6) | geride (10,5 · 9,8) | geride (19,2 · 16,7) |
| akşam 20:00 | ≈ (16,6 · 16,3) | **daha kötü** (12,0 · 9,4) | **daha kötü** (7,0 · 3,1) | **daha kötü** (19,6 · 13,8) |

Değerler doluluk MAE (puan) olarak verildi: önce motor, sonra en iyi kıyas.

**Karar (görev kuralı: "anlamlı üstünlük yoksa kullanma, şunu kullan"):** motor, doluluk tahmininde B–D rejimlerinde basit yöntemlerden **tutarlı biçimde iyi değildir**.

| Ufuk | Kullanılacak yöntem |
|---|---|
| +30 / +60 dk | **(a) Süreklilik** (şu anki doluluk aynen kalır) |
| Akşam 20:00 | **(b) Mevsimsel saf** (aynı saat-gün geçmiş ortalaması) |
| +120 / +240 dk | Motor ve kıyaslar başa baş; daha basit olan **(b) mevsimsel saf** yeterli |

Motorun doluluk çıktısı pilotta **gölge modda** ölçülmeye devam etmelidir.

### 8.2 Bekleme süresi (ikincil çıktı)

- **"Şimdi" yeşil bekleme:** motor, bugünkü üründeki formüle (bekleyen ÷ hekim × 9 dk) göre A, B ve D'de **tutarlı biçimde daha iyi** (5/5 tohum).

  | Rejim | Motor MAE (dk) | Formül MAE (dk) |
  |---|---|---|
  | A | 10,4 | 15,4 |
  | B | 63,2 | 83,1 |
  | D | 51,1 | 62,5 (üstel düzeltme) |

  C'de (yatak tıkanması) fark yok: motor 14,5, formül 13,6.
- **+120 dk:**
  - A'da tutarlı üstün.
  - B'de iyi ama tutarsız.
  - C'de daha kötü: motor 24,9, formül 16,8.
- **Öneri:** "şimdi" bekleme aralığı için motor kullanılabilir. Yatak tıkanması yüksek hastanelerde dikkat gerekir.

### 8.3 Aralıklar, seviye, yük

- **%80 aralık kapsaması** çoğu hücrede %82–92 arasında. Bu, **hedefin (%78–82) üstü**: aralıklar gereğinden geniş.
  - Ayar dönemi ile sınama dönemi arasındaki dağılım farkı (bayram, sınıf kayması) conformal kalibrasyonun daraltmasını engelliyor.
- **Seviye doğruluğu (+120 dk):** rejime göre %56–72. **Önerilen pilot eşiğinin (%75) altında.**
  - Eşik ±5 puan oynatıldığında doğruluk değişimi rejime göre −4 ile +5 puan arasında.
- **Ağır yük (ρ ≥ 0,85):** motor sapması −2 ile −7 puan arasında. Yani motor **iyimser**: doluluğu olduğundan düşük tahmin ediyor.
  - Bu, v1 için bildirilen zayıflığın v2'de de sürdüğünü gösteriyor.
- **Kayma denetimi:** Page-Hinkley (λ = 60, önceden seçildi) neredeyse her seride alarm verdi. Bu ayarla **ayırt edici değildir**.
  - Eşik pilotun ayar döneminde, yanlış alarm oranına göre belirlenmelidir.

### 8.4 Bileşenlerin değeri (kapatma deneyleri, 2.0.0)

| Bileşen | Kapatınca doluluk MAE (+120) değişimi | Durum |
|---|---|---|
| Ani artış (CUSUM) | −0,1 ile 0,0 | **Kapalı** |
| Bayram etkisi | C'de kapatınca −0,5 (hata azaldı) | **Kapalı** |
| Parametre belirsizliği | ≈ 0 | **Kapalı** |
| Talep öğrenmesi | A +1,0 · B +0,7 · C −1,0 | Açık (karışık; pilotta yeniden değerlendirilmeli) |
| Yatak tıkanması | ≈ 0 | Açık (yapısal) |

### 8.5 v1 ile karşılaştırma

v1 bulunamadı; bildirilen v1 sayıları doğrulanamadı ve farklı bir dünyada ölçüldü. Yan yana bakıldığında v2'nin sentetik hataları daha yüksek.

| Ölçü | v2 | v1 (bildirilen) |
|---|---|---|
| Doluluk MAE +60 / +120 / +240 (puan) | 10,9 / 13,4 / 14,6 | 6,9 / 10,0 / 12,7 |
| Seviye doğruluğu +60 / +120 / +240 | %72 / %65 / %64 | %86 / %83 / %80 |

Ancak v2'nin dünyaları **bilerek** motordan farklı mekanizmalar içeriyor, bu yüzden bu fark **v2'nin daha kötü olduğunu kanıtlamaz, iyi olduğunu da kanıtlamaz**. Kesin kıyas için v1 kodunun aynı geriye dönük testte çalıştırılması gerekir: `tools/backtest.js` içine (d) olarak eklenebilir.

### 8.6 Uygulanan karar (2.2.0)

Yukarıdaki hibrit tablo uygulandı. Ölçüm dayanağı: mevsimsel ve süreklilik yöntemlerinin hatası, hibritte çalışan fonksiyonlarla geriye dönük testte ölçülenle **birebir aynıdır** (rejim A tohum 1 kontrolü: mevsimsel +120 dk 16,062 → 16,062; akşam 21,125 → 21,125; süreklilik +60 dk 13,926 → 13,926). Hibrit çıktı için ayrı bir doğruluk iddiası yapılmaz: değerler bu basit yöntemlerin ölçülmüş hatalarını taşır. Kapsam ve eşik sınırlılıkları §8.3'tekilerle aynıdır.

### 8.7 Sonraki adımlar (öneri)

1. **Ürün doluluk kaynağı:** halka açık doluluk için ufka göre basit yöntem kullanılmalı (§8.1). Motor gölge modda çalışmalı.
2. **Pilotun ilk iki haftası:** `DOĞRULANMALI` parametreler (hizmet süreleri, yatış oranı, sınıf payları, kapasite) gerçek toplu veriyle güncellenmeli. Ağır yükteki iyimserliğin büyük olasılıkla ana kaynağı bunlardır.
3. **Pilot sonrası kayma eşiği:** Page-Hinkley eşiği ayar döneminden belirlenmeli.
4. **Pilot sonrası yeniden ölçüm:** geriye dönük test gerçek CSV ile yeniden koşulmalı (`--csv`). Motor ancak kıyaslardan ölçülebilir biçimde iyiyse halka açık gösterime alınmalı (`PILOT_PROTOKOLU.md` §4).

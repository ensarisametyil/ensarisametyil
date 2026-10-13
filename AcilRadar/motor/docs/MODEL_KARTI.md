# Doluluk motoru · Model kartı (v2.0.1)

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

Ayrıntı ve tüm tablolar: `DOGRULAMA_RAPORU.md`. Özet bu belgenin sonundadır (`§8`).

## 7. Kullanım koşulları

- Çıktı her yerde "tahmin" olarak sunulur, "tıbbi karar aracı değildir" uyarısıyla birlikte. 112 her zaman erişilebilir kalır.
- Veri bayatsa sayı gösterilmez.
- Gerçek veriyle doğrulanmadan (`PILOT_PROTOKOLU.md` › karar eşikleri) halka açık gösterimde **kullanılmamalıdır**.

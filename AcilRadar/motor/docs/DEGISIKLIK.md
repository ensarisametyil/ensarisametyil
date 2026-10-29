# Doluluk motoru · Değişiklik günlüğü

Biçim: en yeni üstte. Model çıktısını değiştiren her değişiklik `MODEL_VERSION` artışı ve `tests/golden/golden.json` yenilemesi gerektirir.

## 2.2.0 — hibrit yöntem seçimi (ürün çıktısı)
- **Neden:** doğrulama sonucu (`MODEL_KARTI.md` §8): benzetim motoru doluluk tahmininde basit yöntemlerden tutarlı iyi değil; "şimdi" bekleme tahmininde ise bugünkü formülden iyi.
- **`core/hybrid.js` (yeni) ve `toContract` yeniden yazıldı:**
  - doluluk şimdi ve +60 dk: süreklilik;
  - doluluk +2 saat ve akşam 20:00: mevsimsel ortalama;
  - yeşil ve sarı bekleme "şimdi": motor;
  - bekleme ileri ufuk: bugünkü ürün formülü.
- **Güven ve etkenler yalnız "şimdi" yeşil bekleme için.** Etkenler artık dakika cinsinden ve `target: "greenWait"` taşıyor. Doluluk etkenleri yalnız `explainTarget: 'occupancy'` ile (motor incelemesi) üretilir.
- **Doluluk için `occupancyRange` ve `overCapacityShare` artık üretilmez** (süreklilik ve mevsimsel ortalama aralık vermez).
- **Yeni girdi:** `occupancyHistory: [{ ms, percent }]` (hastanenin geçmiş bildirimlerinden ham doluluk). `quality.js` temizler. Akşam için en az 2 örnek yoksa kayıt üretilmez; +2 saatte süreklilik ve `assumedFields` içinde `occupancyHistory`.
- **`modelVersion` 2.2.0.** `dataSource`, girdinin kaynağını aynen yansıtır.
- **Hata düzeltmesi:** `quality.js` `history` ve `occupancyHistory` dizilerinde `null` satırı `0` zamanlı geçerli satır sayıyordu; artık atılıyor.
- Geriye dönük test aracı mevsimsel kıyası ürünle aynı fonksiyondan alıyor (sonuçlar değişmedi). Altın dosya yenilendi.

## 2.1.0 — kazanç getirmeyen bileşenler kapatıldı
- Kapatma deneylerine dayanır (`DOGRULAMA_RAPORU_2.0.0.md`, tohum 1–2, rejim A–C, +120 dk). Görev kuralı: ölçülebilir kazanç getirmeyen bileşen kapalı kalır.
- **Kapatılanlar** (kod yerinde, `config.FEATURES`):
  - **Ani artış algısı (CUSUM):** doluluk MAE farkı −0,1 ile 0,0 arası; kazanç yok.
  - **Bayram/gün türü etkisi:** C rejiminde kapatınca doluluk MAE 0,5 puan, yeşil bekleme MAE 2,0 dk düştü; etki ters yönde.
  - **Parametre belirsizliği:** MAE farkı ≈ 0. Aralıklar zaten hedeften geniş (%82–93 kapsama).
- **Açık kalanlar:**
  - **Talep öğrenmesi:** A'da doluluk MAE'de +1,0 puan kazanç; B'de karışık (−0,4 ile +1,9 arası); C'de −1,0 puan kayıp.
  - **Yatak tıkanması:** ölçüde ≈ 0, ama `bedCapacity`'nin anlamı için yapısal olarak gerekli.
- Açıklama (etkenler) artık kapalı bileşenleri temel durumda da kapalı tutuyor. Kapalı bileşen etken listesinde görünmez.
- Geriye dönük test 2.1.0 ile yeniden koşuldu: `DOGRULAMA_RAPORU.md`.

## 2.0.1
- Sözleşme çıktısında bekleme aralığının üst ucu en az alt uç + 5 dk (`config.CONTRACT.MIN_WAIT_SPREAD_MINUTES`). Ürün kuralı "süre daima aralıktır"; boş sistemde aralık "0 dk."ya iniyordu.
- Ölçülen doğruluğa etkisi yok: geriye dönük test motorun ham yüzdeliklerini kullanır. `DOGRULAMA_RAPORU.md` 2.0.0 ile üretildi.

## 2.0.0 — sıfırdan yazıldı (v1 bu depoda bulunamadı)
- **Mimari:** katmanlı, sıfır bağımlılıklı ES2018 çekirdek (`core/`). Node ve tarayıcıda aynı kod çalışır; Worker sarmalayıcısı var.
- **Talep:**
  - saat-hafta örüntüsü;
  - hiyerarşik Gamma-Poisson büzülme (ölçek, saat düzeltmesi, gün türü);
  - CUSUM ile ani artış algısı.
- **Kuyruk:**
  - 3 triyaj sınıfı, müdahalesiz öncelik;
  - vazgeçme ve yatış bekleyenlerin yatak tıkaması;
  - vardiya çizelgesi;
  - sıfır süreli "ölçüm hastası" ile bekleme süresi.
- **Doluluk:** kapasite tabanlı tanım ve `overCapacityShare`. Bileşik endeks (NEDOCS türü) **uygulanmadı**: girdileri asgari veri setinde yok ve yüzdeye dönüşümü tanımlı değil.
- **Belirsizlik:**
  - Monte Carlo ve parametre belirsizliği;
  - uyarlamalı koşu sayısı (yakınsama: yüzdelik kayması ≤ max(1 puan, bir hasta));
  - sapma düzeltmesi ve split-conformal kalibrasyon;
  - Page-Hinkley kayma denetimi.
- **Açıklama:** karşıolgusal katkılar (ortak rastgele sayılar); en çok 3 şablon cümle.
- **Veri kalitesi:**
  - bayatlıkta sayı yok;
  - aykırı değer sınırlanır ve uyarı yazılır;
  - eksik alanlar `assumedFields` listesinde;
  - güven düzeyi kural tablosuyla belirlenir;
  - düşüş basamakları.
- **Sözleşme:** EK-1 aynen korundu; 1.2 isteğe bağlı alanları eklendi. 1.1 sürümü önceden `ownership` için kullanılmıştı.
- **Akşam tahmini:** 8 saatten uzaksa yalnız mevsimsel öncülle verilir. Bunun nedeni performans bütçesi; doğruluğa etkisi raporda.
- **Kaldırılan / eklenmeyen:** "sürü etkisi önleme" bileşeni yok; v1'de katkısı tutarsız bildirilmişti ve bu sürümde ölçülebilir bir dayanağı yok.

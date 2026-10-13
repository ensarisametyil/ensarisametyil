# Doluluk motoru · Değişiklik günlüğü

Biçim: en yeni üstte. Model çıktısını değiştiren her değişiklik `MODEL_VERSION` artışı ve `tests/golden/golden.json` yenilemesi gerektirir.

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

# Doluluk motoru · Pilot protokolü (gölge mod)

> Motorun gerçek dünyadaki doğruluğu **bilinmiyor**. Bu protokol, halka açık gösterime geçmeden önce motoru gerçek veriyle ölçmek içindir. Aşağıdaki eşikler **öneridir**; il sağlık müdürlüğü ve katılan hastanelerle birlikte kesinleşmelidir.

## 1. Gölge mod nedir?

- Motor her 15–30 dakikada tahmin üretir ve **kaydeder**, ama tahmin **kullanıcıya gösterilmez**. Halka açık site bu süre boyunca motor sayılarını göstermez; mevcut gösterim ya da "güncel bilgi yok" sürer.
- Kaydedilenler:
  - Girdi kaydı ve kullanılan model sürümü (`modelVersion`).
  - Her ufuk için tahmin (orta değer ve %80 aralığı).
  - Güven düzeyi, `assumedFields` ve etkenler.
- Gerçekleşen değerler sonraki kayıtlardan hesaplanır. Doluluk, ileri saatteki bildirimden; bekleme, hastanenin bildirdiği toplu kapıdan-hekime süreden gelir (`greenWaitObserved`).

## 2. Süre ve kapsam

| Konu | Öneri | Gerekçe |
|---|---|---|
| Süre | **En az 4 hafta** (tercihen 6) | Haftanın her günü en az 4 kez görülsün; ilk 2 hafta öğrenme + kalibrasyon, sonraki ≥ 2 hafta sınama |
| Hastane | En az 3, yük düzeyi farklı | Tek hastaneye aşırı uyum riskini azaltır |
| Bayram | Mümkünse bir dini bayramı kapsasın | Bayram etkisi ancak gerçek veriyle öğrenilebilir |
| Veri | `VERI_GEREKSINIMLERI.md` §2; bekleme doğrulaması için `greenWaitObserved` | Bekleme gözlenmezse yalnız doluluk doğrulanabilir |

## 3. Ölçülecekler

Sentetik raporla aynı ölçüler, aynı betikle hesaplanır: `node motor/tools/backtest.js --csv pilot.csv`.

- **Hata ölçüleri:** her ufukta MAE, RMSE, sapma ve pinball kaybı (0,1 / 0,5 / 0,9).
- **Aralık ölçüleri:** %80 aralık kapsaması ve aralık genişliği.
- **Seviye ölçüleri:** seviye doğruluğu, karışıklık matrisi ve "çok yoğun" olasılığı için güvenilirlik tablosu.
- **Kesitler:** ağır/hafif yük, hafta içi/sonu, gece/gündüz.
- **Kıyas:** süreklilik, mevsimsel saf ve üstel düzeltme. Motor bunlardan ölçülebilir biçimde iyi değilse, basit yöntem kullanılır.
- **Kayma:** Page-Hinkley alarmları.

## 4. Karar eşikleri (öneri)

Halka açık gösterime geçiş için **hepsi** sağlanmalı. Değerlendirme son 2 hafta, hastane başına yapılır.

| Ölçüt | Eşik | Gerekçe |
|---|---|---|
| +120 dk seviye doğruluğu | ≥ %75 | Kullanıcı en çok "az/orta/çok" etiketini görür; 4 tahminden 3'ü doğru olmalı |
| +120 dk %80 aralık kapsaması | %75–85 | Nominal %80'e yakın olmalı. Çok düşükse yanıltıcı, çok yüksekse gereksiz geniş |
| +120 dk doluluk MAE | En iyi kıyas modelinden en az 2 puan iyi ve hastanelerin çoğunda tutarlı | Karmaşık model ancak ölçülebilir kazanç getiriyorsa kullanılmalı |
| Ağır yük kesiti | Sapma −10 ile +10 puan arasında | Sistematik iyimserlik en zararlı hatadır (sentetikte ağır yükte iyimserlik görüldü) |
| Kayma | Son 2 haftada alarm yok | Alarm varsa önce yeniden kalibrasyon |

Eşik sağlanmazsa:
1. Yeniden kalibrasyon yapılır. Önce `DOĞRULANMALI` parametreler hastane verisiyle güncellenir, sonra conformal ayar yeniden öğrenilir.
2. Gölge mod 2 hafta daha sürer.
3. İki turda da sağlanmazsa motor halka açık gösterimde **kullanılmaz**. Basit yöntem (en iyi kıyas) ya da mevcut gösterim sürer.

## 5. Etik ve yasal notlar

- **Tıbbi karar aracı değildir.** Gösterim her yerde "tahmindir" ve "muayene sırasını triyaj belirler" ifadesini taşır. 112 her zaman erişilebilir kalır.
- **KVKK:** yalnız toplu sayılar işlenir; hasta bazlı veri alınmaz. Pilot verisi en az yetki ilkesiyle saklanmalı ve saklama süresi belirlenmelidir.
- **Tarafsızlık:** sıralama yalnız nesnel ölçütlerle yapılır; hiçbir hastane lehine ya da aleyhine ağırlık yoktur. Reklam ve öne çıkarma yoktur.
- **Sürü etkisi:** "en kısa süre" gösterimi kalabalığı tek hastaneye yönlendirebilir. Pilotta bu etki izlenmelidir; gösterim önerisinin hastane yüklerini nasıl değiştirdiği ölçülmeden "sürü etkisi önleme" iddiası yapılmaz. v2'de böyle bir bileşen **yoktur**.
- **İletişim:** kamuya ve kuruma yapılan açıklamalarda "sentetik rejimlerde şu ölçüldü, gerçek doğrulama pilotta" dili kullanılır. ölçülmemiş doğruluk yüzdeleri ve abartılı teknoloji ya da hız ifadeleri kullanılmaz.

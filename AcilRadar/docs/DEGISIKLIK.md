# Değişiklik günlüğü

Biçim: en yeni üstte. Sözleşme (API) değişiklikleri ayrıca belirtilir.

## 1.5.0 — Hibrit yöntem: örnek API ve arayüz

- **Örnek API (motorlu):** doluluk şimdi ve +60 dk güncel doluluk, +2 saat ve akşam geçmiş ortalama; "şimdi" bekleme motordan, ileri ufuk bekleme bugünkü formülden. `modelVersion` 2.2.0, `dataSource: "simulated"`. Örnek dünya 3 haftalık geçmişle benzetilir.
- **Arayüz:** "Bekleme tahmininin güveni", "Bekleme süresini etkileyenler" ve "Bekleme tahmini düşük güvenli" etiketi **yalnız "Şimdi" diliminde** görünür; doluluk için güven, etken ve doluluk aralığı gösterilmez. Etken cümleleri dakika cinsinden (`waitFactors`). Hedefi `greenWait` olmayan etkenler yok sayılır.
- **Sözleşme:** alan adları değişmedi. `factors[].target` ve `confidence`'ın "şimdi" yeşil beklemeye bağlanması 1.2 ekinde yazılı (`docs/SOZLESME.md`, `docs/hospitals.schema.json`).

## 1.4.0 — Doluluk hesaplama motoru (v2) ve sözleşme 1.2

- **Motor:** `motor/` klasörü. Ayrıntılar `motor/README.md` ve `motor/docs/` altında.
- **Örnek API:** `tools/mock-server.js` normal senaryoda sayıları artık motordan üretiyor (`--engine=off` ile eski davranış). Yanıt `schemaVersion: "1.2"`.
- **Sözleşme 1.2 (isteğe bağlı alanlar):**
  - `occupancyRange`, `overCapacityShare`
  - `confidence`, `factors`
  - `modelVersion`, `definition`
  - `assumedFields`, `simulated`
  
  Ayrıntılar `docs/SOZLESME.md` ve şema içinde.
- **Arayüz:**
  - Kart ayrıntılarında tahmin güveni, doluluk aralığı ve öne çıkan etkenler gösteriliyor.
  - Etken cümleleri arayüzün kendi metinlerinden kuruluyor; sunucu metni gösterilmiyor.
  - Örnek veri dışında düşük güven, kartta etiketle belirtiliyor.

## 1.3.0 — Görsel yenileme ve son tarama

### Tasarım ("Sakin güven" korunarak)
- Tanıtım bandı: yumuşak renk geçişli zemin, daha büyük başlık, geniş ekranda sade (hareketsiz) radar çizimi; üç bilgi tek bir özet şeridinde.
- Seçimler: zaman ve sıralama tek bir "ray" içinde yan yana segment kontrol (seçili olan dolu lacivert + nokta); geniş ekranda 1 ve 2 solda üst üste, 3 sağda (boş alan kalmaz).
- Düğmeler: ikincil düğme tonlu zemin (kalın gri çerçeve yerine); hafif düğme gölgesi; basınca 1 px iner. Form alanlarında ince sınır + belirgin odak halkası.
- Kartlar: iç içe kutular kaldırıldı; toplam süre büyük ve sade; Yol/Bekleme/Hekim tek şeritte; daha yumuşak katmanlı gölgeler, 18 px köşe.
- Harita yakınlaştırma düğmeleri tema renklerinde; hayati tehlike kutusu sol şeritli.
- Panel: giriş ekranı ortada kart; menüde etkin sayfa tonlu zemin + alt çizgi; veri girişi ve kullanıcı ekleme iki sütunlu kart; tablo kart içinde, başlıklar sade, tarih tek satır; dar ekranda başlık yapışkan değil.
- Yeni jetonlar: `--c-tonal-*`, `--c-seg-on-*`, `--c-hero-bg`, `--shadow-btn` (kontrast 106/106 çift geçer).

### Düzeltmeler (son taramanın bulduğu)
- Mobilde sayfa açılırken içerik zıplıyordu (CLS 0,45 → 0,01): eski tarayıcı yedek kutusu yer kaplıyordu; örnek veri bandı veri gelince ekleniyordu; boş metin kutuları önce çiziliyordu. Yedek kutu artık sabit konumlu, bant ilk boyamada yerinde (`lastSimulated` tercihi), içerik metinler yerleşince boyanıyor (112 düğmeli üst çubuk hep görünür).
- Sistem yöneticisinin kullanıcılar tablosu 1024 px'te sayfayı 6 px taşırıyordu; artık yalnız tablo kayar.

### Testler
- `tests/full.test.js` (son tarama) eklendi.

## 1.2.0 — Aşama B: hastane paneli (yalnız ön yüz)

### Panel (`panel/`)
- Ekranlar: giriş, parolamı unuttum (yalnız arayüz), iki adımlı doğrulama yer tutucusu (kapalı), özet (tek hastane / tüm hastaneler), veri girişi, geçmiş kayıtlar, kullanıcı yönetimi, denetim kaydı.
- Roller: hastane personeli, hastane yöneticisi, il görüntüleyici, sistem yöneticisi; menü ve sayfalar yetkiye göre süzülür (güvenlik sunucudadır).
- Veri girişi: anlık doğrulama, odaklanan hata özeti, sunucunun alan bazlı hataları, çift gönderime karşı düğme kilidi + `Idempotency-Key`. Formda yalnız toplu sayılar (KVKK).
- Oturum: bitime 2 dk kala ekranı engellemeyen uyarı bandı, "Oturumu uzat", 401'de güvenli çıkış ve girişten sonra kalınan sayfaya dönüş, 429'da kilit ve kalan süre.
- Listeler: duyarlı tablo (dar ekranda kart), sayfalama ve tarih süzgeci adreste (geri/ileri çalışır), CSV (noktalı virgül, UTF-8 BOM, formül enjeksiyonu koruması).
- Aynı tasarım sistemi (sitenin `css/` dosyaları); ayrı görsel dil yok.

### Sözleşme
- Panel uçları taslağı: `docs/SOZLESME-PANEL.md`. Örnek arka uç `panel/js/mock.js`; `tools/mock-server.js` panel uçlarını HttpOnly çerezli oturumla sunar.

### Ortak dosyalarda küçük eklemeler
- `js/strings.js`: `extend()` (panelin kendi metin grubu) ve `format.dateTime()`.
- `js/mock-data.js`: örnek hastane listesi `SAMPLES` olarak dışa açıldı.

### Testler
- `tests/run-panel.js` (28), `tests/panel-contract.test.js` (13), `tests/panel-ui.test.js` (25, axe-core dahil).

## 1.1.0 — Yalnız devlet hastaneleri

### Sözleşme (küçük sürüm 1.1)
- Hastane kaydına zorunlu **`ownership`** alanı eklendi: `public` (devlet) | `private` (özel). Sunucu yalnız `public` göndermelidir.

### Arayüz
- Listede, haritada, özet kutularında ve öneri kutusunda **yalnız devlet hastaneleri** gösterilir (`js/config.js › ALLOWED_OWNERSHIP: ['public']`).
- `ownership` alanı olmayan ya da tanınmayan kayıt atlanır (tür bilinmeden gösterilmez).
- Metinler güncellendi: tanıtım başlığı ve açıklaması, "Veriler nereden geliyor?", altbilgi, sayfa açıklaması.
- Örnek veride tüm hastaneler "Örnek Devlet Hastanesi …" oldu; bozuk veri senaryosuna ayıklanması gereken bir özel hastane eklendi.

### Testler
- Özel hastanenin ayıklanması, `ownership` eksikliği, yalnız özel hastane içeren yanıt ve örnek verinin tamamının devlet hastanesi olması için yeni birim testleri.

## 1.0.0 — Aşama A (herkese açık site)

Önceki deneme sürümünün yerine baştan kuruldu. Başlıca değişiklikler:

### Mimari
- Sunucu biçimini bilen tek dosya **`js/schema.js`** eklendi (eşleme tablosu, güvenli tür dönüşümü, sınır denetimi, sürüm denetimi, hata kodu eşlemesi).
- **`js/api.js`** tek `request()` çekirdeğine geçti: 8 sn zaman aşımı, 5xx/ağ hatasında en çok 2 üstel beklemeli yeniden deneme, 429'da `Retry-After`, ETag/`If-None-Match`, "en son istek kazanır" iptali, kimlik doğrulama için tek kanca.
- Ortam seçimi (`mock | development | production`) `js/config.js`'te tek satır.
- Örnek veri yalnız `mock` ortamında yüklenir; aynı üretici `tools/mock-server.js` tarafından da kullanılır.
- Bilgi yaşı **sunucu saatiyle** hesaplanır (cihaz saati yanlış olsa da doğru).
- "Akşam 20:00" saati geçince "bugün için geçti" olur; gece yarısından sonra yeniden açılır.
- Harita görünür olunca ve tarayıcı boştayken yüklenir; Leaflet yerel kopyadır.

### Arayüz
- "Sakin güven" tasarım sistemi (`css/tokens.css`): yeni palet, 14·16·18·22·28·36 ölçeği, 4/8 boşluk ızgarası, katman ve hareket jetonları.
- Kaldırılanlar: manuel tema seçici (koyu tema yalnız sistem tercihiyle), favoriler, paylaş düğmesi, otomatik yenileme seçicisi, cam efekti ve hareketli arka plan.
- Kart: sol durum şeridi, sağda halka, "En kısa toplam süre" etiketi, "daha acil / acil olmayan başvurular" ifadeleri.
- Sunucu duyurusu (`notice`) bandı; "Veriler nereden geliyor?" bölümü; yazdırma görünümü; JS kapalı ve eski tarayıcı yedeği.

### Sözleşme
- **v1.0**: `GET /api/v1/hospitals` (`schemaVersion`, `generatedAt`, `region`, `notice`, `hospitals`), hata zarfı `{ error: { code, message } }`, `GET /api/v1/status`. Ayrıntı: `docs/SOZLESME.md`, `docs/hospitals.schema.json`.

### Testler ve araçlar
- `tests/run-unit.js`, `tests/unit.html`, `tests/contract.test.js`, `tests/ui.test.js`; `tools/mock-server.js`, `tools/check-contrast.js`, `tools/size-report.js`.

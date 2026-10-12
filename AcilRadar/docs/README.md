# AcilRadar — Ön yüz (Aşama A)

Yakındaki **devlet hastanelerinin** acil servislerinin **tahmini** yoğunluğunu ve "yol + kayıt + bekleme" toplam süresini karşılaştıran web arayüzü. Başlangıç bölgesi: Gebze ve çevresi. Veri şu an **örnek veridir (simülasyon)**.

> AcilRadar tıbbi karar aracı değildir. Muayene sırasını triyaj belirler. Hayati tehlikede 112 aranır.

- Yalnız HTML + CSS + sade JavaScript. Framework, derleme adımı ve npm bağımlılığı **yok**.
- Klasik `<script>` dosyaları: `index.html` çift tıklamayla (`file://`) da, herhangi bir statik sunucuda da açılır.
- Tek global ad: `window.AcilRadar` (alt modüller: `Config, Strings, Storage, Schema, Api, Mock, Calc, UI, App`).
- Tek dış kütüphane: Leaflet 1.9.4, **yerel kopya** (`vendor/leaflet/`). Harita karoları OpenStreetMap'ten gelir.

---

## 1. Çalıştırma

| Amaç | Komut / adım |
|---|---|
| Hızlıca bakmak | `index.html`'i tarayıcıda açın. (`config.js › ENVIRONMENT: 'mock'` — ağa çıkılmaz) |
| Gerçek ağ yolunu denemek | `node tools/mock-server.js` → http://localhost:8787 . `config.js`'te `ENVIRONMENT: 'production'` yapın (aynı kökten çalışır). |
| Durumları görmek (mock ortamı) | Adrese `?mock=empty`, `?mock=stale`, `?mock=broken`, `?mock=many`, `?mock=notice`, `?mock=error`, `?mock=ratelimit`, `?mock=unsupported` ekleyin. |
| Örnek sunucu senaryosu | `node tools/mock-server.js --scenario=slow` (ayrıca `offline`, `html`, `invalidjson` …) |

Gereken: güncel bir tarayıcı. Araçlar ve testler için Node 18+ (bağımlılıksız).

### Testler
| Test | Komut | Ne denetler |
|---|---|---|
| Birim + şema + API + kaynak taraması | `node tests/run-unit.js` | calc, schema, strings, mock; JSON şema; yeniden deneme/429/ETag/iptal; gömülü metin, innerHTML/eval yokluğu; Leaflet özeti |
| Birim (tarayıcıda, çizim/XSS dahil) | `tests/unit.html`'i açın | Aynı vakalar + kart/hata çizimi, XSS |
| Sözleşme | `node tools/mock-server.js &` sonra `MOCK_SCENARIOS=1 node tests/contract.test.js` | EK-1 sözleşmesi, şema, başlıklar, 304, hata zarfı, senaryolar |
| Gerçek arka uca karşı sözleşme | `BASE_URL=https://sunucu node tests/contract.test.js` | Aynı genel denetimler |
| Arayüz durum matrisi (isteğe bağlı) | `PLAYWRIGHT_MODULE=… AXE_PATH=…/axe.min.js node tests/ui.test.js` | Gerçek tarayıcıda 40 durum: yükleniyor/boş/hata/429/eski/çevrimdışı/konum/harita yok, 320–1440 px, 48 px hedefler, klavye, axe-core, yazdırma, JS kapalı … |
| Kontrast | `node tools/check-contrast.js` | Her yazı/zemin çifti (açık + koyu) |
| Boyut | `node tools/size-report.js` | JS + CSS boyut tablosu ve bütçe |

Playwright ve axe-core yalnız geliştirme yardımcısıdır (`npx playwright` ya da global kurulum); sayfa bunlara bağlı değildir.

---

## 2. Dosya haritası

```
index.html                 Sayfa iskeleti (bölümler 0–9). Metin içermez: data-text="anahtar".
404.html                   Bulunamadı sayfası (JS'siz).
favicon.svg                Simge.
css/tokens.css             Renk, tipografi, boşluk, yarıçap, gölge, katman, hareket jetonları; koyu tema.
css/base.css               Sıfırlama, tipografi, odak, düğmeler, form alanları, yedek içerik.
css/layout.css             Izgaralar ve kırılımlar (640 / 900 / 1200 px).
css/components.css         Bileşenler (katalog: docs/BILESENLER.md).
css/print.css              Yazdırma görünümü.
js/config.js               TÜM ayarlar (ortam, API, zaman seçenekleri, ilçeler, katsayılar, sınırlar).
js/strings.js              TÜM Türkçe metinler + text() + tr-TR biçimleri.
js/storage.js              Güvenli localStorage (yazı boyutu, ilçe).
js/schema.js               Sunucu biçimini bilen TEK dosya: doğrulama, eşleme, sürüm, hata kodları.
js/api.js                  Sunucuyla konuşan TEK dosya: zaman aşımı, yeniden deneme, ETag, iptal, kanca.
js/mock-data.js            Örnek veri (yalnız 'mock' ortamında yüklenir; mock-server da kullanır).
js/calc.js                 Saf hesaplar: mesafe, süre, eskime, filtre, sıralama, en kısa süre, özet.
js/app.js                  Tek state nesnesi, olaylar, yükleme, otomatik yenileme, bölüm bölüm çizim.
js/ui/dom.js               Ortak DOM yardımcıları ve simge seti.
js/ui/topbar.js            Üst çubuk: yazı boyutu (ES5 — eski tarayıcıda da çalışır).
js/ui/hero.js              Tanıtım alanındaki 3 özet kutusu.
js/ui/controls.js          Seçimler: konum, zaman, sıralama, filtre.
js/ui/pick.js              Öneri kutusu.
js/ui/cards.js             Hastane kartları.
js/ui/map.js               Harita (görünür olunca ve boştayken yüklenir).
js/ui/states.js            İskelet, boş, hata, bantlar, duyurular.
js/ui/info.js              Formül metni (config'ten) ve "Veriler nereden geliyor?".
vendor/leaflet/            Leaflet 1.9.4 (yerel kopya + lisans).
docs/                      Bu belge, BILESENLER, GUVENLIK, SOZLESME, DEGISIKLIK, hospitals.schema.json
tests/                     run-unit.js, unit.html, contract.test.js, ui.test.js, lib/, unit/
tools/                     mock-server.js, check-contrast.js, size-report.js
```

Katmanlar: **veri** (`api.js` + `schema.js`) → **hesap** (`calc.js`) → **çizim** (`ui/*`), `app.js` bağlar. Çizim dosyaları veri getirmez, durum değiştirmez.

---

## 3. Sık yapılacak değişiklikler

| Ne? | Nereyi değiştiririm? | Not |
|---|---|---|
| **Bir metni** | `js/strings.js` → metni bulun, tırnak içini değiştirin | `{name}` gibi parçaları silmeyin. HTML'deki metinler de buradan gelir. |
| **Bir rengi** | `css/tokens.css` | Sonra `node tools/check-contrast.js` çalıştırın; koyu tema bloğunu da güncelleyin. |
| **Karta yeni alan** (ör. "MR var") | 1) `js/schema.js › FIELD_MAP` + `FIELD_RULES`'a satır, 2) `js/ui/cards.js › buildTags()` ya da `detailRows()`'a satır, 3) metni `js/strings.js` | Sözleşmeye alan eklemek küçük sürümdür. |
| **İlçe eklemek** | `js/config.js › DISTRICTS`'e `{ id, lat, lng }` + `js/strings.js › districts`'e ad | |
| **Zaman seçeneği** eklemek | `js/config.js › TIME_SLOTS`'a `{ id }` (saatliyse `atHour/atMinute`) + `js/strings.js › time` | Arka uç `?at=<id>` değerini tanımalı. |
| **API adresi / ortam** | `js/config.js › ENVIRONMENT` (ve gerekirse `ENVIRONMENTS`) | Tek satır. |
| Bölge (`?region=`) | `js/config.js › REGION_ID`, `REGIONS` | `null` → parametre gönderilmez. |
| Hangi hastane türleri listelenir | `js/config.js › ALLOWED_OWNERSHIP` | Şu an yalnız `'public'` (devlet). Özel hastaneleri de göstermek için `['public', 'private']`. |
| "Güncel değil" eşiği | `js/config.js › STALE_AFTER_MINUTES` | |
| Otomatik yenileme | `js/config.js › AUTO_REFRESH_SECONDS` | |
| Yol tarifi servisi | `js/config.js › DIRECTIONS_URL_TEMPLATE` | Yalnız `{lat}`, `{lng}`. |
| Sunucu alan adı değişti | `js/schema.js › FIELD_MAP` (sağ taraf) | Başka dosya değişmez. |

---

## 4. Arka uca bağlama (5 adım)

1. Arka uç `GET /api/v1/hospitals?at=…&region=…` ucunu **[SOZLESME.md](SOZLESME.md)**'ye göre yazar; çıktısını `docs/hospitals.schema.json` ile doğrular.
2. Arka uç ekibi `BASE_URL=https://<sunucu> node tests/contract.test.js` çalıştırır; tümü yeşil olmalı.
3. Ön yüz aynı alan adından sunulacaksa `js/config.js`'te `ENVIRONMENT: 'production'` yapın (`apiBaseUrl: ''`). Farklı adresteyse `ENVIRONMENTS.production.apiBaseUrl`'e tam adresi yazın ve CORS başlıklarını açın (SOZLESME.md › CORS).
4. Sunucu [GUVENLIK.md](GUVENLIK.md)'deki başlıkları (CSP dahil) gönderir; API başka kökteyse `connect-src`'e eklenir.
5. Örnek veri bandının kalktığını (gerçek `dataSource`) ve kartların göründüğünü kontrol edin. `js/mock-data.js` canlıda yüklenmez; isterseniz silebilirsiniz.

### Yayına alma notları
- `index.html`'deki `<link rel="canonical" href="./">` gerçek **mutlak adresle** değiştirilmelidir; pilot dönemde arama motorlarında görünmesi istenmiyorsa `robots` → `noindex, nofollow`.
- Sunucu 404'leri `404.html`'e yönlendirmelidir.
- HTTPS zorunludur ("Konumumu kullan" HTTPS ister).

---

## 5. Sorun giderme

| Belirti | Olası neden | Çözüm |
|---|---|---|
| "Sunucuya ulaşılamadı" | API adresi yanlış, sunucu kapalı, CORS | Tarayıcı konsolunda `[AcilRadar] İstek başarısız` satırına bakın; adres ve CORS başlıklarını kontrol edin. |
| "Hizmet güncellemesi gerekiyor" | `schemaVersion` ana sürümü 1 değil | Sunucu 1.x döndürmeli ya da ön yüz yeni sürüme uyarlanmalı. |
| "Bilgiler okunamadı" | Yanıt JSON değil (HTML hata sayfası) ya da tüm kayıtlar geçersiz | Konsoldaki "kayıt atlandı" uyarıları hangi alanın eksik olduğunu yazar. |
| Bazı hastaneler görünmüyor | Zorunlu alan eksik/geçersiz | Konsol uyarısı alan adını verir; `docs/hospitals.schema.json` ile doğrulayın. |
| Kartlarda "güncel bilgi yok" | `updatedAt` 30 dk'dan eski ya da `generatedAt`'tan ileride | Sunucu saatini ve güncelleme akışını kontrol edin. |
| Harita yerine bilgi kutusu | `vendor/leaflet/` erişilemiyor ya da engellendi | Dosyaların sunulduğunu ve CSP `script-src 'self'` olduğunu kontrol edin. |
| Harita gri | Karolar yüklenmiyor (ağ, CSP `img-src`) | `img-src https://tile.openstreetmap.org` ekli mi? |
| "Konumumu kullan" çalışmıyor | HTTP üzerinden açılmış ya da izin verilmedi | HTTPS kullanın; kullanıcı ilçeyi listeden seçebilir. |
| Tercihler hatırlanmıyor | Tarayıcı depolaması kapalı | Uygulama çalışmaya devam eder; tercih yalnız o oturumda geçerlidir. |

# AcilRadar — Ön yüz (Aşama A: halka açık site · Aşama B: hastane paneli)

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

### Hastane paneli (Aşama B)

| Amaç | Komut / adım |
|---|---|
| Örnek sunucuyla açmak | `panel/index.html`'i açın (`panel/js/config.js › ENVIRONMENT: 'mock'`). |
| Gerçek ağ yolu + çerezli oturum | `node tools/mock-server.js` → http://localhost:8787/panel/ ve `ENVIRONMENT: 'production'` |
| Örnek hesaplar (yalnız örnek sunucuda) | `personel@ornek.test` (hastane personeli) · `yonetici@ornek.test` (hastane yöneticisi) · `il@ornek.test` (il görüntüleyici) · `sistem@ornek.test` (sistem yöneticisi) — parola: `Ornek-Parola-1` |

Panel testleri: `node tests/run-panel.js` (birim) · `node tests/panel-contract.test.js` (mock-server açıkken) · `PLAYWRIGHT_MODULE=… AXE_PATH=… node tests/panel-ui.test.js` (tarayıcı).

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
tests/                     run-unit.js, unit.html, contract.test.js, ui.test.js, lib/, unit/,
                           run-panel.js, panel-contract.test.js, panel-ui.test.js
tools/                     mock-server.js (site + panel uçları), check-contrast.js, size-report.js

panel/index.html           Panelin tek sayfalık iskeleti (#/giris, #/ozet, #/veri-girisi, #/gecmis,
                           #/kullanicilar, #/denetim-kaydi, #/parolami-unuttum, #/iki-adimli-dogrulama)
panel/css/panel.css        Panele özgü yerleşim (renk/bileşenler sitenin css/ dosyalarından)
panel/js/config.js         Panel ayarları: ortam, uç yolları, oturum, ROL → YETKİ tablosu, form sınırları
panel/js/strings.js        Paneldeki TÜM Türkçe metinler ("panel" grubu)
panel/js/rules.js          SAF kurallar: yetki denetimi ve form doğrulama
panel/js/schema.js         Panelde sunucu biçimini bilen TEK dosya (eşleme + alan hataları)
panel/js/api.js            Panelde sunucuyla konuşan TEK dosya (çerez, CSRF başlığı, Idempotency-Key, 401, 429)
panel/js/mock.js           Örnek arka uç (yalnız 'mock' ortamında yüklenir; mock-server de kullanır)
panel/js/csv.js            CSV oluşturma ve indirme
panel/js/ui/               shell (çerçeve, menü, oturum bandı), form (alan, hata özeti), table (tablo, sayfalama, süzgeç)
panel/js/screens/          Ekranlar: login, dashboard, entry, history, users, audit, common
panel/js/app.js            Yönlendirme, oturum, 401'de güvenli çıkış ve geri dönüş
```

Panel katmanları: **veri** (`api.js` + `schema.js`) → **kurallar** (`rules.js`) → **ekranlar** (`screens/*`: veriyi ister, ortak `ui/*` parçalarıyla çizer) → `app.js` bağlar.

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
| **Panel:** bir rolün yetkisini değiştirmek | `panel/js/config.js › ROLE_CAPABILITIES`, `ASSIGNABLE_ROLES` | Sunucudaki yetki tablosu da AYNI değiştirilmeli. |
| **Panel:** form sınırı (ör. en çok hekim) | `panel/js/config.js › RECORD_LIMITS` | Sunucu doğrulaması da güncellenmeli. |
| **Panel:** metin | `panel/js/strings.js` | |
| **Panel:** API ortamı | `panel/js/config.js › ENVIRONMENT` | Adres sitenin `ENVIRONMENTS` tablosundan gelir. |
| **Panel:** oturum uyarı zamanı / sayfa boyutu | `panel/js/config.js › SESSION_WARNING_SECONDS`, `PAGE_SIZE` | |
| **Panel:** sunucu alan adı değişti | `panel/js/schema.js › RECORD_MAP`, `USER_MAP` | |

---

## 4. Arka uca bağlama (5 adım)

1. Arka uç `GET /api/v1/hospitals?at=…&region=…` ucunu **[SOZLESME.md](SOZLESME.md)**'ye göre yazar; çıktısını `docs/hospitals.schema.json` ile doğrular.
2. Arka uç ekibi `BASE_URL=https://<sunucu> node tests/contract.test.js` çalıştırır; tümü yeşil olmalı.
3. Ön yüz aynı alan adından sunulacaksa `js/config.js`'te `ENVIRONMENT: 'production'` yapın (`apiBaseUrl: ''`). Farklı adresteyse `ENVIRONMENTS.production.apiBaseUrl`'e tam adresi yazın ve CORS başlıklarını açın (SOZLESME.md › CORS).
4. Sunucu [GUVENLIK.md](GUVENLIK.md)'deki başlıkları (CSP dahil) gönderir; API başka kökteyse `connect-src`'e eklenir.
5. Örnek veri bandının kalktığını (gerçek `dataSource`) ve kartların göründüğünü kontrol edin. `js/mock-data.js` canlıda yüklenmez; isterseniz silebilirsiniz.

### Paneli arka uca bağlama
1. Arka uç [SOZLESME-PANEL.md](SOZLESME-PANEL.md)'deki uçları yazar (oturum çerezi, CSRF başlığı, Idempotency-Key, rol tablosu sunucuda).
2. Test ortamında `BASE_URL=… STAFF_EMAIL=… ADMIN_EMAIL=… PANEL_PASSWORD=… STAFF_HOSPITAL=… node tests/panel-contract.test.js` yeşil olmalı.
3. Panel, API ile **aynı kökten** sunulur (ör. `https://alanadi/panel/`); `panel/js/config.js › ENVIRONMENT: 'production'`.
4. Örnek veri bandı ("ÖRNEK SUNUCU") kendiliğinden kalkar; `panel/js/mock.js` canlıda yüklenmez.

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
| Panel: girişten hemen sonra yine giriş ekranı | Çerez gitmiyor (farklı köken, `Secure` çerez HTTP'de, `Path` yanlış) | Paneli API ile aynı kökten ve HTTPS ile sunun; çerez `Path=/api`. |
| Panel: kaydederken "yetkiniz yok" | CSRF başlığı sunucuya ulaşmıyor ya da rol/kapsam uymuyor | Vekil sunucu `X-AcilRadar-Client` başlığını silmemeli; rol tablosunu karşılaştırın. |
| Panel: menüde beklenen sayfa yok | Rolün yetkisi yok | `panel/js/config.js › ROLE_CAPABILITIES` ve sunucudaki tablo aynı mı? |

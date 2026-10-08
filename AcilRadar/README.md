# AcilRadar — Ön yüz (front-end)

Gebze ve çevresindeki acil servislerin **tahmini** yoğunluğunu ve “yol + kayıt + bekleme” toplam süresini karşılaştıran web arayüzü.

> **AcilRadar tıbbi karar aracı değildir.** Muayene sırasını triyaj belirler. Hayati tehlikede 112 aranır.
> Şu an gösterilen veriler **simülasyondur** (`js/mock-data.js`); hastane adları “Örnek Hastane …” biçimindedir.

- Yalnızca HTML + CSS + sade JavaScript. **Framework, npm ve derleme adımı yok.**
- Harita: Leaflet 1.9.4 (unpkg, SRI karmasıyla) + OpenStreetMap karoları.
- Tek global ad: `window.AcilRadar`. Klasik `<script>` dosyaları (`type="module"` yok).
- Arayüz yalnızca Türkçe; **tüm metinler `js/strings.js` içinde**.

---

## 1. Kurulum ve çalıştırma

İki yol da çalışır:

| Yol | Nasıl | Not |
|---|---|---|
| Dosyayı doğrudan açmak | `index.html`’e çift tıklayın (`file://`) | Uygulama çalışır. OpenStreetMap bazı durumlarda `file://` sayfalarına harita karosu vermeyebilir; liste ve hesaplar etkilenmez. |
| Basit sunucu (önerilir) | Klasörde `python3 -m http.server 8080` → `http://localhost:8080` | PHP sunucusu da olur: `php -S localhost:8080` |

Testler: tarayıcıda `tests/smoke-test.html` açın. Tümü yeşil olmalı. `file://` ile açılırsa kaynak dosya taraması yapan 3 test “atlandı” görünür (tarayıcı `file://` üzerinden dosya okumaya izin vermez); sunucuyla açınca hepsi çalışır.

Sahte veride farklı durumları denemek için (yalnızca `USE_MOCK: true` iken) adrese ekleyin:
`?mock=empty` (boş sonuç) · `?mock=error` (hata) · `?mock=invalid` (bozuk yanıt) · `?mock=legacy` (eski biçim).
“Veri güncel değil” durumu normal senaryoda bir örnek hastanede (Körfez) bilerek gösterilir.

---

## 2. Dosya haritası

Her dosyanın tek sorumluluğu vardır; her dosyanın başında **NE İŞE YARAR / NEYİ ALIR-VERİR / NEYİ DEĞİŞTİRMEK İÇİN BURAYA BAK** bloğu bulunur.

```
index.html              Sayfa iskeleti (numaralı bölümler 0–11). Metin İÇERMEZ; data-text="anahtar" kullanır.
css/tokens.css          Renk, aralık, yarıçap, gölge, yazı boyutu kademeleri; açık/koyu tema.
css/base.css            Sıfırlama, tipografi, düğme, form alanı, odak halkası, yardımcı sınıflar.
css/layout.css          Izgaralar ve kırılımlar (640 / 900 / 1200 px).
css/components.css      Kart, halka, rozet, kutucuk, öneri kutusu, harita işaretçisi, iskelet, bildirim.
js/config.js            TÜM ayarlar: API adresi, USE_MOCK, ilçeler, katsayılar, süreler, FEATURES.
js/strings.js           TÜM Türkçe metinler (STRINGS) + text(), textList(), format (Intl tr-TR).
js/storage.js           Güvenli localStorage: tercihler ve favoriler (erişilemezse bellekte).
js/api.js               Sunucuyla konuşan TEK dosya: fetch, 8 sn zaman aşımı, 1 yeniden deneme, doğrulama.
js/mock-data.js         Sahte veri (arka uç sözleşmesiyle birebir aynı biçim).
js/calc.js              SAF hesaplar: mesafe, süre, filtre, sıralama, öneri, özet (DOM yok).
js/ui/dom.js            Ortak DOM yardımcıları: el(), icon(), escapeHtml(), sabit metinleri yerleştirme.
js/ui/header.js         Üst çubuk: yazı boyutu, tema, "Görünüm" paneli.
js/ui/summary.js        Üç özet kutusu ve "Son güncelleme".
js/ui/controls.js       Konum, zaman, arama, filtre, sıralama, yenileme denetimleri.
js/ui/cards.js          Hastane kartları ve öneri kutusu.
js/ui/map.js            Leaflet haritası, numaralı işaretçiler, vurgulama.
js/ui/states.js         İskelet, boş/hata kutuları, bantlar, duyurular, bildirim.
js/app.js               Durum (state), olaylar, akış: init → load → recompute → render.
tests/smoke-test.html   Tarayıcıda çalışan duman testleri.
```

**Katmanlar karışmaz:** `api.js` veriyi getirir → `calc.js` hesaplar → `ui/*` çizer → `app.js` bunları bağlar. Çizim dosyaları veri getirmez, durumu değiştirmez.

---

## 3. Sık yapılacak değişiklikler

| Ne yapmak istiyorum? | Nereyi değiştiririm? |
|---|---|
| **Bir cümleyi / düğme yazısını değiştirmek** | `js/strings.js` → metni bulun, tırnak içini değiştirin. Kod değişmez. (Aşağıda ayrıntı var.) |
| Gerçek arka uca bağlanmak | `js/config.js` → `USE_MOCK: false`, `API_URL: '…'` (bkz. bölüm 4) |
| Otomatik yenileme süresi / seçenekleri | `js/config.js` → `AUTO_REFRESH` |
| “Veri güncel değil” eşiği | `js/config.js` → `STALE_AFTER_MINUTES` |
| Yol hızı, yol çarpanı, kayıt süresi | `js/config.js` → `TRAVEL`, `REGISTRATION_MINUTES` (sayfadaki formül metni kendiliğinden güncellenir) |
| İlçe eklemek | `js/config.js` → `DISTRICTS`’e `{ id, lat, lng }` + `js/strings.js` → `districts`’e adını |
| Bir özelliği kapatmak (favori, paylaş, otomatik yenileme, arama) | `js/config.js` → `FEATURES` |
| Renkler, köşe yuvarlaklığı, gölge | `css/tokens.css` (koyu tema iki blokta: ikisini birlikte değiştirin) |
| Yazı boyutu kademeleri (A− / A / A+) | `css/tokens.css` → `[data-text-size]` |
| Karta yeni bir alan eklemek | `js/api.js` → `normalizeHospital()` + `js/ui/cards.js` → `buildTags()` ya da `buildDetails()` + metni `js/strings.js` |
| Yeni filtre eklemek | `js/app.js` dosyasının başındaki 4 adımlık açıklamaya bakın |
| Yol tarifi için başka harita servisi | `js/config.js` → `DIRECTIONS_URL_TEMPLATE` (yalnızca `{lat}` ve `{lng}`) |
| Sahte hastaneleri değiştirmek | `js/mock-data.js` → `SAMPLE_HOSPITALS` |

### Metin değiştirme (adım adım)

1. Sayfada değiştirmek istediğiniz cümleyi kopyalayın (ör. “Konumumu kullan”).
2. `js/strings.js` içinde arayın (Ctrl+F). Şöyle bir satır bulursunuz: `useLocation: 'Konumumu kullan',`
3. Tırnak içindeki metni değiştirin ve kaydedin. Sayfayı yenileyin. Bitti.

Kurallar:
- `{name}`, `{min}`, `{max}` gibi süslü parantezli parçalar kod tarafından doldurulur; **silmeyin**, cümlede yerini değiştirebilirsiniz.
  Örnek: `minutesRange: '{min}–{max} dk.'` → `'{min} ile {max} dakika'` olabilir.
- Metnin içinde tek tırnak gerekiyorsa tipografik kesme işareti (`’`) kullanın: `'112’yi arayın'`.
- HTML’deki sabit metinler de buradan gelir: `index.html`’de `data-text="hero.title"` gören bir öğe, `STRINGS.hero.title` metnini gösterir.
- Değişiklikten sonra `tests/smoke-test.html`’i açın: eksik anahtar ya da boş metin varsa kırmızı görünür.
- Tek istisna: JavaScript kapalıyken görünen `<noscript>` metni `index.html` içindedir.

---

## 4. Arka uca bağlama

### Adımlar
1. `js/config.js` dosyasını açın.
2. `USE_MOCK: true` → `USE_MOCK: false` yapın.
3. `API_URL` değerini arka ucun adresiyle değiştirin. Aynı sunucudaysa göreli yol yeterlidir (varsayılan: `'api/hospitals.php'`); başka bir alan adındaysa tam `https://…` adresi yazın.
4. Sayfayı yenileyin. Başka hiçbir dosya değişmez.
5. (İsteğe bağlı) `index.html`’den `js/mock-data.js` satırını kaldırabilirsiniz.

> Arka uç farklı bir alan adındaysa (CORS), sunucu `Access-Control-Allow-Origin` başlığını göndermelidir. Sayfadaki İçerik Güvenlik Politikası (`index.html` › `<meta http-equiv="Content-Security-Policy">`) aynı sunucuya ve her `https://` adrese bağlantıya izin verir; `http://` bir adres kullanacaksanız `connect-src` kısmına ekleyin.

### İstek
```
GET {API_URL}?at=now        (now | 2h | evening)
```
- Konum, kimlik ve çerez **gönderilmez** (`credentials: 'omit'`, `referrerPolicy: 'no-referrer'`).
- Zaman aşımı 8 sn; ağ hatası, zaman aşımı ya da 5xx durumunda **1 kez** yeniden denenir. 4xx yeniden denenmez.

### Yanıt (HTTP 200, `application/json`)
```json
{
  "meta": { "generatedAt": "2026-10-06T13:35:00+03:00", "dataSource": "simulated" },
  "hospitals": [
    {
      "hospitalId": "h1", "name": "Örnek Devlet Hastanesi", "district": "Gebze",
      "lat": 40.806, "lng": 29.435, "childER": true,
      "occupancyPercent": 62, "crowdingLevel": "medium",
      "greenWaiting": 34, "yellowWaiting": 9, "activePhysicians": 6,
      "estimatedGreenWaitMinutes": [58, 82], "estimatedYellowWaitMinutes": [7, 15],
      "updatedAt": "2026-10-06T13:35:00+03:00", "isForecast": false,
      "dataSource": "simulated"
    }
  ]
}
```
- `meta` isteğe bağlıdır; eski biçim `{ "hospitals": [...] }` da çalışır.
- **Zorunlu alanlar:** `hospitalId`, `name`, `district`, `lat`, `lng`, `occupancyPercent` (0–100), `crowdingLevel` (`low|medium|high`), `estimatedGreenWaitMinutes` (`[alt, üst]`, alt ≤ üst), `updatedAt` (ISO 8601, saat dilimiyle).
- İsteğe bağlı: `childER`, `greenWaiting`, `yellowWaiting`, `activePhysicians`, `estimatedYellowWaitMinutes`, `isForecast`, `dataSource` (`simulated|hospital|official`).
- Zorunlu alanı eksik/hatalı kayıt **atlanır** ve tarayıcı konsoluna hangi alanın sorunlu olduğu yazılır. Hiçbir kayıt geçerli değilse ya da `hospitals` dizisi yoksa kullanıcıya Türkçe hata gösterilir.
- Bilinmeyen (yeni) alanlar yok sayılır; ön yüz bozulmaz.
- `dataSource` (meta ya da herhangi bir kayıtta) `"simulated"` ise sayfa üstünde “SİMÜLASYON” bandı ve kartlarda etiket görünür; gerçek veri gelince kendiliğinden kalkar.
- `updatedAt`, `STALE_AFTER_MINUTES`’tan (varsayılan 30 dk) eskiyse o hastanenin süre ve yoğunluk bilgisi **gizlenir**.

### Hata
```
HTTP 4xx/5xx
{ "error": "Kullanıcıya gösterilebilir kısa ileti" }
```
`error` metni hata kutusunda “Sunucu iletisi: …” olarak (HTML kaçışlanarak) gösterilir.

---

## 5. Süre hesabı (özet)

```
yol mesafesi  = kuş uçuşu mesafe × ROAD_FACTOR (1,3)
yol süresi    = [ max(MIN_TRAVEL, mesafe / AVERAGE_SPEED_KMH × 60),  × TRAFFIC_FACTOR_MAX (1,4) ]
toplam        = yol + REGISTRATION_MINUTES [5, 10] + estimatedGreenWaitMinutes
```
Her zaman aralık olarak gösterilir. Aynı açıklama sayfada “Süre nasıl hesaplanıyor?” bölümünde, config değerleriyle birlikte yer alır.

---

## 6. Gizlilik ve güvenlik

- Konum yalnızca tarayıcıda, mesafe hesabı için kullanılır; **hiçbir isteğe eklenmez, saklanmaz.** “Yol tarifi al” bağlantısı da yalnızca hastanenin koordinatını içerir.
- Çerez yok, analitik/reklam/izleyici yok.
- `localStorage`’da yalnızca: yazı boyutu, tema, son seçilen ilçe, favori hastane kimlikleri (`acilradar.prefs`, `acilradar.favorites`). Sayfadaki “Saklanan tercihlerimi sil” düğmesi bunları siler.
- Sunucudan gelen tüm metinler `textContent` ile yazılır (XSS’e karşı); `innerHTML`’e dış metin gitmez. `eval` ve satır içi olay işleyici yoktur.
- Sıralama yalnızca nesnel ölçütlerle yapılır (toplam süre, mesafe, yoğunluk); eşitlikte alfabetik. Sponsorlu/öne çıkarılmış sıralama yoktur.

---

## 7. Erişilebilirlik

WCAG 2.2 AA hedeflenmiştir: tek `h1`, doğru başlık sırası, “İçeriğe atla”, belirgin odak halkası, en az 48 px dokunma alanları, `aria-live` duyuruları, `aria-pressed` / `aria-expanded`, etiketli form alanları; durum her yerde renk + yazı + simgeyle verilir; `prefers-reduced-motion` desteklenir; açık ve koyu temada metin kontrastı ≥ 4,5:1.

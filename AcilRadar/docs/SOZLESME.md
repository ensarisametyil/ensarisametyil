# AcilRadar · Veri sözleşmesi (EK-1) — sürüm 1.x (güncel: 1.2)

Bu belge arka uç ile ön yüzün **tek temas noktasıdır**. Arka uç hangi dille yazılırsa yazılsın (PHP, Node, başka), bu sözleşmeye uyduğu sürece ön yüzde hiçbir dosya değişmez; yalnızca `js/config.js` içindeki ortam satırı değişir.

- Makine tarafından okunabilir şema: [`docs/hospitals.schema.json`](hospitals.schema.json) (JSON Schema 2020-12)
- Sözleşme testi: `BASE_URL=https://sunucu node tests/contract.test.js`

---

## EK-1 (aynen)

Genel: JSON, UTF-8, tarih ISO 8601 (+03:00 ofsetli), süreler dakika, koordinat WGS84 ondalık derece. Konum bilgisi SUNUCUYA GÖNDERİLMEZ.

```
GET /api/v1/hospitals?at=now|2h|evening&region=gebze   (region isteğe bağlı)
200 → {
  "schemaVersion": "1.0",
  "generatedAt": "2026-10-12T22:00:00+03:00",
  "region": "gebze",
  "notice": null | { "level":"info|warning", "text":"Kısa Türkçe duyuru" },       // isteğe bağlı; arayüz bant olarak gösterir
  "hospitals": [ {
    "hospitalId": "h1",                       // zorunlu, benzersiz, kısa metin
    "name": "Örnek Devlet Hastanesi",         // zorunlu
    "district": "Gebze",                      // zorunlu
    "lat": 40.806, "lng": 29.435,             // zorunlu
    "childER": true,                          // isteğe bağlı (varsayılan false)
    "occupancyPercent": 62,                   // zorunlu, 0-100
    "crowdingLevel": "medium",                // zorunlu: low | medium | high
    "greenWaiting": 34, "yellowWaiting": 9,   // isteğe bağlı sayılar
    "activePhysicians": 6,                    // isteğe bağlı
    "estimatedGreenWaitMinutes": [58, 82],    // zorunlu, [en az, en çok]
    "estimatedYellowWaitMinutes": [7, 15],    // zorunlu, [en az, en çok]
    "updatedAt": "2026-10-12T21:55:00+03:00", // zorunlu
    "isForecast": false,                      // zorunlu (at=now dışında true olabilir)
    "dataSource": "simulated"                 // zorunlu: simulated | hospital | official
  } ]
}
Hata: 4xx/5xx → { "error": { "code": "RATE_LIMITED|BAD_REQUEST|UNAVAILABLE|INTERNAL", "message": "..." } }
Başlıklar: Content-Type: application/json; charset=utf-8 · Cache-Control: public, max-age=30 · ETag · (429'da Retry-After).
GET /api/v1/status → { "ok": true, "time": "...", "dataUpdatedAt": "..." }   (sağlık denetimi)
Panel uçları (AŞAMA B; ayrıntı arka uç ile birlikte kesinleşir, arayüz bunlara göre mock yazar):
  POST /api/v1/auth/login · POST /api/v1/auth/logout · GET /api/v1/auth/me
  GET/POST /api/v1/panel/hospitals/{id}/records · GET /api/v1/panel/audit · GET/POST/PATCH /api/v1/panel/users
Değişiklik kuralı: alan ADI veya TÜRÜ değişirse ana sürüm artar (v2); alan EKLEMEK küçük sürümdür ve istemciyi bozmaz.
```

---

## Sürüm 1.2 eki — doluluk motoru alanları (hepsi İSTEĞE BAĞLI)

Doluluk hesaplama motoru (`motor/`) hastane kaydına aşağıdaki alanları **ekleyebilir**. Hiçbir mevcut alanın adı ya da türü değişmedi; alan eklemek küçük sürümdür (`schemaVersion: "1.2"`), eski istemci bozulmaz.

**Hibrit yöntem (motor 2.2.0):** geriye dönük testte benzetim motoru doluluk tahmininde basit yöntemlerden tutarlı biçimde iyi çıkmadığı için sayılar ufka göre farklı yöntemlerle üretilir (`motor/docs/MODEL_KARTI.md` §8):

| Çıktı | Yöntem |
|---|---|
| `occupancyPercent`, `at=now` ve +60 dk'ya kadar | Süreklilik: hastanenin bildirdiği güncel doluluk aynen kalır |
| `occupancyPercent`, `at=2h` | Mevsimsel ortalama: aynı saat-gün diliminin geçmiş ortalaması (≥ 2 örnek; yoksa süreklilik ve `assumedFields` içinde `occupancyHistory`) |
| `occupancyPercent`, `at=evening` | Mevsimsel ortalama (geçmiş yoksa kayıt gönderilmez) |
| `estimatedGreenWaitMinutes`, `at=now` | Motor (benzetim) |
| `estimatedYellowWaitMinutes`, `at=now` | Motor (4 sentetik rejimde bugünkü sabit aralıktan daha iyi ölçüldü; `config.HYBRID.YELLOW_NOW_ENGINE` ile kapatılabilir) |
| Bekleme, `at=2h` ve `at=evening` | Bugünkü ürün formülü: bekleyen ÷ hekim × 9 dk (üst uç ×1,4); sarı için sabit 5–20 dk |
| `greenWaiting`, `yellowWaiting` | Hastanenin bildirdiği güncel sayılar (her dilimde) |
| `activePhysicians` | `now`: bildirilen; ileri dilimde: vardiya çizelgesi varsa o saatteki sayı |

Süre aralıklarının üst ucu en az alt uç + 5 dk'dır ("süre daima aralıktır").

| Alan | Tür | Anlam |
|---|---|---|
| `confidence` | `low` · `medium` · `high` | **Yalnız `at=now`'da gönderilir ve "şimdi" yeşil bekleme tahmininin** güvenidir (kurallar: `motor/docs/MODEL_KARTI.md`). Doluluk tahmini için gönderilmez; arayüz yalnız `now` diliminde gösterir |
| `factors` | en çok 3 × `{ key, text, points, target }` | **Yalnız `at=now`'da**; `target` her zaman `"greenWait"` (yeşil bekleme) ve `points` **dakikadır**. `key`: `queue`, `seasonal`, `holiday`, `surge`, `shift`, `boarding`. **Arayüz `key`, `points`, `target` okur**; cümleyi kendi metinlerinden kurar (`text` gösterilmez). `target` olmayan ya da başka hedefli etken arayüzde yok sayılır |
| `modelVersion` | metin | Çıktıyı üreten motor/yöntem takımının sürümü (ör. `"2.2.0"`); hibrit yöntem seçimi bu sürüme bağlıdır |
| `definition` | `capacity` · `index` | Kullanılan doluluk tanımı (şimdilik yalnız `capacity`) |
| `assumedFields` | metin dizisi | Varsayılan değerle doldurulan girdi alanları |
| `simulated` | boolean | `true`: sayılar örnek veriden üretildi (bu durumda `isForecast` da `true`) |
| `occupancyRange`, `overCapacityShare` | — | Hibrit yöntemde **gönderilmez** (süreklilik ve mevsimsel ortalama aralık üretmez). Şemada kalır; ileride bir yöntem aralık üretirse kullanılır |

- `dataSource` girdinin kaynağını aynen yansıtır (`simulated`, `hospital`, `official`); mevsimsel ortalama aynı hastanenin geçmiş bildirimlerinden hesaplandığı için kaynak değişmez.
- `crowdingLevel`, `occupancyPercent` değerinden eşiklerle türetilir (orta ≥ 50, çok ≥ 80).
- Bilgi bayatsa motor sayı üretmez; sunucu o hastaneyi eski `updatedAt` ile gönderir ve arayüz "güncel bilgi yok" gösterir (değişmedi).
- `at=evening` 20:00'den sonra istenmez (arayüz göndermez); motor bu durumda akşam kaydı üretmez.

## Sürüm 1.1 eki — yalnız devlet hastaneleri

Ürün kararı: listede **yalnız devlet hastaneleri** yer alır. Bunun için her hastane kaydına aşağıdaki alan eklendi (alan eklemek küçük sürümdür; `schemaVersion: "1.1"`):

```
"ownership": "public"        // zorunlu: public (devlet hastanesi) | private (özel hastane)
```

- **Sunucu yalnız `public` kayıtları göndermelidir.** Özel hastaneler yanıta hiç girmemelidir.
- Arayüz ek güvence olarak `ownership` değeri `public` olmayan kaydı **göstermez** (uyarı yazmaz; `config.js › ALLOWED_OWNERSHIP`).
- `ownership` alanı **yoksa** ya da tanınmayan bir değerse kayıt **atlanır** ve konsola yazılır (tür bilinmeden devlet hastanesi diye gösterilmez).
- Yanıtta yalnız özel hastane varsa arayüz hata değil, "bu bölge için bilgi yok" durumunu gösterir.

---

## Açıklamalar ve netleştirmeler

### Parametreler
| Parametre | Değerler | Not |
|---|---|---|
| `at` | `now`, `2h`, `evening` | Zorunlu. Bilinmeyen değer → `400 BAD_REQUEST`. "evening" bugünün 20:00'sidir (Türkiye saati); 20:00 geçtiyse arayüz bu seçeneği zaten göndermez. |
| `region` | `gebze`, `kocaeli`, `istanbul-anadolu` | İsteğe bağlı. Bilinmeyen değer → `400 BAD_REQUEST`. Arayüz şu an `gebze` gönderir (`config.js › REGION_ID`). |

Yeni bir değer eklemek **küçük sürümdür**; arayüzde yalnız `js/config.js` (+ etiketi `js/strings.js`) değişir.

### Alan adları (sunucu → arayüz iç modeli)
Arayüzde sunucu biçimini bilen tek dosya `js/schema.js`'tir; eşleme tablosu `FIELD_MAP`'tedir. Arayüzde "yeşil/sarı alan" ifadeleri kullanılmaz:

| Sunucu | Arayüzde görünen anlam |
|---|---|
| `greenWaiting`, `estimatedGreenWaitMinutes` | Acil olmayan başvurular |
| `yellowWaiting`, `estimatedYellowWaitMinutes` | Daha acil başvurular |

### İstemcinin tolerans kuralları (sunucunun bilmesi gerekenler)
- **Zorunlu alanı** eksik ya da geçersiz olan **kayıt atlanır**, diğerleri gösterilir. Hiçbir kayıt geçerli değilse arayüz "bilgiler okunamadı" der.
- Sayılar metin olarak gelirse (`"62"`) güvenle çevrilir; sayı olmayan metin geçersizdir.
- `occupancyPercent` 0–100 dışına çıkarsa sınıra çekilir; bekleyen/hekim sayıları 0–9999 aralığına çekilir.
- Süre aralığında `en az > en çok` veya 1440 dakikayı aşan değer **geçersizdir** (tahmin uydurulmaz).
- Aynı `hospitalId` ikinci kez gelirse ikincisi atlanır. En fazla 500 kayıt işlenir.
- **Bilinmeyen alanlar sessizce yok sayılır** (küçük sürüm uyumu).
- `crowdingLevel` / `dataSource` için yeni bir değer eklenmesi istemciyi bozar (kayıt atlanır); bu yüzden **ana sürüm** değişikliği sayılır.

### Zaman ve eskime
- Bilginin yaşı **sunucu saatiyle** hesaplanır: `yaş = (generatedAt − updatedAt) + yanıttan bu yana geçen süre`. Cihaz saati yanlış olsa da sonuç doğrudur. Bu yüzden `generatedAt` **mutlaka** gönderilmelidir.
- Yaş 30 dakikayı aşarsa (`config.js › STALE_AFTER_MINUTES`) o hastanenin süre ve yoğunluğu **gösterilmez**.
- `updatedAt`, `generatedAt`'tan 5 dakikadan fazla ilerideyse kayıt güvenilmez sayılır ve sayısal bilgi gösterilmez.

### Sürümleme
- `schemaVersion` **"1.x"** biçimindedir. Ana sürüm 1 değilse arayüz "Hizmet güncellemesi gerekiyor" ekranını gösterir ve konsola ayrıntı yazar.
- `schemaVersion` hiç yoksa 1.0 varsayılır (konsola uyarı yazılır). Lütfen her zaman gönderin.

### Hata kodları
Sunucunun `message` alanı **kullanıcıya gösterilmez** (günlük/hata ayıklama içindir). Arayüz yalnız `code` değerine bakar:

| HTTP | `error.code` | Arayüzün yaptığı |
|---|---|---|
| 400 | `BAD_REQUEST` | Yeniden denemez; "İstek anlaşılamadı" der. |
| 429 | `RATE_LIMITED` | Yeniden denemez; `Retry-After` (saniye ya da HTTP tarihi, en çok 900 sn) dolmadan otomatik yenilemez. |
| 503 | `UNAVAILABLE` | Üstel beklemeyle en çok 2 kez yeniden dener. |
| 5xx | `INTERNAL` | Üstel beklemeyle en çok 2 kez yeniden dener. |
| — | tanınmayan kod | HTTP durumuna göre eşlenir; yoksa genel hata metni. |

### Ağ davranışı
- Zaman aşımı 8 sn. Ağ hatası, zaman aşımı ve 5xx'te en çok 2 yeniden deneme (1 sn, 2 sn).
- Yeni bir seçim yapılınca süren istek **iptal edilir** (en son istek kazanır).
- İstemci `If-None-Match` gönderir; sunucu `304` dönerse önceki yanıt kullanılır. ETag desteklenmiyorsa sorun yoktur.
- Otomatik yenileme 60 sn'dir; sekme arka plandayken ve çevrimdışıyken durur.

### CORS
**Aynı kökten** (arayüz ve API aynı alan adında) sunuluyorsa hiçbir ayar gerekmez — önerilen kurulum budur.
Farklı kökten sunulacaksa API şu başlıkları göndermelidir:

```
Access-Control-Allow-Origin: https://<arayüzün adresi>
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Accept, If-None-Match
Access-Control-Expose-Headers: ETag, Retry-After
```
`OPTIONS` ön isteğine `204` dönülmelidir (`If-None-Match` başlığı ön istek tetikler). Arayüz çerez göndermez (`credentials: 'omit'`); ileride çerez tabanlı oturum gelirse `Access-Control-Allow-Credentials: true` ve joker olmayan köken gerekir.

### Sağlık denetimi
`GET /api/v1/status` → `{ "ok": true, "time": "...", "dataUpdatedAt": "..." }`. Arayüz bu ucu çağırmaz; izleme sistemleri içindir. Sözleşme testi denetler.

---

## İleride (taslak — arayüz bunları ŞİMDİ çağırmaz)

### Yanlış bilgi bildirimi
```
POST /api/v1/reports
Content-Type: application/json
Idempotency-Key: <rastgele kimlik>
{ "hospitalId": "h1", "reason": "wrong_wait|closed|other", "comment": "≤ 300 karakter, isteğe bağlı" }
→ 202 { "reportId": "r_123" }
→ 4xx { "error": { "code": "BAD_REQUEST", "fields": { "reason": "Geçersiz değer" } } }
```
Kişisel veri (ad, telefon, konum) **alınmaz**. Hız sınırı: 429 + Retry-After.

### Paylaşım
Paylaşım bağlantısı istemci tarafında üretilecektir; ek uç gerekmez.

### Panel uçları (Aşama B)
Ayrıntılı taslak: [SOZLESME-PANEL.md](SOZLESME-PANEL.md). EK-1'deki panel uçları orada tanımlıdır. Yazma isteklerinde hata biçimi:
`{ "error": { "code": "...", "fields": { "alanAdi": "Türkçe ileti" } } }`; çift gönderime karşı `Idempotency-Key` başlığı.

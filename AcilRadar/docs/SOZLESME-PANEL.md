# AcilRadar · Panel uçları sözleşmesi (Aşama B) — taslak 1.0

Hastane panelinin (`panel/`) arka uçla tek temas noktası. EK-1'deki "Panel uçları" listesinin ayrıntısıdır.
Arka uç bu belgeye uyduğunda panelde **hiçbir dosya değişmez**; yalnız `panel/js/config.js › ENVIRONMENT` satırı değişir.

- Örnek uygulama: `panel/js/mock.js` (aynı kod `tools/mock-server.js` içinde gerçek HTTP ile çalışır)
- Sözleşme testi: `BASE_URL=https://sunucu STAFF_EMAIL=… ADMIN_EMAIL=… PANEL_PASSWORD=… STAFF_HOSPITAL=… node tests/panel-contract.test.js`
- Panelde sunucu biçimini bilen tek dosya: `panel/js/schema.js`

> Bu belge **taslaktır**: ayrıntılar arka uç ekibiyle kesinleşecektir. Değişiklik olursa önce bu belge ve `panel/js/schema.js` güncellenir.

---

## 1. Genel kurallar

| Konu | Kural |
|---|---|
| Biçim | JSON, UTF-8; tarih ISO 8601 (+03:00 ofsetli); süreler dakika |
| Köken | Panel ve API **aynı kökten** sunulur (CORS gerekmez; önerilen ve varsayılan kurulum) |
| Oturum | Sunucu, girişte `HttpOnly; Secure; SameSite=Strict; Path=/api` çerez verir. Arayüz çerezi okumaz; `credentials: 'include'` ile gönderir |
| CSRF | Durum değiştiren her istek (POST/PATCH/PUT/DELETE) `X-AcilRadar-Client: panel` başlığı taşır. Sunucu bu başlığı **ve** `Origin`'i denetlemeli; yoksa `403` |
| Çift gönderim | Yazma istekleri `Idempotency-Key: <rastgele>` taşır. Aynı anahtarla gelen tekrar, **ilk yanıtın aynısını** almalı ve yeni kayıt oluşturmamalıdır (en az 24 saat saklanması önerilir) |
| Yetki | Her istekte **sunucuda** denetlenir (arayüzdeki gizleme güvenlik değildir) |
| Kişisel veri | Hasta bazlı hiçbir alan yoktur ve kabul edilmez (KVKK). Yalnız toplu sayılar |
| Önbellek | Panel yanıtlarında `Cache-Control: no-store` |

### Hata zarfı

```json
{ "error": { "code": "VALIDATION", "message": "…", "fields": { "greenWaiting": "outOfRange" } } }
```

- `message` günlük içindir; **kullanıcıya gösterilmez**.
- `fields` anahtarları **sunucudaki alan adlarıdır**; değerleri **kod**dur (metin değil). Arayüz Türkçe metne çevirir.

| HTTP | `code` | Arayüz |
|---|---|---|
| 400 | `BAD_REQUEST` | Genel hata |
| 401 | `UNAUTHORIZED` | Oturumu kapatır, giriş ekranına götürür, girişten sonra **kalınan sayfaya döner** |
| 401 | `INVALID_CREDENTIALS` | "E-posta adresi ya da parola hatalı." (hangisi olduğu söylenmez) |
| 403 | `ACCOUNT_INACTIVE` | "Hesabınız etkin değil." |
| 403 | `FORBIDDEN` | "Bu işlem için yetkiniz yok." |
| 404 | `NOT_FOUND` | Kayıt yok |
| 409 | `CONFLICT` | Çakışma |
| 422 | `VALIDATION` | `fields` alan alan gösterilir |
| 429 | `RATE_LIMITED` | `Retry-After` (saniye) boyunca düğme kilitlenir, kalan süre yazılır |
| 503 / 5xx | `UNAVAILABLE` / `INTERNAL` | GET ve Idempotency-Key taşıyan yazmalar en çok 2 kez yeniden denenir |

Alan hatası kodları: `required`, `integer`, `outOfRange`, `rangeOrder`, `email`, `emailTaken`, `roleNotAllowed`, `hospitalRequired`. Bilinmeyen kod "Bu değer kabul edilmedi." olarak gösterilir.

---

## 2. Modeller

### Kullanıcı
```json
{ "userId": "u-1", "name": "Örnek Personel", "email": "personel@ornek.test",
  "role": "hospital_staff", "hospitalId": "ornek-01", "active": true, "lastLoginAt": "2026-10-12T21:00:00+03:00" }
```
`role`: `hospital_staff | hospital_admin | province_viewer | system_admin`. Hastaneye bağlı rollerde (`hospital_staff`, `hospital_admin`) `hospitalId` zorunludur; diğerlerinde `null`.

### Kayıt (bir veri girişi)
```json
{ "recordId": "r-1", "hospitalId": "ornek-01", "createdAt": "2026-10-12T21:30:00+03:00",
  "createdBy": { "userId": "u-1", "name": "Örnek Personel" },
  "occupancyPercent": 62, "crowdingLevel": "medium",
  "greenWaiting": 34, "yellowWaiting": 9, "activePhysicians": 6,
  "estimatedGreenWaitMinutes": [58, 82], "estimatedYellowWaitMinutes": [7, 15] }
```
- `crowdingLevel` **sunucu tarafından** doluluk oranından türetilir (arayüz göndermez).
- Sınırlar: doluluk 0–100, bekleyen 0–9999, hekim 0–500, süre 0–1440 ve `en az ≤ en çok`; hepsi tam sayı.
- Kayıt, halka açık sitedeki `GET /api/v1/hospitals` yanıtının kaynağıdır (`updatedAt = createdAt`).

### Sayfalı liste
```json
{ "items": [ … ], "page": 1, "pageSize": 20, "total": 140 }
```
`pageSize` en çok 100. Sıralama: **en yeni üstte**; aynı anda oluşanlarda sonra oluşturulan üstte.

### Denetim kaydı
```json
{ "auditId": "a-9", "at": "2026-10-12T21:30:00+03:00",
  "actor": { "userId": "u-1", "name": "Örnek Personel", "role": "hospital_staff" },
  "action": "record.create",
  "target": { "type": "hospital", "id": "ornek-01", "label": "Örnek Devlet Hastanesi Gebze Merkez" },
  "changes": [ { "field": "occupancyPercent", "from": 58, "to": 62 } ] }
```
`action`: `record.create | user.create | user.update | auth.login | auth.logout` (yeni işlem eklenebilir; arayüz tanımadığını "Diğer işlem" diye gösterir). `changes[].field` arayüzün iç adlarıdır (`occupancyPercent`, `nonUrgentWaiting`, `urgentWaiting`, `activePhysicians`, `nonUrgentWaitMinutes`, `urgentWaitMinutes`, `role`, `active`). Denetim kaydı **değiştirilemez ve silinemez** olmalıdır.

---

## 3. Uçlar

| Yöntem ve yol | Kim | İstek | Yanıt |
|---|---|---|---|
| `POST /api/v1/auth/login` | herkes | `{ email, password }` | `200 { user, session: { expiresAt, serverTime }, twoFactorRequired }` + çerez · `401 INVALID_CREDENTIALS` · `403 ACCOUNT_INACTIVE` · `429` |
| `POST /api/v1/auth/logout` | oturumlu | — | `204` + çerez silinir |
| `GET /api/v1/auth/me` | oturumlu | — | `200` (login ile aynı gövde; **oturum süresini yeniler**) · `401` |
| `GET /api/v1/panel/hospitals` | oturumlu | — | `200 { items: [ { hospitalId, name, district, ownership, latest: Kayıt \| null } ] }` — kullanıcının erişebildiği **devlet** hastaneleri |
| `GET /api/v1/panel/hospitals/{id}/records?page&pageSize&from&to` | hastaneye erişimi olan | `from`, `to`: `YYYY-AA-GG` (Türkiye saatiyle gün) | `200` sayfalı Kayıt · `403` · `404` · `400` (ters aralık) |
| `POST /api/v1/panel/hospitals/{id}/records` | `records.create` + hastane kapsamı | Kayıt alanları (sunucu adlarıyla), `Idempotency-Key` | `201 { record }` · `422 VALIDATION` · `403` |
| `GET /api/v1/panel/audit?page&pageSize&from&to` | `audit.view` | — | `200` sayfalı denetim kaydı (yönetici: kendi hastanesi; il/sistem: tümü) |
| `GET /api/v1/panel/users?page&pageSize` | `users.manage` | — | `200` sayfalı Kullanıcı (yönetici: kendi hastanesi) |
| `POST /api/v1/panel/users` | `users.manage` | `{ name, email, role, hospitalId }`, `Idempotency-Key` | `201 { user }` · `422` (`emailTaken`, `roleNotAllowed` …) |
| `PATCH /api/v1/panel/users/{id}` | `users.manage` | `{ role? , active? }`, `Idempotency-Key` | `200 { user }` · `403` (kendi hesabı, kapsam dışı) · `422` |

### Rol ve yetki tablosu (sunucu da AYNISINI uygulamalı)

| Yetki | Personel | Hastane yöneticisi | İl görüntüleyici | Sistem yöneticisi |
|---|:-:|:-:|:-:|:-:|
| Kendi hastanesine veri girişi | ✓ | ✓ | — | ✓ (tüm hastaneler) |
| Geçmiş kayıtlar | kendi | kendi | tümü (salt okunur) | tümü |
| Kullanıcı yönetimi | — | kendi hastanesi (personel, yönetici) | — | tümü (tüm roller) |
| Denetim kaydı | — | kendi hastanesi | tümü | tümü |
| CSV dışa aktarım | — | ✓ | ✓ | ✓ |

Kurallar: kullanıcı kendi rolünü/durumunu değiştiremez; pasif yapılan kullanıcının açık oturumları kapatılır.

### Oturum
- Önerilen süre 30 dakika, **kayan**: `/auth/me` çağrısı süreyi yeniler. Arayüz bitime 2 dakika kala ekranı engellemeyen bir uyarı bandı gösterir ("Oturumu uzat" → `/auth/me`).
- `serverTime` her oturum yanıtında gönderilir; arayüz kalan süreyi cihaz saatinden bağımsız hesaplar.
- Giriş denemesi sınırı: önerilen 5 hatalı denemede 60 sn kilit → `429 RATE_LIMITED` + `Retry-After`. Hesap kilitlenmesi kullanıcıya ayrıca açıklanmaz.

### İleride (şimdilik kapalı ekranlar)
- **Parolamı unuttum:** `POST /api/v1/auth/password-reset { email }` → her durumda `202` (hesap var mı belli olmasın). Arayüzde ekran hazır; `PASSWORD_RESET_ENABLED: false`.
- **İki adımlı doğrulama:** girişte `twoFactorRequired: true` dönerse `POST /api/v1/auth/2fa { code }`. Arayüzde yer tutan ekran hazır; `TWO_FACTOR_ENABLED: false`.
- **Yeni kullanıcının ilk parolası:** panel parola belirlemez; arka uç e-postayla tek kullanımlık bağlantı göndermelidir.

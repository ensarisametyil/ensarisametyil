# Kimlik Doğrulama ve Veri Sahipliği (Aşama 7)

Bu doküman, kullanıcı kayıt/giriş sistemini, JWT tabanlı authentication'ı ve
CV/Analiz verilerinin kullanıcıya nasıl bağlandığını açıklar.

## Mimari Özet

```
AuthController          CvController / AnalysesController
   └─ IAuthService          └─ [Authorize] (JWT middleware)
   └─ IJwtTokenService      └─ User.GetUserId() (ClaimsPrincipal'dan)
        │                        └─ ownership filtreli EF sorguları (WHERE UserId = ...)
        ▼
   IPasswordHasher<User>   (ASP.NET Core Identity — PBKDF2, ek paket gerekmez)
```

Controller'lar hiçbir zaman şifre hashleme veya JWT üretim mantığını doğrudan bilmez —
sadece `IAuthService` / `IJwtTokenService` arayüzlerini kullanır.

## 1. JWT Signing Key Nasıl Tanımlanır?

**appsettings.json içine gerçek key yazma, git'e commit etme.** `appsettings.json`'da
`Jwt:SigningKey` bilinçli olarak boş bırakılmıştır; uygulama, key tanımlı değilse
**başlangıçta** (`Program.cs`) fail-fast şekilde `InvalidOperationException` fırlatarak
çöker — bu, `AI:ApiKey`'in aksine (ki o sadece `/analyze` endpoint'ini 503 yapar),
authentication'ın uygulamanın temel bir güvenlik bileşeni olması ve yanlışlıkla
zayıf/boş bir key ile prod'a çıkılmasını engellemek içindir.

### Development (yerel makine)

```bash
cd CvAnalyzer.Api
dotnet user-secrets set "Jwt:SigningKey" "<EN_AZ_32_KARAKTERLİK_RASTGELE_DEĞER>"
```

Örnek üretim (yerel test için):

```bash
openssl rand -base64 48
```

### Production / diğer ortamlar

```bash
export Jwt__SigningKey="<GÜÇLÜ_RASTGELE_DEĞER>"
```

Production'da bu değerin bir secret manager (örn. Azure Key Vault, AWS Secrets Manager,
HashiCorp Vault) üzerinden environment variable olarak enjekte edilmesi önerilir.

### Diğer JWT ayarları

```json
"Jwt": {
  "Issuer": "CvAnalyzer.Api",
  "Audience": "CvAnalyzer.Web",
  "SigningKey": "",
  "ExpirationMinutes": 60
}
```

| Alan | Açıklama |
|---|---|
| `Issuer` / `Audience` | Token doğrulamasında kontrol edilir; değiştirilirse hem token üretimi hem doğrulaması aynı değeri kullanmalı (tek `appsettings.json`'dan okunduğu için otomatik tutarlıdır). |
| `SigningKey` | HMAC-SHA256 imzalama anahtarı. **Boş bırakılmalı, secret olarak set edilmeli.** |
| `ExpirationMinutes` | Access token'ın geçerlilik süresi (dakika). Varsayılan 60. |

## 2. Endpoint'ler

### `POST /api/auth/register`

```json
// İstek
{ "email": "user@example.com", "password": "Password123" }

// Yanıt (200 OK)
{
  "accessToken": "eyJhbGciOi...",
  "tokenType": "Bearer",
  "expiresInSeconds": 3600,
  "user": { "id": "...", "email": "user@example.com", "createdAt": "..." }
}
```

| HTTP | `code` | Sebep |
|---|---|---|
| 400 | `WEAK_PASSWORD` | Şifre en az 8 karakter değil veya en az bir harf + bir rakam içermiyor |
| 409 | `EMAIL_ALREADY_REGISTERED` | Email zaten kayıtlı (normalize edilmiş — trim + lowercase — karşılaştırma) |

### `POST /api/auth/login`

```json
// İstek
{ "email": "user@example.com", "password": "Password123" }
```

Yanıt şekli `register` ile aynıdır (200 OK). Hatalı email **veya** hatalı şifre durumunda
**aynı** `401 INVALID_CREDENTIALS` hatası döner — hangi alanın yanlış olduğu bilinçli
olarak ayırt edilmez (user enumeration saldırılarını engellemek için).

### `GET /api/auth/me`

`Authorization: Bearer <token>` header'ı gerektirir. Geçerli token için `200 OK` +
`UserDto` döner. Token geçersiz/eksik/süresi dolmuşsa `401 Unauthorized` (middleware
tarafından, controller'a hiç girmeden). Token geçerli ama kullanıcı DB'den silinmişse
`401` döner.

## 3. CV / Analiz Veri Sahipliği

- Tüm `CvController` ve `AnalysesController` endpoint'leri `[Authorize]` ile korunur.
- `POST /api/cv/upload`: yeni CV, token'daki kullanıcı ID'sine bağlanır. **Frontend hiçbir
  zaman userId göndermez** — backend bunu her zaman `ClaimsPrincipal`'dan (`sub` claim)
  kendisi belirler.
- `GET /api/cv`, `GET /api/cv/{id}`, `DELETE /api/cv/{id}`, `POST /api/cv/{id}/analyze`:
  hepsi `WHERE UserId = <token'daki kullanıcı>` filtresiyle sorgular. Başka bir kullanıcıya
  ait bir CV ID'si tahmin edilse bile **her zaman `404 CV_NOT_FOUND`** döner — asla `403`
  (bu, hedef kaynağın var olup olmadığını bile sızdırmamak için bilinçli bir tercihtir).
- `GET /api/analyses`, `GET /api/analyses/{id}`: aynı 404-yerine-403 deseni, `ANALYSIS_NOT_FOUND`
  koduyla.

## 4. Analiz Geçmişi

`POST /api/cv/{id}/analyze` artık, başarılı bir AI analizinden sonra sonucu bir `Analysis`
satırı olarak veritabanına kalıcı olarak kaydeder (Aşama 5'te ertelenen şema uyumsuzluğu bu
aşamada giderildi). Endpoint'in kendi yanıt şekli **değişmedi** (frontend uyumluluğu için).

- `GET /api/analyses?page=&pageSize=` — kullanıcının geçmiş analizlerini en yeniden eskiye
  sıralı, sayfalanmış şekilde döner (`pageSize` varsayılan 20, 1-100 arası sınırlanır).
- `GET /api/analyses/{id}` — tek bir analizin tam detayını (`CvAnalysisResult` ile aynı
  şema) döner.

## 5. Gelecekteki Free/Premium/Kota Sistemi İçin Mimari Hazırlık

`IAnalysisQuotaService` arayüzü (`Services/Billing/`), `CvController.Analyze` içinde her
analiz isteğinden önce (`EnsureUserCanAnalyzeAsync`) ve başarılı bir analizden sonra
(`RecordAnalysisUsageAsync`) çağrılır. Şu anki tek implementasyon,
`UnlimitedAnalysisQuotaService` — **sahte/stub bir kota mantığı değil**, dürüst bir
no-op'tur: henüz bir Free/Premium planı veya kullanım limiti olmadığı için her kullanıcı
istediği kadar analiz yapabilir. Aşama 8'de gerçek bir kota/plan sistemi eklenmek
istendiğinde, sadece bu arayüzün yeni bir implementasyonu yazılıp DI kaydı değiştirilecek
— `CvController` veya diğer controller'lara **hiç dokunulmayacak**.

**Bu aşamada implement edilmemiştir:** ödeme sistemi, Stripe/iyzico entegrasyonu, aktif
Premium plan, subscription/kredi satın alma. Sadece gelecekte eklenebilecek şekilde bir
mimari sınır (seam) bırakılmıştır.

## 6. Şifre Güvenliği

- Şifreler **hiçbir zaman düz metin olarak saklanmaz**. ASP.NET Core Identity'nin
  `IPasswordHasher<User>` / `PasswordHasher<User>` sınıfı (PBKDF2 tabanlı, ek NuGet paketi
  gerektirmez) kullanılır.
- `PasswordHash` dışında şifreyle ilgili hiçbir hassas veri DB'de tutulmaz.
- Şifre politikası: en az 8 karakter, en az bir harf ve bir rakam. Bilinçli olarak zorunlu
  büyük harf/özel karakter kuralı eklenmemiştir (kullanılabilirlik/güvenlik dengesi).
- `PasswordVerificationResult.SuccessRehashNeeded` durumu ele alınır: hashleme algoritması
  parametreleri zamanla güncellenirse, bir sonraki başarılı login'de hash otomatik olarak
  yeniden hesaplanıp kaydedilir.

## 7. Testler Nasıl Çalıştırılır?

```bash
cd CvAnalyzer
dotnet clean
dotnet build
dotnet test
```

**Gerçek AI API'sine hiçbir testte istek atılmaz** (önceki aşamalardaki fake'ler
korunmuştur). Authentication'a özel testler üç katmanda:

- `Services/Auth/AuthServiceTests.cs` — register/login iş mantığı (hash, normalize,
  duplicate email, user enumeration'a karşı aynı hata mesajı).
- `Controllers/AuthControllerTests.cs`, `Controllers/AnalysesControllerTests.cs` — controller
  seviyesinde, sahte `ClaimsPrincipal` (`TestHelpers/TestPrincipal.cs`) ile ownership/yetkilendirme.
- `Integration/AuthenticationIntegrationTests.cs` — `WebApplicationFactory<Program>` ile
  **gerçek HTTP pipeline'ı** üzerinden JWT middleware'in kendisi test edilir (token yok,
  geçersiz token, yanlış key ile imzalanmış token, süresi dolmuş token, tam
  register→login→me akışı). Bu katman, controller unit testlerinin yapısal olarak
  ulaşamadığı `[Authorize]` middleware davranışını doğrular. Test-only signing key/config,
  `CustomWebApplicationFactory` içinde `ConfigureAppConfiguration` ile enjekte edilir; bu
  sayede testler bu makinenin gerçek `dotnet user-secrets` değerlerine hiç bağımlı değildir.

## 8. Gerekli Environment Variable'lar (Özet)

| Değişken | Zorunlu mu? | Açıklama |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | Evet | PostgreSQL bağlantı dizesi |
| `Jwt__SigningKey` | **Evet** | Boşsa uygulama başlangıçta çöker (fail-fast). |
| `Jwt__Issuer` / `Jwt__Audience` | Hayır | Varsayılan `appsettings.json`'daki değerler. |
| `Jwt__ExpirationMinutes` | Hayır | Varsayılan 60. |
| `AI__ApiKey` | Sadece `/analyze` için | Aşama 5 dokümantasyonuna bakın (`ai-cv-analysis.md`). |

# Production Deployment Guide

Bu doküman CVora AI'yı (backend: `CvAnalyzer.Api`, frontend: `cv-analyzer-web`) bir production
ortamına almak için gereken tüm config/env değerlerini, build komutlarını ve operasyonel notları
tek yerde toplar. **Hiçbir gerçek secret/credential içermez** — sadece hangi değişkenin
ayarlanması gerektiğini, nereden okunduğunu ve ne olacağını (yanlış/eksikse) anlatır.

## 1. Ortam Ayrımı (Development vs Production)

`ASPNETCORE_ENVIRONMENT` ortam değişkeni davranışı belirler:

| Davranış | Development | Production (veya başka bir ortam) |
|---|---|---|
| Swagger UI (`/swagger`) | Açık | **Kapalı** (`Program.cs`, `app.Environment.IsDevelopment()` ile korunuyor) |
| `Content-Security-Policy` header'ı | Yok (Swagger UI çalışabilsin diye) | Var (`default-src 'none'; frame-ancestors 'none'`) |
| `Strict-Transport-Security` (HSTS) | Yok (dev sunucusu genelde HTTPS üzerinden çalışmaz) | Var (`app.UseHsts()`, Aşama 17 güvenlik denetiminde eklendi) |
| Parola sıfırlama/e-posta doğrulama token'ının loglanması | Var (`LoggingEmailService`, sadece bu ortamda) | **Yok** (gerçek e-posta sağlayıcısı bağlanana kadar tamamen sessiz — bkz. §6) |
| DB | Genelde yerel Postgres / user-secrets ile connection string | Gerçek connection string, ortam değişkeninden |

Production'da bu davranışların hiçbiri manuel olarak açılıp kapatılmaz — sadece
`ASPNETCORE_ENVIRONMENT` değerinin `Development` OLMADIĞINDAN emin olun.

## 2. Gerekli Environment Variable'lar

ASP.NET Core, `Section__Key` formatındaki environment variable'ları otomatik olarak
`appsettings.json`'daki `"Section": { "Key": ... }` yapısına eşler (çift alt çizgi `__` iç içe
geçişi temsil eder). Aşağıdaki tümü **production'da environment variable (veya sırdaşınızın
secret-injection mekanizması — Kubernetes Secret, Docker secret, vb.) üzerinden** verilmelidir;
hiçbiri `appsettings.json`'da gerçek bir değerle bulunmamalıdır (repodaki `appsettings.json`'da
hepsi boş string/placeholder).

| Environment Variable | Zorunlu mu? | Açıklama |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | Evet | `Production` (veya ortamınıza uygun bir isim — `Development` DEĞİL) |
| `ConnectionStrings__DefaultConnection` | **Evet — eksikse uygulama başlamaz** | Npgsql connection string. `Program.cs` başlangıçta boşsa `InvalidOperationException` fırlatır (fail-fast). |
| `Jwt__SigningKey` | **Evet — eksik/kısa ise uygulama başlamaz** | En az 32 karakter (256 bit), örn. `openssl rand -base64 48`. Kısa/boşsa `Program.cs` başlangıçta fırlatır. |
| `Jwt__Issuer` | Önerilir | Varsayılan `CvAnalyzer.Api` — production'da değiştirmek zorunlu değil ama isteğe bağlı. |
| `Jwt__Audience` | Önerilir | Varsayılan `CvAnalyzer.Web`. |
| `Jwt__ExpirationMinutes` | Hayır | Varsayılan 60. |
| `AI__ApiKey` | Analiz özelliği için gerekli (eksikse `/analyze` 503 `AI_UNAVAILABLE` döner, uygulama yine de ayağa kalkar) | Anthropic API key. |
| `AI__Model` | Hayır | Varsayılan `claude-opus-5`. |
| `AI__TimeoutSeconds` | Hayır | Varsayılan 60 — bir AI isteğinin en fazla ne kadar bekleyeceği. |
| `AI__MaxTokens`, `AI__MaxInputCharacters` | Hayır | Maliyet kontrol limitleri, varsayılanlar makul. |
| `AI__BaseUrl` | Hayır — **production'da ayarlamayın** | Sadece test seams'i; boş bırakılırsa SDK'nın gerçek Anthropic endpoint'i kullanılır. |
| `Iyzico__ApiKey`, `Iyzico__SecretKey` | Checkout/webhook için gerekli (eksikse checkout 503 `CHECKOUT_UNAVAILABLE` döner) | Gerçek İyzico (production) API/secret key çifti. |
| `Iyzico__BaseUrl` | Evet | Sandbox: `https://sandbox-api.iyzipay.com`; production: gerçek İyzico production endpoint'i. |
| `Iyzico__PremiumPricingPlanReferenceCode` | Evet | İyzico panelinde tanımlı abonelik planının reference code'u. |
| `Iyzico__CallbackUrl` | Evet | Bu API'nin gerçek, herkese açık `POST /api/billing/checkout/callback` URL'i. |
| `Iyzico__FrontendResultUrl` | Evet | Frontend'in `/premium/result` sayfasının gerçek URL'i. |
| `Cors__AllowedOrigins__0` (ve gerekirse `__1`, `__2`, ...) | **Evet** | Frontend'in gerçek production domain'i (ör. `https://app.cvorai.com`). Boş bırakılırsa hiçbir origin CORS ile izin almaz — sessizce kırık bir frontend'e yol açar, wildcard KULLANMAYIN. |
| `FileStorage__RootPath` | Önerilir | CV dosyalarının kalıcı olarak saklanacağı, container/deploy yeniden başlatıldığında kaybolmayacak bir disk yolu (bkz. §9). |
| `Admin__BootstrapEmail` | İlk admin için gerekli (bkz. `docs/admin-panel.md`) | İlk admin olarak atanacak, zaten kayıtlı bir hesabın e-postası — bir sır değil, ama yine de sadece environment variable ile ayarlanır. Boş bırakılırsa hiçbir kullanıcı otomatik admin yapılmaz. |

Rate limiting (`RateLimiting__Auth__PermitLimit` vb.) ve `Plans__*` (Free/Premium analiz limiti)
production'da genelde `appsettings.json`'daki varsayılanlarla bırakılır — bunlar secret değil,
gerektiğinde environment variable ile override edilebilir ama zorunlu değildir.

### Development'ta secret yönetimi

Development'ta bu değerler `dotnet user-secrets set <Anahtar> "<Değer>"` ile ayarlanır (repo
dışında, `~/.microsoft/usersecrets/<UserSecretsId>/secrets.json`'da tutulur — asla commit
edilmez). Örnek:

```bash
cd CvAnalyzer.Api
dotnet user-secrets set ConnectionStrings:DefaultConnection "Host=localhost;Database=cvanalyzer;Username=...;Password=..."
dotnet user-secrets set Jwt:SigningKey "$(openssl rand -base64 48)"
```

`.gitignore` zaten `appsettings.*.local.json`, `.env`/`.env.*` (`.env.example` hariç) ve `*.pfx`
dosyalarını hariç tutuyor — bunlardan hiçbirine gerçek bir secret yazmayın.

## 3. Frontend Environment Variable

| Değişken | Zorunlu mu? | Açıklama |
|---|---|---|
| `VITE_API_BASE_URL` | Evet | Backend'in gerçek production URL'i. Build-time'da gömülür (Vite konvansiyonu) — her ortam için ayrı bir build gerekir. |

## 4. Database Migration

```bash
cd CvAnalyzer.Api
dotnet ef database update --connection "<production connection string>"
```

veya deploy sürecinizin bir parçası olarak `dotnet ef migrations bundle` ile üretilen bağımsız
bir binary kullanılabilir. Bu aşamada denetlendi: migration geçmişinde bekleyen bir model
değişikliği yok (`dotnet ef migrations has-pending-model-changes` temiz döner), foreign
key/unique index/nullable alan tutarlılığı Aşama 7–10'da kurulan şemayla uyumlu — production'a
almadan önce yeni bir migration gerekmiyor. Migration'lar sırayla (dosya adındaki timestamp
sırasıyla) uygulanır; hiçbiri yıkıcı (veri kaybettiren `DROP COLUMN`/`DROP TABLE`) değildir.

## 5. AI Sağlayıcı Dayanıklılığı (Aşama 12)

`AI:TimeoutSeconds` (varsayılan 60) artık gerçekten uygulanıyor —
`AnthropicMessagesGateway`, `AnthropicClient.Timeout`'u bu değerle ayarlıyor, böylece
ulaşılamayan/asılı kalan bir sağlayıcı isteği sonsuza kadar beklemiyor. Zaman aşımı, ağ hatası,
5xx, rate limit, boş/bozuk yanıt — hepsi kullanıcıya güvenli, Türkçe bir hata mesajıyla
(`AI_UNAVAILABLE`/`AI_RATE_LIMITED`/`AI_INVALID_RESPONSE`) dönüyor; hiçbir zaman stack
trace/API key sızmıyor, CV metni loglanmıyor, ve analiz kotası yalnızca AI çağrısı VE veritabanı
kaydı tamamen başarılı olduktan sonra düşülüyor (bkz. `CvController.Analyze`) — başarısız bir AI
çağrısı asla kullanıcının kredisini tüketmiyor.

## 6. E-posta Sağlayıcısı

`IEmailService` (yeni, Aşama 12) — `AuthService`, parola sıfırlama/e-posta doğrulama token'ı
üretildiğinde doğrudan loglamak yerine bu arayüze delege ediyor. Şu an tek implementasyon
`LoggingEmailService`: Development'ta token'ı loglar (gerçek bir sağlayıcı olmadan akışı test
edebilmek için), Production'da tamamen sessiz no-op'tur — hiçbir şey göndermiyormuş gibi
davranmaz, gerçekten hiçbir şey yapmaz (AuthController'ın "bu ortamda e-posta altyapısı henüz
aktif değil" mesajıyla tutarlı).

**Gerçek bir sağlayıcı bağlamak için**: `IEmailService`'i implemente eden yeni bir sınıf yazın
(SendGrid/SES/SMTP), `Program.cs`'teki tek satırı değiştirin:

```csharp
builder.Services.AddSingleton<IEmailService, LoggingEmailService>(); // → gerçek implementasyon
```

`AuthService`, token'ın nasıl gönderildiğine dair hiçbir varsayımda bulunmaz — hiçbir başka yer
değişmez. Gerçek sağlayıcının API key/SMTP credential'ı yine bu dokümanın §2'sindeki desenle
(environment variable, asla appsettings.json'a yazılmadan) eklenmelidir.

## 7. CORS

`Cors:AllowedOrigins` (bkz. §2) tamamen config-driven — kaynak kodda hiçbir origin hardcode
edilmemiş, wildcard (`*`) kullanılmıyor, ve `AllowCredentials()` hiç çağrılmıyor (JWT zaten
`Authorization` header'ıyla taşınıyor, cookie'ye dayalı bir credential mekanizması yok — bu
kombinasyon CORS'un en tehlikeli hatası olan "wildcard + credentials"i yapısal olarak imkânsız
kılıyor). Production'a alırken tek yapmanız gereken `Cors__AllowedOrigins__0`'ı gerçek frontend
domain'inize ayarlamak.

## 8. Security Headers (Aşama 11'de eklendi; HSTS + Admin rate limiti Aşama 17'de eklendi)

`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` her zaman;
`Content-Security-Policy` sadece Production'da (bkz. §1) — `Middleware/SecurityHeaders.cs` +
`Program.cs`'teki `OnStarting` hook'u ile hata response'ları dahil HER response'ta garanti
ediliyor.

`Strict-Transport-Security` — `app.UseHsts()`, yine yalnızca Production'da (`Program.cs`,
`UseHttpsRedirection()`'dan hemen önce) — tam kapsamlı Aşama 17 security audit'inde eklendi:
tarayıcıya bu host'a bundan sonra yalnızca HTTPS üzerinden konuşmasını söyleyerek, ilk düz-HTTP
istek/redirect'te oluşabilecek bir saldırı penceresini kapatır.

Tüm `/api/admin/*` controller'ları artık ayrı bir `Admin` rate-limit policy'si taşıyor
(`[EnableRateLimiting(RateLimitPolicies.Admin)]`, varsayılan 60/60s, kullanıcı-partition'lı —
bkz. `RateLimiting__Admin__PermitLimit`/`WindowSeconds`, §2) — Aşama 16'da bilinçli olarak
ertelenmiş, Aşama 17'de kapatılan bir boşluktu: rol kontrolü zaten girişi engelliyordu, ama
sızmış/kötüye kullanılan bir admin token'ının panele scriptli/sınırsız istek atmasına karşı
diğer her authenticated yüzeyle aynı hız sınırlaması artık admin panelinde de var.

## 9. Dosya Depolama (CV Upload)

`FileStorage:RootPath`, container'ın/host'un kalıcı bir diskine işaret etmeli — stateless bir
container orkestrasyonunda (ör. her deploy'da disk sıfırlanan bir platform) bu bir kalıcı
volume/mount olmalı, aksi halde her yeniden başlatmada yüklenen CV'ler kaybolur. Dosyalar
sunucu-üretimli GUID adlarıyla, herhangi bir web-servable/static-file dizininin dışında
saklanıyor — hiçbir CV dosyasına doğrudan bir public URL yok, her okuma
`ICvFileValidator`+ownership kontrolünden geçiyor (Aşama 11'de path traversal/unauthorized access
açısından denetlendi).

## 10. Build Komutları

**Backend**:
```bash
dotnet clean CvAnalyzer.sln
dotnet build CvAnalyzer.sln -c Release
dotnet test CvAnalyzer.sln
dotnet publish CvAnalyzer.Api -c Release -o ./publish
```

**Frontend**:
```bash
npm ci
npm run lint
npm test -- run
npm run build   # dist/ — statik olarak servis edilir (Nginx, CDN, vb.)
```

## 11. Health Check

- `GET /health` — liveness. Her zaman 200, hiçbir dış bağımlılığa bakmaz (DB, AI, İyzico dahil
  değil). Process ayakta ve istek işliyorsa 200 döner; orkestratörün "container'ı yeniden
  başlat" kararı için budur.
- `GET /health/ready` — readiness (Aşama 12'de eklendi). Veritabanına gerçekten bağlanılabiliyor
  mu diye `Database.CanConnectAsync()` çağırır; bağlanamıyorsa 503, bağlanabiliyorsa 200 döner.
  Hiçbir zaman connection string veya exception detayı döndürmez (`CanConnectAsync` hiçbir zaman
  fırlatmaz, sadece `false` döner).

İkisi de authentication gerektirmez (health check'ler yapısı gereği anonim olmalı) ve rate
limit'e tabi değildir.

## 12. Secret Management — Özet Kural

- Gerçek hiçbir secret `appsettings.json`/`appsettings.Development.json`'a **asla** yazılmaz —
  ikisi de repo'da placeholder/boş değerlerle bulunur.
- Development: `dotnet user-secrets`.
- Production: environment variable (veya platformunuzun secret store'u — bunlar da runtime'da
  environment variable olarak enjekte edilir).
- `.gitignore` `.env*` (`.env.example` hariç), `appsettings.*.local.json`, `*.pfx` dosyalarını
  hariç tutar.
- JWT signing key ve DB connection string eksik/boşsa uygulama **başlamaz** (fail-fast) — bu
  bilinçli bir tasarım: yanlış yapılandırılmış bir production instance'ın sessizce güvensiz bir
  durumda ayağa kalkmasındansa hiç ayağa kalkmaması tercih edildi.

## 13. Yedekleme (Backup) Notları

Bu proje bir backup mekanizması sağlamıyor/deploy etmiyor (altyapı provisioning bu aşamanın
kapsamı dışında) — ama production'a almadan önce değerlendirilmesi gereken noktalar:

- **PostgreSQL**: düzenli `pg_dump`/point-in-time-recovery (WAL archiving) — kullanıcı hesapları,
  analiz geçmişi, ödeme/abonelik kayıtları burada. Barındırdığınız Postgres sağlayıcısının
  (RDS, Cloud SQL, vb.) kendi otomatik backup'ı genelde yeterlidir.
- **CV dosyaları** (`FileStorage:RootPath`): veritabanının dışında, ayrı bir disk/volume'de —
  bu da ayrıca yedeklenmeli (ör. volume snapshot) veya S3-uyumlu bir object storage'a taşınmalı;
  bu proje şu an yalnızca yerel disk depolamayı (`LocalFileStorageService`) destekliyor.
- **JWT signing key**: kaybedilirse tüm mevcut oturumlar geçersiz olur (kullanıcılar yeniden
  giriş yapmalı) — kritik ama veri kaybı değil, bir secret-management/rotasyon konusu.

## 14. Bilinen Sınırlamalar (Dürüstçe Belgelenmiş)

- Rate limiter tek-instance, in-memory (`Microsoft.AspNetCore.RateLimiting`) — yatay
  ölçeklenmiş (birden fazla instance) bir dağıtımda instance'lar arası paylaşılmaz. Tek instance
  bir dağıtımda tam olarak çalışır; çoklu instance'a geçerken bir dağıtık rate-limiter (ör.
  Redis-backed) değerlendirilmelidir — bu proje kapsamında eklenmedi (gereksiz bağımlılık
  eklememe talimatı gereği).
- Gerçek bir e-posta sağlayıcısı bağlı değil (bkz. §6) — parola sıfırlama/e-posta doğrulama
  şu an yalnızca Development'ta (loglama yoluyla) test edilebilir.
- localStorage'da JWT saklama (frontend) bilinçli, belgelenmiş bir trade-off
  (`docs/frontend-authentication.md`) — XSS senaryosunda token çalınabilir riski kabul edilmiş
  durumda.

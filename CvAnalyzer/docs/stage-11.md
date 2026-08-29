# Aşama 11 — Production Readiness + Kapsamlı Security Audit

Bu doküman, Aşama 11'de CVora AI üzerinde yapılan kapsamlı güvenlik denetiminin ve denetim
sırasında bulunup düzeltilen zafiyetlerin özetidir. Amaç yeni bir özellik eklemek değildi:
mevcut mimariyi (JWT auth, İyzico `IPaymentProvider`/`IPaymentService` katmanları, quota/plan
sistemi) **bozmadan** CVora AI'yı kırmaya çalışmak ve her düzeltmeyi bir negatif testle
kanıtlamaktı. Aşama 1–10'da kurulan hiçbir davranış değiştirilmedi; sadece eksik bir kontrol
bulunduğunda minimum güvenli düzeltme uygulandı.

Bu doküman **özet ve gezinme haritasıdır** — teknik derinlik için ilgili mevcut dokümana
yönlendirilir (`docs/authentication.md`, `docs/frontend-authentication.md`,
`docs/monetization.md`, `docs/iyzico-integration.md`).

## Yöntem

Kod tabanının tamamı (backend + frontend) satır satır denetlendi: auth/JWT/parola
hashleme/kayıt/giriş/parola sıfırlama/e-posta doğrulama/hesap kapatma, CV upload/PDF-DOCX
parsing/AI analiz, analiz geçmişi, quota/usage, abonelik, İyzico checkout/callback/webhook,
`PaymentTransaction`, rate limiting, contact formu, database/EF Core, frontend auth-state/
localStorage token yönetimi, API hata yönetimi, CORS, HTTP security header'ları, config/secret
yönetimi, logging, input validation, authorization/ownership kontrolleri. Her bulgu için önce
kök neden belirlendi, sonra minimum güvenli düzeltme uygulandı, sonra bir regresyon/negatif
testi yazıldı — "kodda var" hiçbir zaman "çalışıyor" kanıtı olarak kabul edilmedi.

## Bulunan ve Düzeltilen Zafiyetler

### 1. DOCX Zip-Bomb / Decompression DoS (Medium → Düzeltildi)

`FileParserService.ExtractDocxText` önceden `DocumentFormat.OpenXml` ile DOCX'i doğrudan
açıyordu — 10 MB'lık (upload limiti içindeki) kötü niyetli bir DOCX, yüksek sıkıştırma oranıyla
sunucu belleğinde gigabaytlarca veriye açılabilirdi (klasik zip bomb). Şimdi
`GuardAgainstZipBomb` DOCX'i açmadan **önce**, ZIP merkezi dizin metadata'sından (her girişin
`.Length` — decompress edilmeden okunan gerçek boyut) toplam açılmış boyutu (>50 MB) ve giriş
sayısını (>5000) kontrol ediyor, aşan dosyaları reddediyor. Test:
`FileParserServiceTests.ExtractTextAsync_DocxZipBomb_RejectedWithoutFullyDecompressing` — gerçek
`ZipArchive`/`CompressionLevel.SmallestSize` ile üretilmiş, küçük ama açıldığında dev boyuta
ulaşan bir DOCX ile kanıtlandı.

### 2. Parola Sıfırlama / Doğrulama / Hesap Uç Noktalarında Rate Limit Eksikliği (Medium → Düzeltildi)

Aşama 10'da eklenen `change-password`, `forgot-password`, `reset-password`, `send-verification`,
`verify-email`, `deactivate` uç noktalarının hiçbirinde `[EnableRateLimiting]` yoktu — brute-force
(parola sıfırlama token tahmini), enumeration amplifikasyonu ve doğrulama token'ı deneme
saldırılarına açıktı. İki yeni politika eklendi: `PasswordReset` (IP başına 10/dk — anonim uç
noktalar) ve `Account` (kullanıcı başına 20/dk — authenticated uç noktalar), mevcut
`RateLimitOptions`/`RateLimitPolicies` desenine uyularak. Testler:
`RateLimitingIntegrationTests.ForgotPassword_ExceedingThePermitLimit_ReturnsTooManyRequests`,
`AccountRateLimitingIntegrationTests.ChangePassword_ExceedingThePermitLimit_ReturnsTooManyRequests`
(ayrı bir test sınıfında — aynı `Auth` politikasını paylaşan mevcut login testiyle rate-limiter
state çakışmasını önlemek için).

### 3. Eksik HTTP Güvenlik Response Header'ları (Medium → Düzeltildi)

`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` hiçbir
response'ta yoktu; production'da `Content-Security-Policy` da yoktu (Development'ta Swagger UI
çalışabilsin diye CSP bilinçli olarak atlanıyor). `Middleware/SecurityHeaders.cs` — saf,
`WebApplicationFactory`'den bağımsız test edilebilir bir `Build(bool isDevelopment)`
fonksiyonu — eklendi; `Program.cs`'te `context.Response.OnStarting(...)` ile **her** response'a
(exception handler'ın ürettiği response'lar dahil) uygulanıyor. Testler:
`SecurityHeadersTests` (birim, environment'a göre CSP varlığı) +
`SecurityHeadersIntegrationTests` (gerçek HTTP response'ta header'ların varlığı, hata
response'ları dahil).

### 4. JWT Algoritma/Anahtar Sertleştirmesi (Low, Defense-in-Depth → Düzeltildi)

`TokenValidationParameters` algoritmayı örtük olarak (yalnızca `SymmetricSecurityKey`'in doğası
gereği) kısıtlıyordu — açık bir `ValidAlgorithms` pin'i yoktu. `RequireSignedTokens = true` ve
`ValidAlgorithms = [HmacSha256]` eklendi; ayrıca imzalama anahtarı için minimum 32 karakter (256
bit) uzunluk kontrolü (`Program.cs`'teki mevcut boş-anahtar fail-fast kontrolünün yanına)
eklendi. Testler: `Me_WithUnsignedAlgNoneToken_ReturnsUnauthorized` (klasik "alg: none" sahteciliği),
`Me_WithForgedAlgorithmHeader_ReturnsUnauthorized` (gerçek HMAC-SHA256 imzalı ama header'ı RS256
iddia eden bir token — imza değil, pinlenen algoritma reddediyor), `Me_WithTamperedPayload_ReturnsUnauthorized`.

### 5. Küçük JSON Uç Noktalarında Request Body Boyut Limiti Eksikliği (Medium → Düzeltildi)

`AuthController`, `ContactController`, `BillingController`'daki tüm küçük JSON/form body kabul
eden uç noktalar (register, login, change-password, forgot/reset-password, verify-email,
deactivate, contact, checkout, checkout/callback, webhook) `[RequestSizeLimit]` olmadan
Kestrel'in varsayılan 30 MB body limitini kullanıyordu — bir saldırgan birkaç string alanlık bir
endpoint'e onlarca megabaytlık body göndererek JSON model binder'ı gereksiz yere buffer/parse
etmeye zorlayabilirdi (ucuz bir bellek baskısı DoS vektörü). Her controller'a, gerçekçi en büyük
girdiye göre ölçülendirilmiş `[RequestSizeLimit]` eklendi (Auth/Billing: 8 KiB, Contact: 32 KiB —
4000 karakterlik mesaj alanına UTF-8/JSON-escaping payı ile).

**Test sırasında bulunan ek bug**: `[RequestSizeLimit]`'in `IHttpMaxRequestBodySizeFeature`
kullanan gerçek uygulaması, TestServer'da desteklenmediği için `RealServerWebApplicationFactory`
(gerçek Kestrel dinleyicisine bağlanan, ASP.NET Core'un resmi "test with a real server" deseni)
ile test edildi. Bu testler, limiti aşan bir body'nin gerçekte **500 Internal Server Error**
döndüğünü ortaya çıkardı — doğru davranış 413 Payload Too Large olmalıydı. Kök neden:
`Program.cs`'teki global `UseExceptionHandler`, her exception'ı körü körüne 500'e çeviriyordu;
Kestrel'in fırlattığı `BadHttpRequestException`'ın kendi taşıdığı doğru `StatusCode`'u (413)
görmezden geliyordu. Düzeltme: exception handler artık `BadHttpRequestException` için kendi
`StatusCode`'unu koruyor, diğer her şey için hâlâ güvenli, jenerik 500 dönüyor (stack
trace/exception detayı hiçbir zaman sızmıyor). Test:
`RequestSizeLimitIntegrationTests` (3 test — 413 dönüşü, normal body'nin çalışmaya devam ettiği,
Contact için de aynı doğrulama).

### 6. Ek Negatif Test Kapsamı (Kod Değişikliği Yok — Doğrulama)

- `VerifyEmailAsync_TokenReplayed_ThrowsInvalidOrExpiredTokenOnSecondUse`: e-posta doğrulama
  token'ının da (parola sıfırlama token'ı gibi) tek kullanımlık olduğu, önceden test edilmemiş
  olsa da kodda zaten doğru uygulanmıştı — şimdi kanıtlandı.
- `AnalysisDashboard`'da AI'nin döndürebileceği `<script>`/`<img onerror=...>` gibi içeriğin
  DOM'a gerçek bir `<script>`/`<img>` elemanı olarak değil, düz metin olarak render edildiğini
  kanıtlayan bir frontend testi eklendi — React'in varsayılan escaping'inin bu akışta fiilen
  devrede olduğu, kaynakta `dangerouslySetInnerHTML` olmamasına güvenmek yerine kanıtlandı.
- Çapraz kullanıcı IDOR (abonelik/ödeme geçmişi/iptal) zaten Aşama 9–10'da
  `PaymentServiceTests.CancelPremiumSubscriptionAsync_AnotherUsersSubscription_IsNeverAffected`
  ve `GetPaymentHistoryAsync_ReturnsOnlyCallingUsersOwnTransactions_NewestFirst` ile kapsanıyordu
  — tekrar doğrulandı, ek kod/test gerekmedi.

## Kabul Edilen Riskler (Bilinçli, Değiştirilmedi)

- **`CheckoutFormRenderer.tsx`'in `innerHTML` + script re-injection'ı**: İyzico'nun üçüncü taraf
  checkout-form embed snippet'ini render etmek için gerekli, kasıtlı bir güven sınırı — bunu
  değiştirmek ödeme entegrasyonunu bozar.
- **PDF için zip-bomb eşdeğeri koruma yok**: PdfPig, DOCX'in ZIP merkezi dizini gibi
  decompress-öncesi bir boyut metadata'sı sunmuyor. Risk, mevcut 10 MB upload limiti ve PDF'in
  DOCX'e göre daha az uç sıkıştırma oranlarıyla sınırlı — düşük/kabul edilen risk olarak
  belgeleniyor, aktif olarak azaltılmadı ("gereksiz kod yazma" talimatına uygun).
- **Rate limiter tek-instance, in-memory**: Yatay ölçeklenmiş (birden fazla instance) bir
  production dağıtımında paylaşılmaz — dürüstçe belgeleniyor; bu aşamada Redis vb. yeni bir
  bağımlılık eklenmedi (talimat gereği).
- **localStorage'da JWT saklama**: Aşama 7'de belgelenmiş, bilinçli bir trade-off
  (`docs/frontend-authentication.md`) — XSS senaryosunda token çalınabilir riski kabul edilmiş
  durumda; bu aşamada değiştirilmedi.

## Regresyon

- Backend: `dotnet clean && dotnet build && dotnet test` → **203/203** test yeşil (Aşama 10
  sonunda 196'ydı; bu aşamada +7 yeni güvenlik testi, hiçbir mevcut test zayıflatılmadı/silinmedi).
- Frontend: `npm run lint` (oxlint, temiz) + `npx vitest run` → **74/74** test yeşil (Aşama 10
  sonunda 73'tü; +1 yeni XSS-negative testi) + `npm run build` başarılı.
- E2E: Gerçek Chromium (Playwright) ile gerçek dev sunucularına (gerçek PostgreSQL dahil) karşı
  Landing → Register → Login → CV Upload → Analiz denemesi → Analiz Geçmişim → Hesabım → Premium
  checkout denemesi → Legal sayfalar → Şifre değiştirme → Logout akışı çalıştırıldı. Aşama 9–10'da
  olduğu gibi, bu ortamda gerçek bir AI API credential'ı ve gerçek bir İyzico sandbox
  credential'ı yok — analiz ve checkout adımları **gerçek, sahte olmayan**
  `AI_UNAVAILABLE`/`CHECKOUT_UNAVAILABLE` yanıtıyla sonuçlandı (hiçbir zaman gerçek dış servise
  istek gitmedi); ekranda hiçbir ham exception/stack trace görünmedi, tüm response'larda security
  header'ları canlı olarak doğrulandı.
- Secret scan: Commit öncesi tüm diff API key/secret/password/JWT signing key/İyzico credential
  deseni için tarandı — sadece test-only sabit stringler (`test-only-signing-key-...` vb.) ve
  sayısal rate-limit değerleri bulundu, gerçek bir credential yok.

## Değişen/Eklenen Dosyalar (Özet)

- `CvAnalyzer.Api/Middleware/SecurityHeaders.cs` (yeni)
- `CvAnalyzer.Api/Program.cs` (security header middleware, JWT sertleştirme, exception handler
  düzeltmesi, 2 yeni rate-limit politikası)
- `CvAnalyzer.Api/Services/FileProcessing/FileParserService.cs` (zip-bomb guard)
- `CvAnalyzer.Api/RateLimiting/{RateLimitOptions,RateLimitPolicies}.cs`,
  `CvAnalyzer.Api/appsettings.json` (PasswordReset/Account politikaları)
- `CvAnalyzer.Api/Controllers/{AuthController,BillingController,ContactController}.cs`
  (`[EnableRateLimiting]`, `[RequestSizeLimit]`)
- `CvAnalyzer.Api.Tests/**` (yeni: `SecurityHeadersTests`, `SecurityHeadersIntegrationTests`,
  `RealServerWebApplicationFactory`, `RequestSizeLimitIntegrationTests`; genişletilen:
  `AuthenticationIntegrationTests`, `RateLimitingIntegrationTests`, `AuthServiceTests`,
  `FileParserServiceTests`)
- `cv-analyzer-web/src/components/AnalysisDashboard.test.tsx` (XSS-negative testi)

Aşama 11 tamamlandı. Kullanıcı onayı olmadan bir sonraki aşamaya geçilmeyecek.

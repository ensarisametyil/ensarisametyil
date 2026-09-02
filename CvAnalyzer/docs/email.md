# Transactional Email

CVora AI'ın kullanıcılarına sistem tarafından otomatik, profesyonel e-posta gönderebilmesini
sağlayan altyapı. Aşama 10'dan beri var olan `IEmailService` seam'i **yeniden yazılmadı** —
sadece ikinci, gerçek bir implementasyonu (`SmtpEmailService`) eklendi ve `Program.cs`
başlangıçta hangisinin kullanılacağına karar veriyor. Mevcut authentication/registration/
password-reset iş mantığı, Iyzico/payment sistemi ve subscription logic'ine dokunulmadı.

## 1. Mimari

```
AuthService ──▶ IEmailService ──┬─▶ SmtpEmailService  (Smtp:* yapılandırılmışsa)
                                 │      │
                                 │      ├─▶ EmailCopyCatalog       (TR/EN/DE metin)
                                 │      ├─▶ EmailTemplateRenderer  (ortak HTML/plain-text kabuk)
                                 │      └─▶ ISmtpTransport ──▶ RealSmtpTransport ──▶ SmtpClient
                                 │
                                 └─▶ LoggingEmailService  (Smtp:* yapılandırılmamışsa — yalnızca
                                                            Development'ta loglar, aksi halde no-op)
```

- **`IEmailService`** (`Services/Email/IEmailService.cs`) — `AuthService`'in bildiği tek arayüz.
  Üç metod: `SendWelcomeEmailAsync`, `SendPasswordResetEmailAsync`, `SendEmailVerificationEmailAsync`.
  **Sözleşme: asla exception fırlatmaz.** Bir gönderim hatası (yanlış credential, ağ hatası,
  sağlayıcı kesintisi) çağıranın kendi işlemini (kayıt, token üretimi) asla bozmamalı — her ikisi
  de bu garantiyi tutuyor.
- **`SmtpEmailService`** (`Services/Email/SmtpEmailService.cs`) — gerçek gönderim. E-posta
  içeriğini (`EmailCopyCatalog` + `EmailTemplateRenderer`) oluşturur, `ISmtpTransport`'a devreder.
  Ağ/kimlik doğrulama hatalarını internal olarak yakalayıp loglar, asla yukarı fırlatmaz.
- **`ISmtpTransport`** (`Services/Email/ISmtpTransport.cs`) — asıl ağ I/O adımı, ayrı bir seam
  olarak çıkarıldı (`IPaymentProvider`/`IAiCvAnalysisService` ile aynı desen) — böylece
  `SmtpEmailServiceTests` gerçek bir SMTP bağlantısı hiç açmadan (fake transport ile) subject/
  recipient/HTML-plaintext içerik/locale doğrulayabiliyor.
- **`LoggingEmailService`** (değişmedi, Aşama 10'dan beri var) — `Smtp:*` yapılandırılmamışken
  kullanılan güvenli fallback; yalnızca Development'ta token'ı loglar, aksi halde no-op.
- **.NET'in kendi `System.Net.Mail.SmtpClient`'ı** kullanıldı — yeni bir NuGet paketi eklenmedi
  (bu codebase zaten `ContactController`'da `System.Net.Mail.MailAddress` kullanıyor). Tek-host,
  STARTTLS, kullanıcı adı/parola bağlantısı — Gmail SMTP'nin (ve ileride herhangi bir domain
  tabanlı SMTP sağlayıcısının) ihtiyaç duyduğu tam olarak budur.

## 2. Environment Variables

Mevcut projenin konvansiyonuna uyularak (`Iyzico:ApiKey` / `Iyzico__ApiKey`, `AI:ApiKey` /
`AI__ApiKey` ile aynı desen) `appsettings.json`'da yalnızca boş placeholder'lar var; gerçek
değerler **yalnızca** environment variable (production) veya `dotnet user-secrets`
(Development) üzerinden verilir:

| appsettings key | Environment variable | Zorunlu mu? | Açıklama |
|---|---|---|---|
| `Smtp:Host` | `Smtp__Host` | Gönderim için evet | Gmail için `smtp.gmail.com`. |
| `Smtp:Port` | `Smtp__Port` | Hayır (varsayılan 587) | 587 = STARTTLS, Gmail'in beklediği. |
| `Smtp:User` | `Smtp__User` | Gönderim için evet | CVora AI marka Gmail hesabının adresi. |
| `Smtp:Password` | `Smtp__Password` | Gönderim için evet | **Gerçek Gmail şifresi DEĞİL** — bkz. §3. |
| `Smtp:FromAddress` | `Smtp__FromAddress` | Gönderim için evet | Genelde `Smtp:User` ile aynı. |
| `Smtp:FromName` | `Smtp__FromName` | Hayır (varsayılan "CVora AI") | Alıcının gördüğü gönderen adı. |
| `Smtp:EnableSsl` | `Smtp__EnableSsl` | Hayır (varsayılan true) | Gmail için true kalmalı. |
| `Smtp:FrontendBaseUrl` | `Smtp__FrontendBaseUrl` | Hayır (varsayılan `http://localhost:5173`) | E-posta içindeki linklerin (şifre sıfırlama, dashboard CTA) origin'i — bkz. §5. |

Kullanıcının orijinal talebindeki `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/
`MAIL_FROM`/`MAIL_FROM_NAME` isimleri, bu projenin **zaten var olan** `Section__Key`
konvansiyonuna (`Jwt__SigningKey`, `Iyzico__ApiKey` ile aynı) eşleniyor — kavramsal olarak
birebir aynı bilgiler, sadece mevcut projenin ismlendirmesine uygun.

**Beşi de eksikse** (`Smtp:Host`/`User`/`Password`/`FromAddress` boşsa) — `Program.cs`
otomatik olarak `LoggingEmailService`'e düşer; uygulama başlamaz demek **değildir**, sadece
gerçek e-posta gönderilmez (Development'ta loglanır, production'da sessizce hiçbir şey yapmaz).
Hiçbir gerçek credential kaynak kodda, frontend'de, Git repository'sinde, test dosyalarında,
loglarda veya error response'larında bulunmaz — bkz. §7.

### Development'ta ayarlama

```
dotnet user-secrets set Smtp:Host "smtp.gmail.com"
dotnet user-secrets set Smtp:Port "587"
dotnet user-secrets set Smtp:User "cvora.ai@gmail.com"
dotnet user-secrets set Smtp:Password "<16 karakterlik Google App Password>"
dotnet user-secrets set Smtp:FromAddress "cvora.ai@gmail.com"
```

## 3. Gmail SMTP Kurulumu

CVora AI marka Gmail hesabıyla gerçek e-posta göndermek için:

1. O Gmail hesabında **2 Adımlı Doğrulama** açık olmalı (App Password'lar bunu gerektirir).
2. Google Hesap Ayarları → Güvenlik → **Uygulama Şifreleri** ("App Passwords") bölümünden
   16 karakterlik bir uygulama şifresi oluşturun (ör. "Mail" adında bir uygulama için).
3. Bu 16 karakterlik değeri `Smtp:Password` olarak ayarlayın — **hesabın gerçek Gmail şifresi
   değil**, bu App Password.
4. `Smtp:User` ve `Smtp:FromAddress` o Gmail adresinin kendisi.

Domain/hosting alındığında (`@cvorai...` adresine geçiş): sadece `Smtp:Host`/`Smtp:User`/
`Smtp:Password`/`Smtp:FromAddress` değerlerini yeni sağlayıcının (Google Workspace, veya
tamamen farklı bir SMTP/transactional-email sağlayıcısı) bilgileriyle değiştirin — hiçbir kod
değişikliği gerekmez (bkz. §6).

## 4. E-posta Template Sistemi

Tek bir devasa HTML dosyası yerine üç parça:

- **`EmailTemplateRenderer`** (`Services/Email/EmailTemplateRenderer.cs`) — her e-postanın
  ortak kabuğu: CVora AI header'ı, içerik bölümü, CTA butonu (varsa), footer. Hem HTML hem
  plain-text fallback üretir (multipart/alternative — text/plain önce, text/html sonra, e-posta
  istemcisi kendi tercih ettiğini gösterir).
- **`EmailCopyCatalog`** (`Services/Email/EmailCopyCatalog.cs`) — TR/EN/DE metinler
  (frontend'in `i18n/locales/*.json`'ına paralel bir disiplin, ama backend'in kendi, ayrı evi —
  frontend'in TypeScript modülleri API process'inden erişilemez). Yeni bir e-posta tipi eklemek
  için buraya yeni bir `EmailCopy` üreten metod eklenir; hardcoded metin `SmtpEmailService`
  içinde asla yazılmaz.
- **`SmtpEmailService`** ikisini birleştirir: `EmailCopyCatalog`'dan metni alır,
  `EmailTemplateRenderer.Render(...)`'a verir, sonucu gönderir.

### Dinamik değerlerin güvenli inject edilmesi

`EmailTemplateRenderer.Render` heading/CTA URL/CTA label'ı `System.Net.WebUtility.HtmlEncode`
ile escape eder — bir CTA URL (frontend origin + bir token) derlenmiş bir değerdir, kör
güvenilmez. `EmailCopyCatalog`'un ürettiği `bodyHtml`/`footerNoteHtml` ise bu kod tabanının
kendi yazdığı, kullanıcı girdisi içermeyen sabit metin olduğu için tekrar escape edilmez (aksi
halde gerçek `<p>` etiketleri alıcının kutusunda görünür "&lt;p&gt;" metnine dönüşürdü). Şifre
sıfırlama/e-posta doğrulama token'ları yalnızca `Uri.EscapeDataString` ile URL-escape edilmiş
olarak CTA linkinin `?token=` parametresinde görünür — hiçbir e-postanın body metninde çıplak
token yoktur. Bkz. `EmailTemplateRendererTests.cs` (XSS/HTML-injection escaping testleri).

### Yeni bir template eklemek

1. `EmailCopyCatalog`'a yeni bir `public static EmailCopy XyzNotification(string locale, ...)`
   metodu ekleyin — `tr`/`en`/`de` için `switch` ifadesiyle (unrecognized locale → `tr`
   fallback, `EmailCopyCatalog.DefaultLocale`'a eşit).
2. `IEmailService`'e yeni bir `SendXyzNotificationAsync(...)` metodu ekleyin (locale parametresi
   `= EmailCopyCatalog.DefaultLocale` varsayılanıyla — mevcut çağrı yerlerini bozmaz).
3. `SmtpEmailService` ve `LoggingEmailService`'te implemente edin — `SmtpEmailService` tarafı
   `EmailCopyCatalog.XyzNotification(locale, ...)` + `EmailTemplateRenderer.Render(...)` +
   `SendAsync(...)` deseninin aynısını izler.
4. `FakeEmailService` (test helper) ve ilgili testleri güncelleyin.

## 5. İlk E-posta Senaryoları

### A. Welcome Email

`AuthService.RegisterAsync` — kullanıcı DB'ye kaydedildikten **sonra** (kayıt işleminin kendisi
e-posta gönderiminden asla etkilenmez — bkz. §6) `IEmailService.SendWelcomeEmailAsync` çağrılır.
CTA linki `{Smtp:FrontendBaseUrl}/app`'e (dashboard) işaret eder. Token/hassas veri taşımaz.

### B. Password Reset Email

Mevcut `UserToken` mekanizması **aynen** kullanıldı — yeni bir authentication sistemi
kurulmadı. `AuthService.IssueTokenAsync` (Aşama 10'dan beri var) zaten token'ı üretip
`IEmailService`'e devrediyordu; tek değişen, artık gerçek bir implementasyonun bunu gerçekten
gönderebilmesi. Reset URL: `{Smtp:FrontendBaseUrl}/reset-password?token={URL-escaped token}`
— mevcut `ResetPasswordPage.tsx`'in zaten okuduğu `?token=` query parametresiyle birebir uyumlu.
Token hiçbir zaman loglanmaz (Production'da) veya bir API response'unda görünmez — yalnızca bu
tek e-postanın içinde.

`POST /api/auth/forgot-password`'ün enumeration-safe davranışı (kayıtlı/kayıtsız e-posta için
**aynı** yanıt) korunuyor — `SmtpOptions.IsConfigured`'a göre mesaj metni değişir (yapılandırılmışsa
dürüstçe "gönderildi" der, değilse eski "henüz aktif değil" mesajını verir), ama bu seçim asla
belirli bir e-postanın kayıtlı olup olmadığına bakmaz — yalnızca ortamın genel gönderim
kapasitesine.

### C. Future Notification Infrastructure

`IEmailService` genişletilebilir tasarlandı (§4'teki "yeni template ekleme" adımları) —
subscription/payment/CV-analysis/usage-quota/account bildirimleri ileride buraya eklenebilir.
Bu aşamada **hiçbiri implemente edilmedi** (gereksiz feature implementation yapılmadı).

### Not: Email Verification bugün hiçbir UI'dan tetiklenmiyor

`SendEmailVerificationEmailAsync` (Aşama 10'dan beri var olan bir interface metodu)
`SmtpEmailService`'te de implemente edildi (interface tamlığı için), CTA'sı
`{Smtp:FrontendBaseUrl}/verify-email?token=...`'a işaret ediyor — ama frontend'de böyle bir
route/sayfa **yok**, ve `POST /api/auth/send-verification`'ı tetikleyen hiçbir buton/link de yok
(bkz. `docs/authentication.md` §9.3). Yani bu e-posta tipi bugün gerçek kullanıcı trafiğine asla
çıkmıyor — kod tam ve test edilmiş durumda, frontend'e bu akış eklendiğinde hiçbir backend
değişikliği gerekmeyecek.

## 6. Authentication Flow Entegrasyonu — Hata Yönetimi

- **Kayıt (`RegisterAsync`)**: Kullanıcı `_db.SaveChangesAsync()` ile kalıcı olarak
  oluşturulduktan **sonra** welcome email gönderilir. `IEmailService`'in "asla fırlatma"
  sözleşmesi sayesinde bir SMTP hatası kaydı asla bozamaz — kod bu yüzden `try/catch` ile
  sarmalanmadı (gerek yok, sözleşme zaten SmtpEmailService seviyesinde garanti ediliyor).
- **Şifre sıfırlama/doğrulama token'ı (`IssueTokenAsync`)**: Token önce DB'ye yazılır
  (`SaveChangesAsync`), sonra e-posta gönderilir — aynı gerekçeyle. Bir SMTP hatası olsa bile
  token DB'de geçerli kalır (kullanıcı `forgot-password`'ü tekrar tetikleyebilir, ya da —
  Development'ta — token zaten loglanmış olabilir).
- **Kullanıcıya sensitive SMTP/internal error asla döndürülmez**: `SmtpEmailService.SendAsync`
  içindeki `catch` bloğu istisnayı yalnızca `ILogger` ile loglar (alıcı e-postası **hariç** —
  bkz. §7), asla yukarı fırlatmaz; controller katmanı bir SMTP hatasının var olduğunu bile bilmez.
- **`forgot-password`'ün enumeration-safe davranışı bozulmadı** — bkz. §5.B.

## 7. Frontend

`ForgotPasswordPage.tsx` zaten backend'in döndürdüğü `message` alanını olduğu gibi gösteriyordu
(Aşama 10'dan beri) — bu davranış **değiştirilmedi**; backend artık farklı (ama hâlâ dürüst) bir
metin döndürdüğü için sayfa otomatik olarak doğru "gönderildi" mesajını gösteriyor, hiçbir
frontend kod değişikliği gerekmedi. Mevcut tasarımı bozacak gereksiz bir UI değişikliği
yapılmadı.

`httpClient.ts` artık her istekte `Accept-Language` header'ını (aktif UI dilinden,
`localStorage`'daki `cvorai.locale` anahtarından — best-effort, `try/catch` ile) gönderiyor —
böylece backend'in oluşturduğu e-postalar kullanıcının arayüzde seçtiği dille eşleşiyor. Bu
tamamen additive bir header; hiçbir mevcut request/response contract'ı değişmedi.

## 8. i18n

`AuthController.ResolveLocale()` `Accept-Language` header'ını okur (q-weighted liste
desteklenir, ilk segment alınır), CVora AI'nin desteklediği üç dilden (`tr`/`en`/`de`) biri
değilse veya header yoksa **Turkish**'e düşer — frontend'in `DEFAULT_LOCALE` davranışıyla
birebir aynı. Bu, herhangi bir DTO/contract'ı değiştirmeden (locale bir request-body alanı
**değil**, bir HTTP header) e-posta içeriğinin doğru dilde render edilmesini sağlıyor.

`EmailCopyCatalog`, frontend'in `i18n/locales/*.json` dosyalarına paralel bir disiplinle
(hardcoded metin yok, her locale için ayrı, unrecognized locale → Turkish fallback)
tr/en/de içerik barındırıyor — ama backend'in kendi, ayrı evinde (frontend'in TS modülleri API
process'inden erişilemez).

## 9. Development / Production

- **Development, `Smtp:*` ayarlanmamışken**: `LoggingEmailService` — token'ı `[DEV ONLY]`
  etiketiyle loglar, gerçek e-posta gitmez.
- **Development, `Smtp:*` ayarlanmışken**: `SmtpEmailService` — gerçek Gmail SMTP üzerinden
  gerçek e-posta gönderilir (test ederken dikkat: gerçek bir alıcı adresi kullanın).
- **Production**: Aynı `Smtp:*` yapılandırması, environment variable üzerinden. SMTP provider
  bilgisi hiçbir yerde hardcode edilmedi — `Program.cs` `SmtpOptions.IsConfigured`'a bakarak
  karar veriyor, provider'ın Gmail mi yoksa başka bir SMTP host'u mu olduğunu hiç bilmiyor.

## 10. Testler

**Hiçbir test gerçek Gmail hesabına bağlanmaya çalışmaz.** `SmtpEmailServiceTests.cs`
(`CvAnalyzer.Api.Tests/Services/Email/`) her testte `FakeSmtpTransport` (test helper, ağa hiç
dokunmaz) inject eder ve şunları doğrular:

- Welcome/password-reset/email-verification e-postaları oluşturuluyor mu?
- Doğru recipient (`MailMessage.To`) kullanılıyor mu?
- Subject doğru mu (ve locale'e göre değişiyor mu — TR/EN/DE + unrecognized→TR fallback)?
- Template doğru render ediliyor mu (HTML + plain-text, her ikisi de `AlternateViews`'ta)?
- Dynamic değerler (CTA URL'i, token, kalan geçerlilik süresi) doğru mu?
- SMTP hatası (fake transport'un fırlattığı bir exception) çağırana asla sızmıyor ve alıcı
  e-postasını loglamadan güvenli şekilde loglanıyor mu?

Ayrıca: `EmailTemplateRendererTests.cs` (HTML-escaping/XSS koruması), `EmailCopyCatalogTests.cs`
(her locale için içerik var mı, fallback doğru mu, İngilizce tekil/çoğul "hour/hours" doğru mu),
`LoggingEmailServiceTests.cs` (welcome email dahil, güncellendi), `AuthServiceTests.cs` (welcome
email dispatch + locale threading), `AuthControllerTests.cs` (Accept-Language header'dan locale
çözümleme, Smtp yapılandırılmış/yapılandırılmamış durumlarında mesaj dürüstlüğü).

## 11. Security

- SMTP şifresi (Gmail App Password) kaynak kodda **hiçbir zaman** yok — yalnızca
  environment variable / user-secrets.
- SMTP credential'ları frontend'e asla gönderilmez (frontend hiçbir `Smtp:*` değeri görmez —
  bu bilgiler yalnızca backend process'inde, `IOptions<SmtpOptions>` üzerinden yaşar).
- E-posta içeriğinde gereksiz hassas kullanıcı verisi yok — welcome email yalnızca genel
  içerik, reset/verification e-postaları yalnızca URL-escaped bir token (body metninde çıplak
  token asla yok — bkz. §4).
- Password-reset/email-verification token'ları **hiçbir zaman** loglanmaz (Production'da);
  Development'ta bile yalnızca `LoggingEmailService` aktifken (Smtp yapılandırılmamışken)
  loglanır — `SmtpEmailService` aktifken (gerçek gönderim varken) token asla log'a yazılmaz.
- CTA URL'leri güvenli oluşturulur: `Uri.EscapeDataString` ile token URL-encode edilir,
  `EmailTemplateRenderer` ayrıca HTML-attribute-escape uygular (defense in depth).
- HTML template injection önlendi — `EmailTemplateRendererTests.cs` bir CTA URL/label/heading'e
  `<script>`/`">` gibi karakterler enjekte edilse bile bunların HTML olarak render edilmediğini
  (yalnızca escape edilmiş metin olarak göründüğünü) doğruluyor.
- Kullanıcı e-posta adresleri loglarda açık tutulmuyor — `SmtpEmailService`'in hata logu yalnızca
  hangi e-posta **tipinin** (welcome/password-reset/email-verification) başarısız olduğunu
  loglar, alıcı adresini asla içermez (bu codebase'in mevcut, e-posta adresi hiç loglamama
  disiplinine uygun — grep ile doğrulandı, önceden de hiçbir yerde `_logger.Log*` çağrısı bir
  e-posta adresi içermiyordu).
- SMTP hataları kullanıcıya asla expose edilmez (bkz. §6).
- Environment secrets Git'e girmedi — `appsettings.json`'daki `Smtp` bölümü tamamen boş
  placeholder; `.gitignore` zaten `appsettings.*.local.json`/user-secrets dosyalarını kapsıyor.

## 12. Bilinen Sınırlamalar (Dürüstçe Belgelenmiş)

- Rate limiting: `/api/auth/register` ve `/api/auth/forgot-password` zaten `Auth`/`PasswordReset`
  rate-limit policy'lerini taşıyor (Aşama 11) — bu, dolaylı olarak e-posta gönderim hızını da
  sınırlıyor (ayrı bir "e-posta gönderim rate limiti" eklenmedi, gerek yok).
- Tek SMTP sağlayıcı, tek hesap — yüksek hacimli production trafiğinde Gmail'in kendi gönderim
  limitleri (günlük ~500 e-posta, hesaba göre değişir) devreye girer; domain/hosting alındığında
  gerçek bir transactional-email sağlayıcısına (SendGrid, SES, Postmark, vb.) geçiş bu limiti
  ortadan kaldırır — mimari zaten bu geçişi tek bir `IEmailService` implementasyonu değişikliğine
  indirgeyecek şekilde tasarlandı (bkz. §1, §3).
- E-posta teslim durumu (bounce, spam-şikayeti, açılma) izlenmiyor — bu, bir transactional-email
  sağlayıcısına geçişle birlikte gelecek bir özellik (bu aşamanın kapsamı dışında).

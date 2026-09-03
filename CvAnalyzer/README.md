# CVora AI

CVora AI, kullanıcıların CV'lerini (PDF/DOCX) yükleyip yapay zekâ ile analiz ettirebildiği,
sonuçlarını geçmiş olarak saklayabildiği ve Free/Premium abonelik modeliyle çalışan bir SaaS
uygulamasıdır. Temel CV analizinin yanında bir **AI Kariyer Asistanı** sunar: iş ilanı eşleştirme,
ATS uyumluluk tahmini, CV yeniden yazım önerileri, kariyer önerileri, ön yazı oluşturucu,
deterministik "CVora Score" ve CV A/B karşılaştırma. Kimlik doğrulama, kullanıcı bazlı
yetkilendirme, kota/abonelik yönetimi, gerçek İyzico ödeme entegrasyonu, çok dilli arayüz
(TR/EN/DE) ve bir yönetici (admin) paneli içerir.

Bu paket, projenin production'a çıkmadan önce **lokal bir makinede kullanıcı gözüyle
incelenebilmesi** için hazırlanmış, çalışan kod tabanının tam bir kopyasıdır — hiçbir özellik
çıkarılmadı veya değiştirilmedi.

## Mimari

```
CVora-AI/
├── CvAnalyzer.Api/          ASP.NET Core 8 backend (REST API)
├── CvAnalyzer.Api.Tests/    xUnit backend test projesi (386 test)
├── cv-analyzer-web/         React + TypeScript + Vite frontend (152 test)
├── docs/                    Mimari/özellik dokümantasyonu (aşağıya bakın)
└── CvAnalyzer.sln           .NET solution dosyası
```

Backend, PostgreSQL üzerinde Entity Framework Core ile çalışır; kimlik doğrulama JWT tabanlıdır;
AI analizleri Anthropic Claude API'sine (`IAnthropicMessagesGateway` soyutlaması üzerinden)
gönderilir; ödeme İyzico'nun resmi `.NET` SDK'sı ile entegredir. Frontend, backend'e sadece HTTP
üzerinden (fetch) konuşur — hiçbir gizli bilgi (API key, JWT signing key vb.) frontend koduna asla
gömülmez.

## Gereksinimler

- **.NET 8 SDK**
- **Node.js 20+**
- **PostgreSQL 14+** (yerel kurulum veya Docker)
- (Opsiyonel, tam özellik seti için) Anthropic API key, Gmail/SMTP hesabı, İyzico sandbox/production
  credential'ları — bunlar olmadan da uygulama **çalışır**; sadece AI analiz uçları 503, e-posta
  gönderimi sessiz no-op, ödeme uçları 503 döner (bkz. aşağıdaki "Environment Variable'lar").

## Hızlı Başlangıç

### 1. Veritabanı

**Seçenek A — kendi PostgreSQL kurulumunuz varsa:**

```bash
# PostgreSQL'de boş bir veritabanı ve kullanıcı oluşturun (örnek):
createdb cvanalyzer_dev
```

**Seçenek B — Docker Desktop kuruluysa (PostgreSQL kurulum/şifre derdiyle uğraşmak
istemiyorsanız, önerilen):**

```bash
docker compose up -d
```

Bu, `docker-compose.yml`'de tanımlı, yalnızca yerel geliştirme için sabit kullanıcı adı/şifreyle
(`cvora` / `cvora_local_dev_only`, `cvanalyzer_dev` veritabanı, port `5432`) bir PostgreSQL
container'ı başlatır — bu, gerçek bir secret değildir, yalnızca bu tek-amaçlı container'a özel,
dışarıya kapalı bir yerel geliştirme değeridir. 2. adımdaki connection string'i buna göre
kullanın (aşağıdaki örnekte zaten bu değerler var).

### 2. Backend (`CvAnalyzer.Api`)

```bash
cd CvAnalyzer.Api

# Development'ta secret'lar dotnet user-secrets ile ayarlanır (repo'ya asla yazılmaz).
# Seçenek B'yi (docker compose up) kullandıysanız aşağıdaki gibi kullanın:
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=cvanalyzer_dev;Username=cvora;Password=cvora_local_dev_only"
# Seçenek A'yı kullandıysanız kendi kullanıcı adı/şifrenizi yazın:
# dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Database=cvanalyzer_dev;Username=<kullanici>;Password=<parola>"
dotnet user-secrets set "Jwt:SigningKey" "$(openssl rand -base64 48)"

# Migration'ları uygulayın (dotnet-ef aracı kurulu değilse: dotnet tool install --global dotnet-ef)
dotnet ef database update --project . --startup-project .

# Çalıştırın (varsayılan: http://localhost:5285)
dotnet run
```

`GET http://localhost:5285/health` `200 {"status":"ok"}` dönmelidir.

### 3. Frontend (`cv-analyzer-web`)

```bash
cd cv-analyzer-web
npm install

# Backend farklı bir adreste çalışıyorsa .env.example'ı kopyalayıp özelleştirin:
cp .env.example .env.local   # VITE_API_BASE_URL varsayılanı http://localhost:5285

npm run dev
# http://localhost:5173
```

Backend'in `Cors:AllowedOrigins` ayarının (bkz. `CvAnalyzer.Api/appsettings.json`) frontend'in
çalıştığı origin'i (varsayılan `http://localhost:5173`) içerdiğinden emin olun.

### 4. Uygulamayı kullanma

`http://localhost:5173` adresine gidin, bir hesap oluşturun, bir CV yükleyin. `AI:ApiKey`
ayarlanmamışsa "Analiz Et" ve Kariyer Asistanı özellikleri güvenli bir `503`/hata mesajı
gösterir — bu beklenen bir davranıştır, uygulama çökmez (bkz. aşağıdaki tablo).

## Environment Variable'lar

Backend, `Section__Key` formatındaki environment variable'ları `appsettings.json`'daki
`"Section": { "Key": ... }` yapısına otomatik eşler. Development'ta bunun yerine
`dotnet user-secrets` kullanın (yukarıya bakın); production için tam liste ve gerekçeleri
**`docs/production.md`**'dedir. Özet:

| Değişken | Zorunlu mu? | Eksikse ne olur? |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | **Evet** | Uygulama başlamaz (fail-fast) |
| `Jwt__SigningKey` (≥32 karakter) | **Evet** | Uygulama başlamaz (fail-fast) |
| `AI__ApiKey` (Anthropic) | Hayır | `/analyze` ve Kariyer Asistanı uçları `503 AI_UNAVAILABLE` döner; uygulamanın geri kalanı normal çalışır |
| `Smtp__Host`/`Port`/`User`/`Password`/`FromAddress` | Hayır | E-posta gönderimi yerine (Development'ta) konsola loglanır / (Production'da) sessiz no-op olur |
| `Iyzico__ApiKey`/`SecretKey`/`PremiumPricingPlanReferenceCode` | Hayır | Checkout uçları `503 CHECKOUT_UNAVAILABLE` döner |
| `Cors__AllowedOrigins__0` | Önerilir | Varsayılan `appsettings.json`'daki `http://localhost:5173` |
| `Admin__BootstrapEmail` | Hayır | İlk admin kullanıcı otomatik atanmaz (bkz. `docs/admin-panel.md`) |

Frontend'in tek environment variable'ı **`VITE_API_BASE_URL`**'dir (bkz.
`cv-analyzer-web/.env.example`) — build-time'da gömülür.

**Hiçbir gerçek secret bu repoda yoktur.** `appsettings.json` yalnızca boş placeholder değerler
içerir; gerçek değerler her zaman `dotnet user-secrets` (dev) veya environment variable
(production) üzerinden verilir.

## Testleri Çalıştırma

```bash
# Backend — 386 test
cd CvAnalyzer.Api.Tests/.. && dotnet test

# Frontend — 152 test + typecheck + lint
cd cv-analyzer-web
npm test
npx tsc --noEmit
npm run lint
```

Hiçbir test gerçek Anthropic/İyzico/SMTP servislerine bağlanmaz — hepsi fake/mock implementasyonlar
üzerinden çalışır, bu yüzden internet bağlantısı veya gerçek credential gerektirmez.

## Daha Fazla Bilgi

Ayrıntılı mimari/özellik dokümantasyonu `docs/` klasöründedir — özellikle:

- `docs/production.md` — tam environment variable listesi ve production deployment checklist'i
- `docs/career-assistant.md` — AI Kariyer Asistanı özellikleri (Job Match, ATS, Rewrite,
  Recommendations, Cover Letter, CVora Score, A/B Compare)
- `docs/authentication.md` / `docs/frontend-authentication.md` — kimlik doğrulama akışı
- `docs/monetization.md` / `docs/iyzico-integration.md` — Free/Premium plan ve ödeme entegrasyonu
- `docs/email.md` — transactional e-posta sistemi
- `docs/admin-panel.md` — admin paneli
- `docs/i18n.md` — çoklu dil (TR/EN/DE) mimarisi
- `cv-analyzer-web/README.md` — frontend'e özel geliştirici notları

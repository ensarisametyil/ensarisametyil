# Deployment (Hosting) Guide

Bu doküman, CVora AI'ı gerçek bir sunucuya/hosting ortamına çıkarmak için hazırlanmış Docker
tabanlı paketleme sürecini anlatır. `docs/production.md` environment variable'ların tam listesini
ve gerekçelerini içerir — bu doküman onun üzerine, **gerçekten container'a alma ve çalıştırma**
adımlarını ekler.

## Nasıl paketlendi

- `CvAnalyzer.Api/Dockerfile` — backend, çok aşamalı build (.NET SDK → ASP.NET runtime), non-root
  kullanıcı, `8080` portunda dinler.
- `cv-analyzer-web/Dockerfile` + `cv-analyzer-web/nginx.conf` — frontend, Vite ile derlenip
  nginx'in non-root varyantıyla (`nginxinc/nginx-unprivileged`) statik olarak servis edilir, SPA
  fallback route'lu, `8080` portunda dinler.
- `docker-compose.prod.yml` — ikisini birlikte ayağa kaldırır; hiçbir secret'ı dosyanın içinde
  **barındırmaz**, hepsini `.env.prod`'dan (veya shell ortamından) okur.
- `.env.prod.example` — doldurup `.env.prod` olarak kaydedeceğiniz şablon.

**Bu compose dosyası PostgreSQL çalıştırmaz.** Production verisi (kullanıcı hesapları, ödeme
kayıtları, CV geçmişi) yönetilen bir veritabanında (RDS, Cloud SQL, DigitalOcean Managed
Postgres, vb. — düzenli yedekleme/point-in-time-recovery'si olan) durmalı, bu compose dosyasının
yaşam döngüsüne bağlı bir container'da değil. `CONNECTION_STRING`'i o veritabanına işaret edecek
şekilde ayarlayın.

## Bu sandbox'ta neyi doğruladım, neyi doğrulayamadım (dürüstçe)

Bu paket, bu oturumda Docker daemon'ı gerçekten çalıştırıp test ederek hazırlandı — ama bu
sandbox'ın kendi ağ politikası, Docker Hub'dan (`docker.io`) imaj çekmeyi engelliyor (yalnızca
`mcr.microsoft.com` erişilebilir durumdaydı). Bu yüzden:

- ✅ `docker-compose.prod.yml`'in **syntax'i ve tüm environment variable interpolation'ı** gerçek
  `docker compose config` ile doğrulandı (hem başarılı hem de eksik-değişken durumunda doğru
  hata verdiğini gördüm).
- ✅ Backend Dockerfile'ın `mcr.microsoft.com/dotnet/sdk:8.0` imajını çekmesi ve `COPY`/`WORKDIR`
  adımları gerçekten çalıştı; yalnızca `dotnet restore`'un NuGet'e erişimi bu sandbox'ın ağ
  politikası tarafından engellendiği için tam `docker build` tamamlanamadı.
- ❌ `node:20-alpine` ve `nginxinc/nginx-unprivileged` imajları Docker Hub'dan geldiği için bu
  sandbox'ta hiç çekilemedi — frontend Dockerfile'ı burada uçtan uca test edemedim.

**Sonuç**: Dockerfile'lar .NET/Vite/nginx için standart, yaygın kullanılan desenlerle yazıldı ve
bu projenin gerçek build komutlarıyla (`dotnet publish`, `npm run build`) bu oturum boyunca defalarca
doğrulanan aynı adımları kullanıyor — ama gerçek bir `docker compose -f docker-compose.prod.yml
build` çalıştırmasını **siz** kendi makinenizde/sunucunuzda yapmalısınız. İlk denemede bir hata
alırsanız, tam hata çıktısını bana yapıştırın, hemen düzeltirim.

## Adım adım (genel bir VPS/sunucu için)

Bu, herhangi bir Docker'ın çalıştığı sunucuda (kendi VPS'iniz, veya Docker destekleyen bir hosting
platformu) işleyen en evrensel yoldur.

1. **Yönetilen bir PostgreSQL veritabanı edinin** (veya sunucunuzda kendi Postgres'inizi kurun —
   ama yedekleme sorumluluğu size düşer).

2. **Projeyi sunucuya kopyalayın** (git clone veya bu ZIP'i çıkarın).

3. **`.env.prod` dosyasını hazırlayın**:
   ```bash
   cp .env.prod.example .env.prod
   # .env.prod'u gerçek değerlerle doldurun — bu dosyayı ASLA commit etmeyin
   ```
   `JWT_SIGNING_KEY` için: `openssl rand -base64 48`

4. **Domain/DNS'inizi ayarlayın** — `FRONTEND_ORIGIN` ve `BACKEND_ORIGIN` gerçek domain'lerinize
   işaret etmeli (örn. `app.cvorai.com` / `api.cvorai.com`).

5. **Build edip başlatın**:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```

6. **Veritabanı migration'larını uygulayın** (yalnızca bir kez, ilk deploy'da ve her yeni
   migration'da):
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm backend \
     dotnet ef database update --connection "$CONNECTION_STRING"
   ```
   (Bu komut `dotnet-ef` aracının runtime image'ında bulunmasını gerektirir — runtime image'da
   yok, bu yüzden pratikte migration'ı ya kendi makinenizden `dotnet ef database update
   --connection "<production connection string>"` ile, ya da ayrı bir SDK-tabanlı bir kerelik
   container'dan çalıştırın; `docs/production.md` §4 bu komutu ayrıntılı anlatıyor.)

7. **HTTPS'i önünüze koyun.** Bu compose dosyası backend/frontend'i düz HTTP üzerinden dinletir
   (8080/8081); gerçek TLS'i bir reverse proxy (Caddy, nginx, Traefik) veya hosting
   platformunuzun kendi TLS sonlandırması sağlamalı. Eğer backend'in önünde böyle bir proxy
   varsa VE backend container'ı hiçbir zaman doğrudan internete açık DEĞİLSE (yalnızca o proxy
   üzerinden erişilebiliyorsa), `.env.prod`'da `TRUST_FORWARDED_HEADERS=true` yapın — aksi halde
   `false` bırakın (varsayılan). Bu, `X-Forwarded-Proto`/`X-Forwarded-For` header'larının doğru
   yorumlanmasını sağlar; olmadan reverse-proxy arkasında HTTPS-redirect döngüsü ve
   IP-bazlı rate limit'lerin (login/register/contact/password-reset) tüm kullanıcılar için tek
   bir kovaya toplanması gibi sorunlar oluşur.

8. **İlk admin'i atayın** — `.env.prod`'daki `ADMIN_BOOTSTRAP_EMAIL`'i, önce normal şekilde kayıt
   olacağınız e-postanıza ayarlayın; uygulama açılışta bu hesabı otomatik admin yapar (bkz.
   `docs/admin-panel.md`).

9. **Doğrulayın**:
   ```bash
   curl https://api.yourdomain.com/health        # {"status":"ok"}
   curl https://api.yourdomain.com/health/ready   # DB bağlantısı gerçekten çalışıyor mu
   ```
   Sonra tarayıcıdan `https://app.yourdomain.com`'a gidip kayıt olun.

## PaaS notu (Railway / Render / Fly.io vb.)

Bu iki Dockerfile bağımsız, birbirinden ayrı deploy edilebilecek şekilde yazıldı — çoğu Docker
destekleyen PaaS'te `CvAnalyzer.Api/Dockerfile` ve `cv-analyzer-web/Dockerfile`'ı iki ayrı servis
olarak, `docs/production.md` §2'deki environment variable'ları platformun kendi secret
yönetimiyle vererek deploy edebilirsiniz — `docker-compose.prod.yml`'e ihtiyacınız olmaz (o
yalnızca "tek sunucuda docker compose" senaryosu için). Frontend'in `VITE_API_BASE_URL`'i
build-time'da gömüldüğü için, platformun build-arg geçme mekanizmasını kullanmanız gerekir.

## Bilinen sınırlama

`docker-compose.prod.yml` tek sunuculuk bir kurulum varsayar (rate limiter zaten in-memory/tek
instance — bkz. `docs/production.md` §14). Yatay ölçeklenmiş (birden fazla backend instance'ı)
bir dağıtım isterseniz, paylaşılan bir rate limiter (Redis-backed) ve dosya depolamasını
(`FileStorage`) S3-uyumlu bir object storage'a taşımanız gerekir — bu proje kapsamında
eklenmedi.

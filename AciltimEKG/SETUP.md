# SETUP — Başka Bir Bilgisayarda Çalıştırma

Bu klasör, ACİLTİMEKG projesinin tüm kaynak kodunu içerir: statik site
(Vite/React) + yönetim paneli için küçük bir `/api` backend'i (Vercel
Serverless Functions + Postgres + Vercel Blob). Derlenmiş çıktı (`dist/`),
bağımlılıklar (`node_modules/`) ve git geçmişi (`.git/`) dahil değildir —
bunlar aşağıdaki adımlarla yeniden oluşturulur.

## Gereksinimler

- **Node.js 20 LTS veya üzeri** (Node.js 22 ile test edilmiştir) — https://nodejs.org
  - Windows'ta Node.js kurulduğunda `npm` otomatik olarak birlikte gelir.
- İnternet bağlantısı (yalnızca `npm install` adımı için; paketler
  npm registry'sinden indirilir).
- **Yönetim paneli (`/admin`) için**: bir Postgres veritabanı (yerelde
  kurulu Postgres veya Vercel Postgres/Neon/Supabase gibi bir bulut
  sağlayıcı) ve birkaç ortam değişkeni gerekir — aşağıdaki "Yönetim Paneli
  Kurulumu" bölümüne bakın. Site içeriğinin geri kalanı (EKG kütüphanesi
  dahil) statik verilerle çalışır ve bu adımı gerektirmez.

## Kurulum

Windows'ta PowerShell veya Komut İstemi (cmd) açıp proje klasörüne girin:

```powershell
cd AciltimEKG
npm install
```

`npm install` yerine, birebir aynı paket sürümlerini kurmak isterseniz
(önerilir, çünkü `package-lock.json` dahildir):

```powershell
npm ci
```

## Geliştirme sunucusunu çalıştırma

```powershell
npm run dev
```

Bu komut hem Vite geliştirme sunucusunu hem de `/api` backend'ini (yerel
"dev-api" sunucusu) birlikte başlatır. Terminalde görünen adresi
(varsayılan: `http://localhost:5173`) tarayıcıda açın. Dosyalarda yapılan
değişiklikler anında yansır (hot reload). Yönetim paneli olmadan, yalnızca
siteyi görüntülemek isterseniz `npm run dev:web` yeterlidir.

## Yönetim Paneli (`/admin`) Kurulumu

1. **Bir Postgres veritabanı edinin.** En kolay yol Vercel Postgres'tir
   (proje Vercel'e bağlıysa Dashboard → Storage → Postgres → Connect to
   Project); yerel geliştirme için bilgisayarınıza Postgres kurup boş bir
   veritabanı oluşturmanız da yeterlidir. Tablo şeması ilk istek anında
   otomatik oluşturulur — elle migrasyon çalıştırmanız gerekmez.
2. **Görsel yükleme için Vercel Blob ekleyin (önerilir).** Dashboard →
   Storage → Blob → Connect to Project. Tanımlanmazsa görseller yerel
   `public/uploads/` klasörüne kaydedilir; bu yalnızca yerel geliştirmede
   çalışır, Vercel production'da kalıcı değildir.
3. **`.env.example` dosyasını `.env` olarak kopyalayın** ve değerleri
   doldurun (veritabanı bağlantısı, oturum anahtarı, kendi kullanıcı
   adınız/şifre hash'iniz — dosyanın içindeki yorumlar tam komutları
   içerir). `.env` dosyası git'e eklenmez.
4. Vercel'e deploy ediyorsanız aynı değişkenleri Project Settings →
   Environment Variables altına da ekleyin (Postgres/Blob adımlarını
   Vercel arayüzünden yaptıysanız ilk ikisi otomatik eklenmiş olur).
5. `npm run dev` ile siteyi açın, `/admin` adresine gidin ve belirlediğiniz
   kullanıcı adı/şifre ile giriş yapın.

## Production build alma

```powershell
npm run build
```

Bu komut önce TypeScript tip kontrolü yapar, sonra `dist/` klasörüne
optimize edilmiş statik dosyalar üretir. Build sonucunu yerelde önizlemek
için:

```powershell
npm run preview
```

`dist/` klasörünün içeriği herhangi bir statik dosya sunucusuna
(Netlify, Vercel, Nginx, IIS, vb.) veya normal bir web sunucusuna
yüklenerek yayına alınabilir — bu adım bu teslimatın kapsamı dışındadır.

## Kod kalitesi kontrolü (opsiyonel)

```powershell
npm run lint
```

## Sorun Giderme

- **"npm command not found"**: Node.js kurulumunun PATH'e eklendiğinden
  emin olun; terminali kapatıp yeniden açın.
- **`npm install` hata veriyor**: Node.js sürümünüzün 20 veya üzeri
  olduğunu `node --version` ile kontrol edin.
- **Port 5173 kullanımda**: `npm run dev -- --port 3000` gibi farklı bir
  port belirtebilirsiniz.

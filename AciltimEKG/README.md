# ACİLTİMEKG — Premium Redesign

Hastane öncesi acil tıp ve EKG için hızlı referans platformu. React + TypeScript + Vite + Tailwind CSS v4 ile sıfırdan kurulmuş bir tasarım yenileme projesidir.

## Arka plan

Orijinal ACİLTİMEKG sitesinin kaynak kodu bu proje için elimizde yoktu — yalnızca tarayıcının "Sayfayı Farklı Kaydet" ile ürettiği derlenmiş (minified) JS/CSS paketi vardı. Bu depo, o paketten çıkarılan gerçek bilgi mimarisi (9 kategori, EKG ritim kütüphanesi, ~90 algoritma/protokol başlığı, 3 tam ilaç doz kartı) ve gerçek arayüz metinleri korunarak, tasarımı sıfırdan premium bir tıbbi eğitim platformu seviyesine taşıyacak şekilde inşa edilmiştir.

Kaynakta bulunmayan tıbbi içerik (doz, tanı, klinik protokol) **uydurulmamıştır** — eksik alanlar açıkça "içerik eksik" notuyla işaretlenmiştir (bkz. `src/data/drugs.ts`, `src/pages/AlgorithmDetail.tsx`, `src/pages/EkgDetail.tsx`).

## Geliştirme

```bash
npm install
npm run dev      # site + /api backend birlikte, http://localhost:5173
npm run build    # tip kontrolü + prod build
npm run lint      # oxlint
```

Yönetim paneli (`/admin`) bir Postgres veritabanı ve birkaç ortam
değişkeni gerektirir — bkz. `.env.example` ve `SETUP.md`.

## Yapı

- `src/data/` — EKG ritim kütüphanesi (`rhythms.ts`), Yetişkin Algoritmalar (`algorithms.ts`), Pediatri Algoritmalar (`pediatricAlgorithms.ts`), Doğum ve Yenidoğan (`dogumVeYenidogan.ts`) ve arayüz metinleri — statik, veritabanı gerektirmez
- `src/components/` — tasarım sistemi bileşenleri (Card, Badge, VisualPlaceholder, CommandPalette, Navbar, Footer…)
- `src/pages/` — Ana Sayfa, EKG kütüphanesi, kategori/konu detay sayfaları, favoriler, 404 varyantları, yönetim paneli (`admin/`)
- `src/context/` — favoriler ve admin oturumu (React context)
- `api/` — yönetim paneli backend'i: kimlik doğrulama, konu CRUD/sıralama, görsel yükleme (Vercel Serverless Functions + Postgres + Vercel Blob)
- 7 "Bilgi Alanları" kategorisinden 3'ü (İlaçlar, Toksikoloji, Makaleler) veritabanından beslenir ve admin panelden yönetilir; EKG, Yetişkin Algoritmalar, Pediatri Algoritmalar ve Doğum ve Yenidoğan kasıtlı olarak statik veri olarak kalır (admin panelde salt okunur gösterilir)

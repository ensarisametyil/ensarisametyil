# Frontend (Aşama 6)

`cv-analyzer-web`, backend'deki `/api/cv/upload` ve `/api/cv/{id}/analyze` endpoint'lerine
bağlanan CV yükleme → analiz → sonuç dashboard'u akışını içerir.

## Yapı

```
src/
  api/
    config.ts          → API_BASE_URL (VITE_API_BASE_URL'den okunur)
    ApiError.ts         → tipli hata sınıfı (status/code/message)
    cvService.ts         → uploadCv(), analyzeCv() — tüm fetch çağrıları burada
  types/
    cv.ts               → CvUploadResponse, CvAnalysisResult, ApiErrorResponse
  hooks/
    useCvAnalysis.ts     → upload/analyze state machine (idle/uploading/uploaded/analyzing/analyzed)
  utils/
    errorMessages.ts     → HTTP status → kullanıcıya gösterilecek Türkçe mesaj
    scoreTier.ts          → skor → renk/etiket eşlemesi
  components/
    UploadBox, AnalyzeButton, Spinner, ErrorBanner
    ScoreRing, ListCard, TagCard, TextCard   → boş veriyi otomatik gizleyen genel kartlar
    AnalysisDashboard                        → yukarıdakileri birleştiren sonuç ekranı
  pages/
    HomePage                                 → tüm akışı hook üzerinden bağlar
```

## `VITE_API_BASE_URL`

Backend URL'si kod içine hard-code edilmedi. `.env.example` dosyasını kopyalayıp
`.env.local` olarak kullanabilirsin (gitignored):

```bash
cp .env.example .env.local
# .env.local içinde: VITE_API_BASE_URL=http://localhost:5285
```

Değer verilmezse `src/api/config.ts` içindeki varsayılan (`http://localhost:5285`) kullanılır —
yani `.env.local` oluşturmadan da yerel geliştirme sorunsuz çalışır.

## Çalıştırma

**Backend** (CvAnalyzer.Api klasöründe):
```bash
dotnet run
# http://localhost:5285
```

**Frontend** (cv-analyzer-web klasöründe):
```bash
npm install
npm run dev
# http://localhost:5173
```

Backend'in CORS ayarı (`Cors:AllowedOrigins`) varsayılan olarak `http://localhost:5173`'ü
kabul eder — frontend'i farklı bir portta çalıştırırsan backend tarafında da güncellemen gerekir.

## Akış

1. Kullanıcı `UploadBox`'a bir PDF/DOCX sürükler ya da seçer → `uploadCv()` çağrılır.
2. Başarılı olursa backend'den dönen **gerçek `cvId`** state'te tutulur (hiçbir yerde hard-code
   CV ID kullanılmaz) ve "CV'yi Analiz Et" butonu görünür.
3. Butona basılınca `analyzeCv(cvId)` çağrılır; buton bu sırada disable olur ve
   "CV analiz ediliyor..." spinner'ı gösterilir (sahte bir progress bar yoktur — AI'nin
   gerçek ilerleme yüzdesi bilinmediği için).
4. Başarılı sonuç `AnalysisDashboard`'da gösterilir. AI'nin boş bıraktığı alanlar (örn.
   `weaknesses: []`) için ilgili kart tamamen gizlenir — `undefined`/`null`/boş madde
   işareti hiçbir zaman gösterilmez.
5. Hata durumunda (404/429/503/network/diğer) kullanıcıya backend detaylarını sızdırmayan,
   önceden tanımlı Türkçe mesajlar gösterilir; "Tekrar Analiz Et" ile yeniden deneme her
   zaman mümkündür (yeni bir AI isteği olduğu buton metninden açıkça anlaşılır).

## Testler

```bash
npm test
```

Vitest + React Testing Library kullanılır (projede önceden bir test framework'ü yoktu; Vite
projesine en doğal/asgari seçim olduğu için eklendi). Gerçek backend veya gerçek AI API'sine
hiçbir testte istek atılmaz — `fetch` her testte `vi.stubGlobal` ile taklit edilir.

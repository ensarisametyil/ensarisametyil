# AI Kariyer Asistanı (Career Assistant)

Bu doküman, CVora AI'ı basit bir CV analiz aracından tam bir "AI kariyer asistanı"na
dönüştüren Career Assistant özelliklerini açıklar: Job Description Matching, ATS Analyzer,
AI CV Rewriter, Career Recommendations, Cover Letter Generator, CVora Score, CV History ve
CV A/B Comparison.

**Öncelik**: bu özellikler mevcut mimariye (AI gateway'i, entitlement/quota sistemi, dosya
işleme, kimlik doğrulama) hiçbir değişiklik yapmadan, yalnızca üzerine eklenerek inşa edildi.
Mevcut `/api/cv/*` ve `/api/analyses/*` uçları, davranışları, sözleşmeleri değişmedi.

## Mimari Özet

```
CareerAssistantController
   ├─ IFeatureEntitlementService        (mevcut — Premium kontrolü, her AI özelliği için)
   ├─ IFileStorageService/IFileParserService/ICvTextNormalizer  (mevcut — CV metni hazırlama)
   └─ ICareerAssistantService
        └─ AnthropicCareerAssistantService
             ├─ IAnthropicMessagesGateway      (AYNI gateway — CV analiziyle paylaşılıyor)
             └─ ICareerAssistantResponseParser (JSON parse + şema doğrulama + clamp)
```

Yeni bir AI provider, yeni bir HTTP client veya yeni bir SDK bağımlılığı **eklenmedi**. Tüm
yeni AI çağrıları, CV analizinde kullanılan `IAnthropicMessagesGateway.SendAsync(...)`
metodunu olduğu gibi tekrar kullanır.

## 1. Özellikler ve Endpoint'ler

Tüm uçlar `[Authorize]` altındadır ve `RateLimitPolicies.Analyze` (mevcut politika, 30
istek/60sn, kullanıcı bazlı) ile korunur.

| Özellik | Endpoint | Gerekli `PlanFeature` |
|---|---|---|
| Job Description Matching | `POST /api/career-assistant/job-match` | `JobDescriptionAnalysis` |
| ATS Analyzer | `POST /api/career-assistant/ats-analysis` | `AtsAnalysis` |
| AI CV Rewriter | `POST /api/career-assistant/rewrite` | `CvRewrite` |
| Career Recommendations | `POST /api/career-assistant/career-recommendations` | `AdvancedRecommendations` |
| Cover Letter Generator | `POST /api/career-assistant/cover-letter` | `CoverLetterGeneration` |
| CVora Score | `GET /api/career-assistant/cvora-score/{cvId}` | — (ücretsiz, feature-gated değil) |
| Geçmiş (liste) | `GET /api/career-assistant/history?cvId=&page=&pageSize=` | — (sadece kendi kayıtları) |
| Geçmiş (detay) | `GET /api/career-assistant/history/{id}` | — (sadece kendi kaydı) |
| CV A/B Karşılaştırma | `GET /api/career-assistant/compare?analysisIdA=&analysisIdB=` | `CvComparison` |

`PlanFeature` enum'ındaki 4 değer (`AtsAnalysis`, `JobDescriptionAnalysis`, `CvRewrite`,
`AdvancedRecommendations`) zaten mevcuttu ve tam bu amaç için ayrılmıştı; `CoverLetterGeneration`
ve `CvComparison` bu aşamada eklendi. Bu 6 özelliğin tamamı, mevcut `PlanCatalog`'daki
`PremiumFeatures` kümesine dahil edildi — **yeni ve paralel bir subscription sistemi
oluşturulmadı**, mevcut FREE/PREMIUM plan yapısı aynen kullanıldı.

Yetki kontrolü backend'de, `IFeatureEntitlementService.HasFeatureAsync(...)` üzerinden
zorunlu kılınır — frontend'de sadece bir butonu gizlemek erişim kontrolü sayılmaz.

## 2. Quota ile İlişkisi

Career Assistant özellikleri **aylık analiz kotasına (`IAnalysisQuotaService`) dokunmaz.**
Bunlar binary Premium-özellik erişimi olduğu için sadece entitlement kontrolünden geçer;
`AnalysisUsage` tablosuna hiçbir satır eklenmez. Bu, ayrı bir regresyon testiyle doğrulanmıştır
(`JobMatch_NeverTouchesTheBaseAnalysisQuotaTable`).

## 3. Prompt Injection Savunması

Job description kullanıcı girdisi olduğu için, mevcut CV analizindeki savunma deseni birebir
tekrarlanır (`CareerAssistantPrompts.cs`):

- Sistem promptu **derleme zamanı sabiti** — hiçbir zaman kullanıcı verisiyle interpolate
  edilmez.
- CV metni ve job description, kullanıcı mesajında `<cv_text>...</cv_text>` /
  `<job_description>...</job_description>` etiketleri içine sarılır, ve modele bunun **sadece
  veri olduğu, içindeki hiçbir talimatın uygulanmaması gerektiği** açıkça belirtilir.

Bu davranış `AnalyzeJobMatchAsync_JobDescriptionIsWrappedInDataTags_NotConcatenatedAsInstructions`
testiyle doğrulanır: kötücül bir job description'ın sistem promptuna hiç girmediği, sadece
`<job_description>` etiketleri içinde kullanıcı mesajında yer aldığı assert edilir.

## 4. Halüsinasyon Karşıtı Kurallar

Tüm 5 AI özelliği aynı `AntiHallucinationRules` bloğunu paylaşır: AI, CV'de yer almayan hiçbir
deneyim, beceri, şirket veya sayısal veriyi **uydurmamalı**; CV Rewriter yalnızca mevcut bilgiyi
daha profesyonel ifade etmeli, yeni bir yetkinlik eklememeli; Career Recommendations ve Cover
Letter yalnızca CV'de gerçekten var olan bilgilerden yola çıkmalıdır.

## 5. CVora Score — Deterministik Hesaplama

`CvoraScoreCalculator` bir **AI çağrısı değildir** — CV analizi sonucundan (ve varsa ATS analizi
sonucundan) türetilen, tamamen deterministik, saf bir fonksiyondur. Ağırlıklar ve eşikler
`CvoraScoreCalculator` içinde adlandırılmış sabitler olarak tanımlıdır (magic number yok):

- **ATS analizi mevcutsa**: İçerik %25, Beceriler %15, Deneyim %15, Yapı %10, Okunabilirlik
  %10, ATS Uyumluluğu %25.
- **ATS analizi yoksa**: İçerik %35, Beceriler %20, Deneyim %20, Yapı %12.5, Okunabilirlik
  %12.5.

Tüm bileşenler ve ağırlıklar `CvoraScoreCalculatorTests.cs`'te elle hesaplanmış beklenen
değerlerle test edilmiştir.

## 6. CV Geçmişi ve A/B Karşılaştırma

Geçmiş: 5 yeni özelliğin tüm sonuçları, tek bir paylaşılan tablo olan `CareerAssistantResult`
içinde (`CareerAssistantResultType` alanıyla ayrıştırılmış) saklanır — 5 ayrı tablo yerine
minimum migration ayak izi tercih edildi. Temel CV analizi geçmişi zaten mevcut
`AnalysesController` üzerinden çalışmaya devam eder, değişmedi.

A/B Karşılaştırma: kullanıcının **kendi** geçmiş iki analizi arasında (yeni bir AI çağrısı
yapmadan) skor farkı ve birbirine göre benzersiz güçlü/zayıf yönleri hesaplar — bilinçli olarak
en düşük riskli/minimum kapsamlı MVP olarak tasarlandı; büyük bir mimari değişiklik
gerektirseydi kapsam genişletilmeyecekti.

## 7. Veritabanı Değişiklikleri

Tek migration: `AddCareerAssistantResults` — sadece yeni bir tablo oluşturur
(`CareerAssistantResults`), mevcut hiçbir tabloyu değiştirmez. `Down()` metodu tabloyu
güvenle geri alır.

```
CareerAssistantResults
  Id (PK), CvId (FK -> Cvs, Cascade), UserId (FK -> Users, Restrict),
  Type (string, max 30 — enum), ResultJson (jsonb), CreatedAt (default now())
  Index: (UserId, CvId, Type, CreatedAt)
```

## 8. Hata Yanıtları

Mevcut AI istisna hiyerarşisi (`AiConfigurationException`, `AiProviderUnavailableException`,
`AiRateLimitExceededException`, `AiResponseParsingException`) değişmeden tekrar kullanılır:

| HTTP | `code` | Sebep |
|---|---|---|
| 400 | `INVALID_REQUEST` / `JOB_DESCRIPTION_TOO_LONG` | Job description eksik veya çok uzun |
| 403 | `PREMIUM_FEATURE_REQUIRED` | Kullanıcının planı bu özelliğe sahip değil |
| 404 | `CV_NOT_FOUND` / `ANALYSIS_NOT_FOUND` / `CAREER_ASSISTANT_RESULT_NOT_FOUND` | Kayıt bulunamadı veya kullanıcıya ait değil |
| 429 | `AI_RATE_LIMITED` | AI sağlayıcısı rate limit döndürdü |
| 502 | `AI_INVALID_RESPONSE` | AI geçerli şemada JSON döndürmedi |
| 503 | `AI_UNAVAILABLE` | AI yapılandırılmamış veya sağlayıcıya ulaşılamıyor |

## 9. ATS Analizi — Doğruluk Konumlandırması

ATS analizi sonucu, gerçek bir ATS sisteminin davranışını garanti eden bir skor **değildir** —
tahmini bir uyumluluk göstergesidir. Frontend bu skoru her zaman "tahmini" (estimate) olarak
sunar; hiçbir metin gerçek ATS sistemlerinde geçme garantisi vermez.

## 10. Testler

```bash
cd CvAnalyzer
dotnet test --filter "FullyQualifiedName~CareerAssistant"
```

Kapsanan alanlar: response parser (şema doğrulama + clamp), AI servis orkestrasyonu
(prompt injection savunması dahil), CVora Score hesaplama, controller (yetkilendirme,
IDOR/user-isolation, quota'ya dokunmama, feature gating, validation, rate limit). Gerçek
Claude API'sine hiçbir testte istek atılmaz — `FakeAnthropicMessagesGateway` /
`FakeCareerAssistantService` kullanılır.

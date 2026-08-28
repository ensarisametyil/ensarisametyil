# AI CV Analizi (Aşama 5)

Bu doküman, CV metnini yapay zekâ ile analiz eden `/api/cv/{id}/analyze` endpoint'inin
kurulumunu ve kullanımını açıklar.

## Mimari Özet

```
CvController
   └─ IAiCvAnalysisService            (controller sadece bunu bilir)
        └─ AnthropicCvAnalysisService  (orkestrasyon: prompt oluştur, gateway'e gönder, parse et)
             ├─ IAnthropicMessagesGateway → AnthropicMessagesGateway   (tek SDK'ya dokunan sınıf)
             └─ ICvAnalysisResponseParser → CvAnalysisResponseParser   (JSON parse + şema doğrulama)
```

Controller hiçbir zaman Anthropic/OpenAI/Gemini SDK'sını doğrudan bilmez — sadece
`IAiCvAnalysisService` arayüzünü kullanır. Provider değiştirmek istersen (örn. OpenAI),
`IAiCvAnalysisService`'in yeni bir implementasyonunu yazıp `Program.cs`'teki DI kaydını
değiştirmen yeterli.

## 1. AI Configuration Nasıl Yapılır?

`appsettings.json` içinde sadece **placeholder** değerler var (gerçek API key içermez):

```json
"AI": {
  "Provider": "Anthropic",
  "Model": "claude-opus-5",
  "ApiKey": "",
  "MaxTokens": 4000,
  "MaxInputCharacters": 20000
}
```

| Alan | Açıklama |
|---|---|
| `Provider` | Şu an sadece bilgi amaçlı (tek provider var). |
| `Model` | Kullanılacak Claude model ID'si. Maliyeti düşürmek istersen daha ucuz bir modele (örn. `claude-haiku-4-5`) çevirebilirsin — CV analizi bir sınıflandırma/özetleme görevi olduğu için küçük modeller de iyi sonuç verebilir. |
| `ApiKey` | **appsettings.json'da boş bırakılmalı.** Aşağıya bakın. |
| `MaxTokens` | AI yanıtının maksimum token sayısı — doğrudan maliyet kontrolü. |
| `MaxInputCharacters` | CV metninin AI'ya gönderilmeden önce kırpılacağı karakter sınırı (maliyet kontrolü, bkz. `CvTextNormalizer`). |

`Temperature` alanı bilinçli olarak appsettings placeholder'ına eklenmedi: güncel nesil Claude
modelleri (Opus 5, Sonnet 5, Fable 5) `temperature` parametresini kabul etmiyor (400 hatası
döner). Eğer `Model`'i eski bir modele çevirirsen, `AiOptions.Temperature` (nullable `double`)
alanını configuration'dan set edebilirsin.

## 2. API Key Nasıl Tanımlanır?

**appsettings.json içine gerçek key yazma, git'e commit etme.**

### Development (yerel makine)

```bash
cd CvAnalyzer.Api
dotnet user-secrets set "AI:ApiKey" "<KENDI_API_KEYİNİZ>"
```

Bu, key'i proje dışında (`~/.microsoft/usersecrets/...`) saklar, git repo'suna hiç girmez.

### Production / diğer ortamlar

Environment variable olarak:

```bash
export AI__ApiKey="<KENDI_API_KEYİNİZ>"
```

(ASP.NET Core configuration sisteminde `:` yerine `__` kullanılır — ör. `AI__ApiKey`,
`AI__Model`.)

### API key tanımlı değilse ne olur?

Uygulama **çökmez**. `/health` ve `/api/cv/upload` normal çalışmaya devam eder — sadece
`/api/cv/{id}/analyze` çağrıldığında `503 Service Unavailable` + `{"code":"AI_UNAVAILABLE", ...}`
döner. Bu, canlı olarak test edildi.

## 3. Endpoint

```
POST /api/cv/{id}/analyze
```

Akış: CV kaydı DB'de bulunur → dosya storage'dan okunur → `IFileParserService` ile metin
çıkarılır → `CvTextNormalizer` ile normalize edilir/kırpılır → `IAiCvAnalysisService` ile
analiz edilir → sonuç JSON olarak döner.

### Örnek İstek

```bash
curl -X POST http://localhost:5285/api/cv/b34f65c8-9060-4f9c-8794-c7aa8e214c53/analyze
```

### Örnek Başarılı Yanıt (200 OK)

```json
{
  "overallScore": 82,
  "summary": "Strong technical CV with clear backend experience.",
  "strengths": ["Clear structure", "Relevant hands-on experience"],
  "weaknesses": ["No quantifiable achievements"],
  "skills": ["C#", "ASP.NET Core", "PostgreSQL"],
  "experience": "3+ years as a backend developer.",
  "education": "BSc Computer Science.",
  "missingKeywords": ["Docker", "CI/CD"],
  "recommendations": ["Add measurable impact to experience bullet points."]
}
```

### Hata Yanıtları

| HTTP | `code` | Sebep |
|---|---|---|
| 400 | `UNSUPPORTED_FILE_TYPE` / `TEXT_EXTRACTION_FAILED` / `EMPTY_CV_TEXT` | Dosyadan kullanılabilir metin çıkarılamadı |
| 404 | `CV_NOT_FOUND` / `CV_FILE_NOT_FOUND` | CV kaydı veya dosyası bulunamadı |
| 429 | `AI_RATE_LIMITED` | AI sağlayıcısı rate limit döndürdü |
| 502 | `AI_INVALID_RESPONSE` | AI geçerli/beklenen şemada bir JSON döndürmedi |
| 503 | `AI_UNAVAILABLE` | AI yapılandırılmamış (key yok) veya sağlayıcıya ulaşılamıyor/timeout |

Her hata yanıtı `{"code": "...", "message": "..."}` şeklindedir; hiçbir zaman stack trace veya
provider'a özel ham hata detayı içermez.

## 4. Testler Nasıl Çalıştırılır?

```bash
cd CvAnalyzer
dotnet clean
dotnet build
dotnet test
```

**Gerçek Claude API'sine hiçbir testte istek atılmaz.** `Services/AI/` altındaki testler ve
`Controllers/CvControllerTests.cs`, `FakeAiCvAnalysisService` / `FakeAnthropicMessagesGateway`
adlı sahte (fake) implementasyonları kullanır — bu yüzden testler ücretsiz, hızlı ve internet
bağlantısı gerektirmeden çalışır.

## 5. Gerekli Environment Variable'lar (Özet)

| Değişken | Zorunlu mu? | Açıklama |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | Evet | PostgreSQL bağlantı dizesi (Aşama 2'den) |
| `AI__ApiKey` | Sadece `/analyze` için | Anthropic API key. Yoksa upload/health çalışmaya devam eder, sadece analyze 503 döner. |
| `AI__Model` | Hayır | Varsayılan `claude-opus-5`. Maliyet için değiştirilebilir. |
| `AI__MaxTokens` | Hayır | Varsayılan 4000. |
| `AI__MaxInputCharacters` | Hayır | Varsayılan 20000. |

## Bilinmeyen Bilgi Politikası (Prompt Tasarımı)

AI'ya gönderilen sistem promptu (`Services/AI/CvAnalysisPrompts.cs`), CV'de yer almayan hiçbir
bilgiyi (şirket, tarih, sertifika, teknoloji vb.) **uydurmamasını**, eksik alanları boş
string/liste olarak bırakmasını, ve CV metninin içine gömülü olabilecek "talimat gibi görünen"
cümleleri (prompt injection) asla bir komut olarak değil, sadece analiz edilecek veri olarak
ele almasını açıkça talep eder.

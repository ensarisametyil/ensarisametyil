# İyzico Ödeme Entegrasyonu (Aşama 9)

Bu doküman, Aşama 8'de kurulan Free/Premium/Subscription/Quota mimarisine gerçek İyzico ödeme
altyapısının nasıl bağlandığını açıklar. **Bu aşamada production'a çıkılmadı, gerçek para ile
işlem yapılmadı.** Sandbox/test entegrasyonu tamamlandı, gerçek sandbox credential'ları bu
ortamda mevcut olmadığı için gerçek bir sandbox smoke test'i **çalıştırılamadı** — kapsamlı fake
provider testleriyle doğrulandı (bkz. §13).

## 0. Araştırma Notu — docs.iyzico.com Erişim Kısıtı

Bu sandbox'ın network egress proxy'si `docs.iyzico.com`'a doğrudan erişimi engelliyor
(`WebFetch` denemesi `EGRESS_BLOCKED` hatası döndü). Bu yüzden entegrasyon kararları:

1. Arama motoru üzerinden indekslenmiş `docs.iyzico.com` içeriğinden (endpoint'ler, alan adları,
   imza formülü),
2. **Resmi `Iyzipay` NuGet paketinin (v2.1.80) gerçek derlenmiş halinin reflection ile
   incelenmesinden** (bkz. §2 — bu, ikinci elden blog/örnek koddan çok daha güvenilir bir
   kaynaktır, çünkü doğrudan İyzico'nun kendi yayınladığı SDK'nın gerçek tip/metot imzalarıdır)

birleştirilerek alındı. Belirsiz kalan tek nokta — webhook imza formülünün tam alan sırası — §7'de
açıkça belirtildi ve buna karşı ek bir güvenlik katmanı (her zaman server-to-server doğrulama)
eklendi.

## 1. Mimari

```
BillingController
       ↓
IPaymentService (PaymentService)          — orkestrasyon: idempotency, Subscription güncelleme
       ↓
IPaymentProvider (IyzicoPaymentProvider)   — İyzico SDK'sına dokunan TEK sınıf
       ↓
Iyzipay SDK (resmi NuGet paketi, v2.1.80)
       ↓
İyzico Subscription API (sandbox-api.iyzipay.com)
```

`BillingController` hiçbir zaman `Iyzipay` SDK'sını doğrudan bilmez. İleride İyzico dışında bir
sağlayıcı eklenmek istenirse (ya da testlerde olduğu gibi tamamen sahte bir sağlayıcı), sadece
`IPaymentProvider`'ın yeni bir implementasyonu yazılıp DI kaydı değiştirilir.

**Aşama 8'in mevcut mimarisi (Subscription, PlanType, SubscriptionStatus, PlanCatalog,
SubscriptionService, AnalysisQuotaService, FeatureEntitlementService) hiç değiştirilmedi.**
`PaymentService`, doğrulanmış bir ödeme sonrası sadece mevcut `Subscription` tablosuna satır
ekler/günceller — `SubscriptionService.GetEffectivePlanAsync()` bu satırı Aşama 8'deki AYNI
mantıkla okur. Yeni bir `IsPremium` flag'i **oluşturulmadı**.

## 2. Kullanılan Resmi SDK

NuGet paketi: **`Iyzipay` v2.1.80** (`https://www.nuget.org/packages/Iyzipay`, İyzico'nun resmi
`.NET` client'ı — `github.com/iyzico/iyzipay-dotnet`).

Kullanılan gerçek SDK tipleri (reflection ile doğrulandı):

| SDK Tipi/Metodu | Kullanım |
|---|---|
| `Iyzipay.Model.V2.Subscription.Subscription.InitializeCheckoutForm(...)` | Checkout başlatma |
| `Iyzipay.Model.V2.Subscription.Subscription.GetCheckoutFormResult(...)` | CF-Retrieve (ödeme sonucunu alma) |
| `Iyzipay.Model.V2.Subscription.Subscription.Retrieve(...)` | **Otoriter** server-to-server durum sorgusu |
| `Iyzipay.Model.V2.Subscription.Subscription.Cancel(...)` | Abonelik iptali |
| `Iyzipay.Request.V2.Subscription.SubscriptionStatus` (enum) | `ACTIVE, PENDING, UNPAID, UPGRADED, CANCELED, EXPIRED` |

SDK'nın tüm `Subscription.*` çağrıları senkron (bloklayan HTTP) — async overload yok. Bu yüzden
`IyzicoPaymentProvider` her çağrıyı `Task.Run(...)` içine sarar (ASP.NET Core request thread'ini
bloke etmemek için standart adaptasyon tekniği).

## 3. Configuration

Options pattern ile, mevcut `AiOptions`/`JwtOptions` deseniyle birebir aynı:

```json
"Iyzico": {
  "ApiKey": "",
  "SecretKey": "",
  "BaseUrl": "https://sandbox-api.iyzipay.com",
  "PremiumPricingPlanReferenceCode": "",
  "CallbackUrl": "http://localhost:5285/api/billing/checkout/callback",
  "FrontendResultUrl": "http://localhost:5173/premium/result"
}
```

`appsettings.json`'daki `ApiKey`/`SecretKey` **her zaman boş** — gerçek değerler asla kaynak
koda, appsettings.json'a veya git'e yazılmaz.

### Development

```bash
cd CvAnalyzer.Api
dotnet user-secrets set "Iyzico:ApiKey" "<SANDBOX_API_KEY>"
dotnet user-secrets set "Iyzico:SecretKey" "<SANDBOX_SECRET_KEY>"
dotnet user-secrets set "Iyzico:PremiumPricingPlanReferenceCode" "<İYZİCO_PANELİNDEN>"
```

### Production (henüz yok — bkz. §14)

```bash
export Iyzico__ApiKey="<PRODUCTION_API_KEY>"
export Iyzico__SecretKey="<PRODUCTION_SECRET_KEY>"
export Iyzico__BaseUrl="https://api.iyzipay.com"
export Iyzico__PremiumPricingPlanReferenceCode="<İYZİCO_PANELİNDEN>"
export Iyzico__CallbackUrl="https://<gerçek-domain>/api/billing/checkout/callback"
export Iyzico__FrontendResultUrl="https://<gerçek-domain>/premium/result"
```

### `PremiumPricingPlanReferenceCode` Nedir?

İyzico'nun Subscription ürünü, bir "Product" (ör. "CVora AI Premium") ve ona bağlı bir
"Payment Plan" (ör. "Aylık ₺X") gerektirir — bunlar İyzico merchant panelinde (veya panel API'si
ile) **önceden** oluşturulur ve bir `pricingPlanReferenceCode` üretir. Bu değer sır değildir ama
ortam-özeldir (sandbox ve production panelinde farklı plan kodları olacaktır) — bu yüzden
configuration'da tutulur, kodda hard-code edilmez.

**Fiyat senkronizasyonu (Aşama 15 — önemli, elle yapılması gereken bir adım):** Bu uygulama
artık kendi `Plans:PremiumMonthlyPriceUsd` (varsayılan `10.00`) değerine sahip — bkz.
`docs/monetization.md` §1. Bu, **görüntülenen/kaydedilen** fiyattır (Landing Page, checkout
özeti, ödeme geçmişi); İyzico'ya giden `InitializeCheckoutFormRequest`'e hiçbir zaman bir tutar
gönderilmez, yalnızca `PremiumPricingPlanReferenceCode` referans edilir — gerçek tahsilat tutarı
%100 İyzico panelinde o plana bağlı olarak tanımlıdır. **Bu iki değer birbirinden bağımsızdır ve
otomatik senkronize değildir** — İyzico merchant panelinde oluşturulacak gerçek "Premium" pricing
plan'ının tutarının da `Plans:PremiumMonthlyPriceUsd` ile aynı ($10.00) olması, entegrasyonu
production'a alacak kişinin elle doğrulaması gereken bir adımdır. Aksi halde kullanıcıya
gösterilen fiyat ile İyzico'nun gerçekten tahsil ettiği tutar birbirini tutmaz.

## 4. Ödeme Modeli

Free (2 analiz/ay) ve Premium (sınırsız) sabit kalıyor — Aşama 8'in kendisi. Premium, İyzico'nun
**Subscription (abonelik) ürünü** ile aylık tekrarlayan ödeme olarak modellendi — kendi
tasarladığımız bir "recurring payment" mantığı **yazılmadı**; İyzico'nun kendi checkout form +
abonelik/fatura döngüsü mekanizması kullanılıyor (§1'deki SDK metotları).

## 5. Payment Flow

```
Kullanıcı "Premium'a Geç"
  ↓ (frontend: /premium/checkout — fatura bilgileri formu)
POST /api/billing/checkout                              [Authorize]
  ↓ PaymentService.StartPremiumCheckoutAsync
      - zaten Premium ise → 503 CHECKOUT_UNAVAILABLE (İyzico'ya hiç gidilmez)
      - PaymentTransaction satırı oluşturulur (Status=Initiated)
      - IyzicoPaymentProvider.InitializeSubscriptionCheckoutAsync → checkoutFormContent + token
  ↓
Frontend, checkoutFormContent'i render eder (İyzico'nun kendi ödeme iframe'ini enjekte eder)
  ↓
Kullanıcı kart bilgilerini İYZİCO'NUN KENDİ ARAYÜZÜNDE girer
  (bu uygulama asla kart numarası/CVV görmez veya saklamaz)
  ↓
İyzico, kullanıcının tarayıcısını Iyzico:CallbackUrl'e (bu API'nin kendisine) yönlendirir (token ile)
  ↓
POST /api/billing/checkout/callback                     [AllowAnonymous — bkz. §6]
  ↓ PaymentService.ProcessCheckoutCallbackAsync
      - token → PaymentTransaction satırı bulunur (kullanıcı BURADAN çözülür, asla istekten değil)
      - GetCheckoutFormResult (CF-Retrieve) çağrılır → subscriptionReferenceCode elde edilir
      - RetrieveSubscriptionStatusAsync (OTORİTER server-to-server doğrulama) çağrılır
      - sadece durum gerçekten ACTIVE ise → Subscription satırı Premium/Active yapılır
  ↓
302 Redirect → Iyzico:FrontendResultUrl?status=success|failed
  ↓
Frontend /premium/result → GET /api/billing/usage ile gerçek planı yeniden çeker
```

## 6. Verification Mekanizması

**Hiçbir adımda callback/webhook payload'undaki bir alan doğrudan güvenilerek Premium
verilmiyor.** Her zaman şu sıra izlenir:

1. `GetCheckoutFormResult` (token → subscriptionReferenceCode) — bu adım bile "iddia"dır, kanıt değil.
2. **`RetrieveSubscriptionStatusAsync`** — İyzico'nun `/v2/subscription/subscriptions/{ref}`
   endpoint'ine bizim API key/secret'imizle imzalanmış, ayrı bir server-to-server çağrı. Sadece bu
   çağrının döndürdüğü durum `ACTIVE` ise Subscription güncellenir.

Bu iki adımlı doğrulama, callback token'ının veya webhook payload'unun tek başına yeterli
görülmemesini sağlar — spec'in "Payment'ın gerçekten başarılı olduğunu doğrula" ve "gerekliyse
server-to-server doğrula" maddelerinin ikisi de, her zaman, atlanmadan uygulanır.

## 7. Webhook/Callback Mekanizması

İki ayrı unauthenticated (JWT gerektirmeyen) endpoint var — ikisi de farklı amaçlar için:

### `POST /api/billing/checkout/callback`

Kullanıcının **tarayıcısı** buraya yönlendirilir (İyzico'nun checkout form akışının bir parçası,
"CF-Retrieve" öncesi adım). JWT taşımaz (yeni sekme/yönlendirme senaryosunda taşımayabilir de) —
güven, `token`'ın önceden oluşturulmuş bir `PaymentTransaction` satırına eşlenmesinden ve ardından
§6'daki iki-adımlı doğrulamadan gelir.

### `POST /api/billing/webhook/iyzico`

İyzico'nun **sunucudan sunucuya** async bildirimi (abonelik yenileme, iptal, süre dolumu gibi
tarayıcı akışının dışında gerçekleşen olaylar için). İyzico panelinde "Merchant Subscription
Notifications" altında bu URL kayıtlı olmalı.

**İmza Doğrulaması — dürüstçe belirtilmiş bir belirsizlik:** İyzico, webhook isteklerini
`X-IYZ-SIGNATURE-V3` header'ı ile imzalar (HMAC-SHA256, hex). Arama motoru üzerinden erişilen
dokümantasyon parçaları, genel ödeme webhook'ları ile abonelik webhook'ları için **birbirinden
biraz farklı alan kombinasyonları** gösteriyor. `docs.iyzico.com`'a bu sandbox'tan doğrudan
erişilemediği için (bkz. §0) tam alan sırası bağımsız olarak %100 doğrulanamadı.

Bu yüzden `IyzicoWebhookSignatureVerifier`, abonelik-özel formülü uyguluyor:

```
HMACSHA256_hex(secretKey, eventType + subscriptionReferenceCode + orderReferenceCode + customerReferenceCode)
```

ve bu **`X-IYZ-SIGNATURE-V3`** ile sabit-zamanlı (`CryptographicOperations.FixedTimeEquals`)
karşılaştırılıyor. **Ancak bu imza kontrolü tek başına yeterli görülmüyor** — geçerli bir imzadan
sonra bile `PaymentService.ProcessWebhookAsync`, Subscription'ı güncellemeden önce HER ZAMAN §6'daki
otoriter `RetrieveSubscriptionStatusAsync` çağrısını yapar. Yani imza formülünde ince bir hata
olsa bile (yanlış pozitif reddetme riski dışında), bu asla yanlışlıkla yetkisiz bir Premium
aktivasyonuna yol açamaz — gerçek yetki her zaman İyzico'nun kendi API'sinden taze çekilen duruma
dayanır. Production'a geçmeden önce gerçek bir sandbox webhook'u ile bu formülün doğrulanması
önerilir (bkz. §14).

**Webhook endpoint'i:**
- JWT gerektirmez (`[AllowAnonymous]`) — İyzico bir JWT taşıyamaz.
- İmza eksik/geçersizse **`401 Unauthorized`** döner (asla sessizce `200` — imza tahmin eden bir
  saldırganın başarıyı başarısızlıktan ayırt edememesi için).
- Kullanıcı ID'si **hiçbir zaman payload'dan alınmaz** — sadece `subscriptionReferenceCode` ile
  önceden var olan bir `Subscription` satırı bulunur; o satırın `UserId`'si kullanılır. Bilinmeyen
  bir `subscriptionReferenceCode` için webhook güvenle yok sayılır (`200`, ama hiçbir değişiklik
  yapılmaz) — yeni bir kullanıcı/abonelik eşlemesi asla webhook'tan **oluşturulmaz** (o sadece
  checkout callback'inin işi, çünkü sadece o adımda gerçek bir `userId` mevcuttur).
- Hassas payload (imza header'ı, secret key) **hiçbir zaman loglanmaz** — sadece `eventType` ve
  `subscriptionReferenceCode` gibi güvenli tanı bilgileri (bkz. §11).

## 8. Idempotency Yaklaşımı

İki katmanlı:

1. **`PaymentTransaction`** entity'si, her checkout denemesi için bir satır — `ConversationId`,
   `CheckoutToken`, `ProviderSubscriptionReferenceCode` alanlarının hepsi DB seviyesinde **unique
   index**'li (null'lar çakışmaz). Aynı token'la callback iki-üç kez gelirse, `Status` zaten
   `Succeeded`/`Failed` ise hiçbir şey tekrar işlenmez (`ProcessCheckoutCallbackAsync`'in en
   başındaki kontrol).
2. **`Subscription.ProviderSubscriptionId`** de unique index'li — aynı İyzico aboneliği için asla
   iki `Subscription` satırı oluşmaz. Webhook tarafında, `Subscription.Status` zaten talep edilen
   duruma eşitse hiçbir güncelleme yapılmaz (no-op) — bu, aynı webhook event'inin 2-3 kez
   gelmesini güvenle absorbe eder.

Her iki güncelleme yolu da (`ProcessCheckoutCallbackAsync`, `ProcessWebhookAsync`), Aşama 8'de
kota sistemi için zaten var olan **`IUserOperationLock`**'u (kullanıcı bazlı process-içi kilit)
yeniden kullanır — aynı kullanıcı için eşzamanlı iki callback/webhook asla birbirini yarışarak
geçemez. Yeni bir kilitleme mekanizması icat edilmedi.

## 9. Subscription Lifecycle

İyzico'nun `SubscriptionStatus` enum'u (SDK'dan reflection ile doğrulandı) bu uygulamanın mevcut
`SubscriptionStatus` enum'una şöyle eşlenir (`PaymentService.MapProviderStatus`):

| İyzico | Bu Uygulama | Not |
|---|---|---|
| `ACTIVE` | `Active` | |
| `UPGRADED` | `Active` | Abonelik hâlâ aktif, sadece plan değişti |
| `PENDING` | `Pending` | Henüz onaylanmamış |
| `UNPAID` | `PastDue` | Ödeme tahsil edilemedi ama iptal değil |
| `CANCELED` | `Cancelled` | |
| `EXPIRED` | `Expired` | |
| (tanınmayan) | *(hiçbiri — işlem yapılmaz)* | Kafadan bir eşleme uydurulmadı |

Bu eşleme **yeni bir enum değeri eklemedi** — Aşama 8'de zaten tanımlı olan
`Active/PastDue/Cancelled/Expired/Pending` kullanıldı.

## 10. Free → Premium

```
Doğrulanmış başarılı ödeme (§6)
  → Subscription satırı: Plan=Premium, Status=Active, Provider="Iyzico",
    ProviderCustomerId=<İyzico customerReferenceCode>, ProviderSubscriptionId=<İyzico subscriptionReferenceCode>
  → SubscriptionService.GetEffectivePlanAsync() → Premium   (AŞAMA 8'İN AYNI KODU, değişmedi)
  → AnalysisQuotaService → PlanCatalog.GetPlan(Premium).MonthlyAnalysisLimit → sınırsız
```

## 11. Premium → Free (İptal/Süre Dolumu)

**Sağlayıcı-tetiklemeli (webhook üzerinden, Aşama 9):** `CANCELED`/`EXPIRED` durumu geldiğinde
(§9), `Subscription.Status` güncellenir ve `EndDate` (henüz set değilse) şimdiki zamana
ayarlanır.

**Kullanıcı-tetiklemeli (Aşama 10 — `POST /api/billing/subscription/cancel`):** Aşama 9'da
`IPaymentProvider.CancelSubscriptionAsync` metodu tanımlanmıştı ama hiçbir orkestrasyon
kodu onu çağırmıyordu (yalnızca gelecekteki kullanım için hazır bırakılmıştı). Aşama 10 bunu
gerçekten bağladı: `PaymentService.CancelPremiumSubscriptionAsync(userId)`,

1. çağıranın **kendi** aktif Premium `Subscription` satırını bulur (userId her zaman JWT'den —
   hiçbir zaman bir parametreden),
2. `_provider.CancelSubscriptionAsync(providerSubscriptionId)` çağırır,
3. **iptal çağrısının kendi dönüş değerine körü körüne güvenmez** — checkout callback ve
   webhook'ta zaten kurulu olan "asla tek bir sonucu doğrulanmamış kabul etme" ilkesiyle
   tutarlı olarak, ardından `RetrieveSubscriptionStatusAsync` ile durumu **tekrar**
   sunucu-sunucu doğrular ve yerel `Subscription` satırını ancak o zaman günceller.

Her iki yol da (webhook ve kullanıcı-tetiklemeli iptal) aynı hedefe yazar
(`Subscription.Status`), bu yüzden bir sonraki `GetEffectivePlanAsync()` çağrısı her iki
durumda da otomatik olarak `Free` döner — Aşama 8'in "Status != Active ise Free" mantığı hiç
değişmeden çalışır. `IUserOperationLock` ile aynı kullanıcı için eşzamanlı bir webhook ve
kullanıcı-tetiklemeli iptal isteğinin birbirini ezmesi engellenir.

Bu uçtan `GET /api/billing/subscription` (plan/durum/sağlayıcı/tarih detayı, `canCancel`
bayrağıyla birlikte) ve `GET /api/billing/payments` (kullanıcının kendi `PaymentTransaction`
geçmişinin özeti — asla bir tutar, asla ham bir provider payload'ı) da eklendi; ayrıntılar
için `docs/monetization.md` §9.

## 12. Frontend Değişiklikleri

- `types/billing.ts`: `CheckoutBuyerInfo`, `CheckoutResponse` eklendi.
- `api/billingService.ts`: `startCheckout(buyer)` eklendi.
- `components/PlanBadge.tsx`: "Premium'a Geç" artık gerçek `/premium/checkout` sayfasına bağlı
  bir link — "yakında" placeholder'ı kaldırıldı.
- `pages/PremiumCheckoutPage.tsx`: fatura bilgileri formu → `POST /api/billing/checkout` →
  dönen `checkoutFormContent`'i render eder.
- `components/CheckoutFormRenderer.tsx`: İyzico'nun döndürdüğü HTML/script snippet'ini güvenle
  DOM'a enjekte eder (React'te `innerHTML` script'leri çalıştırmadığı için script'ler manuel
  yeniden oluşturulur — standart bir teknik).
- `pages/PremiumResultPage.tsx`: `/premium/result?status=...` — backend'in yönlendirdiği sonuç
  sayfası; **plan bilgisini asla URL'den okumaz**, sadece `GET /api/billing/usage`'ı yeniden
  çeker (`useBilling().refresh()`).
- **Frontend hiçbir noktada Premium kararı vermiyor** — sadece backend'in ürettiği form içeriğini
  gösteriyor ve backend'in doğruladığı sonucu (usage endpoint'i üzerinden) yansıtıyor.
- **(Aşama 10)** `pages/AccountPage.tsx` — abonelik detayı, ödeme geçmişi ve "Aboneliği İptal
  Et" (onay adımlı) akışını tek bir sayfada toplar; `api/billingService.ts`'e
  `getSubscription()`, `cancelSubscription()`, `getPaymentHistory()` eklendi. Ayrıntılar için
  `docs/frontend-authentication.md`.

## 13. Database / Migration Değişiklikleri

Yeni migration: `AddPaymentTransactions` — tamamen ek nitelikli:
- Yeni tablo: `PaymentTransactions` (bkz. §8).
- Yeni index: `Subscriptions.ProviderSubscriptionId` üzerinde unique index (Aşama 8'de bu sütun
  zaten vardı, boştu — sadece index eklendi).

**Mevcut kullanıcı/CV/analiz verisi silinmedi veya değiştirilmedi.** Migration, dev DB boşken
uygulandı (`Users`/`Cvs`/`Analyses`/`Subscriptions` tabloları 0 satır) — veri kaybı riski yoktu.

`Payment`/işlem geçmişi tablosu Aşama 8'de ertelenmişti; bu aşamada **`PaymentTransaction`**
adıyla, ama sadece idempotency amaçlı minimal alanlarla (gerçek tutar/para birimi/detaylı
işlem geçmişi YOK) eklendi — spec'in "gerçekten ihtiyaç varsa oluştur" yönlendirmesine uygun
olarak, sadece duplicate-event güvenliği için gerekli olan kadarı.

## 14. Güvenlik Önlemleri (Özet)

- Frontend'den gelen `plan`/`isPremium`/`paymentSuccess`/`subscriptionStatus` gibi hiçbir alan
  hiçbir endpoint'te kabul edilmiyor — `CheckoutRequestDto` sadece fatura bilgisi alanları içerir
  (reflection testiyle garanti altında, bkz. testler).
- Premium yalnızca `RetrieveSubscriptionStatusAsync`'in (bizim imzaladığımız, İyzico'nun kendi
  API'sine giden) döndürdüğü otoriter sonuca göre verilir.
- Webhook: imza zorunlu + geçersizse `401` + kullanıcı payload'dan değil DB'den çözülür +
  duplicate/replay güvenli no-op.
- Callback: token, sunucu tarafında önceden oluşturulmuş bir `PaymentTransaction`'a eşlenmeden
  hiçbir işlem yapılmaz — tahmin edilebilir/rastgele bir token'la başka bir kullanıcının
  aboneliği asla etkilenemez (IDOR yapısal olarak imkânsız, çünkü hedef kullanıcı token'ın
  KENDİSİNDE gömülü, istekte değil).
- Gerçek API key/secret hiçbir zaman kaynak kodda, appsettings.json'da, testlerde veya loglarda
  yer almaz — sadece `dotnet user-secrets` (dev) / environment variable (prod).

## 15. Testler

Gerçek İyzico API'sine **hiçbir testte** istek atılmadı — `IPaymentProvider` her testte
`FakePaymentProvider` ile değiştirildi (unit testlerde doğrudan, integration testlerde
`CustomWebApplicationFactory` üzerinden DI ile). Toplam yeni test sayısı ve kapsamı için bkz.
ana rapor / `docs/monetization.md`.

## 16. Sandbox Kurulumu (Gerçek Credential Edinildiğinde)

1. `https://sandbox-merchant.iyzipay.com` üzerinden bir sandbox hesabı oluştur.
2. Panelde bir Product + Payment Plan oluştur → `pricingPlanReferenceCode`'u al.
3. `dotnet user-secrets set Iyzico:ApiKey/SecretKey/PremiumPricingPlanReferenceCode ...`
4. Panelde "Merchant Subscription Notifications" altına
   `http://<dev-tunnel>/api/billing/webhook/iyzico` gibi bir URL kaydet (localhost'a doğrudan
   webhook gönderilemez — ngrok/benzeri bir tünel gerekir).
5. Sandbox test kartlarıyla (İyzico'nun sandbox dokümantasyonunda yayınlanan) uçtan uca akışı
   dene.

## 17. Production Kurulumu

**Bu aşamada yapılmadı — domain/hosting henüz yok.** Yapılacaklar listesi:

- Gerçek domain + HTTPS.
- `Iyzico__BaseUrl=https://api.iyzipay.com` + gerçek production API key/secret (environment
  variable, secret manager).
- `Iyzico__CallbackUrl` ve `Iyzico__FrontendResultUrl`'i gerçek domain'e güncelle.
- Webhook imza formülünü (§7) gerçek bir production/sandbox webhook isteğiyle doğrula.
- İyzico'nun production onay sürecini tamamla (KYC, sözleşme vb. — bu uygulamanın kapsamı dışı).

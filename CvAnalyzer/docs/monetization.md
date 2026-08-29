# Free / Premium Plan, Kullanım Kotası ve Ödeme (Aşama 8 + Aşama 9 + Aşama 10)

Bu doküman, Free/Premium plan altyapısını, kullanım (usage/quota) sistemini, subscription
modelini ve feature gating mimarisini açıklar (Aşama 8). Gerçek İyzico ödeme entegrasyonunun
(checkout, webhook/callback doğrulama, idempotency, subscription yaşam döngüsü) ayrıntıları artık
**Aşama 9'da implement edilmiştir** ve ayrı bir dokümanda anlatılır:
**[`docs/iyzico-integration.md`](./iyzico-integration.md)**. Bu dosya (`monetization.md`) plan/kota
mimarisinin genel referansı olmaya devam eder; ödemeyle ilgili tüm detaylar için diğer dosyaya
bakın.

## 1. Plan Sistemi

İki plan vardır: `PlanType.Free` ve `PlanType.Premium` (`Models/Entities/PlanType.cs`). Bir
planın gerçekte ne verdiği (aylık analiz limiti, hangi Premium özelliklere erişim) **tek bir
yerde**, `Services/Billing/PlanCatalog.cs`'de tanımlanır — controller'larda veya başka
servislerde plan limiti/özelliği hard-code edilmez.

```
Free:
  MonthlyAnalysisLimit = appsettings.json → Plans:FreeMonthlyAnalysisLimit (varsayılan: 2)
  Features = (yok)

Premium:
  MonthlyAnalysisLimit = appsettings.json → Plans:PremiumMonthlyAnalysisLimit (varsayılan: null = sınırsız)
  Features = AtsAnalysis, JobDescriptionAnalysis, CvRewrite, AdvancedRecommendations (altyapı hazır, endpoint yok)
```

```json
"Plans": {
  "FreeMonthlyAnalysisLimit": 2,
  "PremiumMonthlyAnalysisLimit": null
}
```

`PremiumMonthlyAnalysisLimit` bilinçli olarak `null` (sınırsız) bırakıldı, ama **configuration
üzerinden bir sayıya çevrilebilir** — ileride AI maliyetini kontrol etmek gerekirse kod
değişikliği gerekmez. Plan **fiyatı** bu aşamada hiçbir yerde tanımlanmadı (spec'in 19. maddesi
gereği) — fiyatlandırma İyzico entegrasyonundan önce ayrıca netleştirilecek.

## 2. Subscription Mimarisi

`Subscription` entity'si (`Models/Entities/Subscription.cs`), bir kullanıcının bir plana ne
zaman kaydolduğunu takip eder:

```
Subscription
- Id, UserId
- Plan (PlanType)
- Status (SubscriptionStatus: Active, PastDue, Cancelled, Expired, Pending)
- StartDate, EndDate (nullable)
- CreatedAt, UpdatedAt
- Provider, ProviderCustomerId, ProviderSubscriptionId (hepsi nullable — Aşama 9'da dolacak)
```

**Önemli davranış:** Bir kullanıcının hiç `Subscription` satırı olmaması gerekmez — **Free plan
hiçbir zaman bir Subscription satırı gerektirmez.** `SubscriptionService.GetEffectivePlanAsync`
şu mantığı izler:

> Kullanıcının `Plan=Premium`, `Status=Active` olan ve `StartDate <= şimdi < EndDate` (veya
> `EndDate == null`) koşulunu sağlayan bir Subscription satırı varsa → **Premium**.
> Aksi her durumda (satır yok, süresi dolmuş, iptal edilmiş, henüz başlamamış, PastDue, Pending)
> → **Free**.

Bu, yeni kayıt olan her kullanıcının otomatik olarak Free olmasını sağlar — ayrıca bir "Free
subscription" satırı oluşturmaya gerek yoktur.

## 3. Kullanım (Usage) / Kota Sistemi

`AnalysisUsage` entity'si (`Models/Entities/AnalysisUsage.cs`), harcanan her analiz kredisi için
**bir satır** tutan bir defterdir (sayaç değil) — "2026-08 kullanımı = 2" sorusu her zaman basit
bir `COUNT` sorgusudur:

```
AnalysisUsage
- Id, UserId
- AnalysisId (nullable)
- PeriodStart, PeriodEnd  (takvim ayı: PeriodStart dahil, PeriodEnd hariç, UTC)
- CreatedAt
```

`AnalysisId` neden nullable? Eğer kullanıcı ileride o CV'yi silerse, ilgili `Analysis` satırı
silinir (mevcut cascade davranışı) — ama **kullanım/faturalama gerçeği kaybolmamalı**: "bu ay 1
kredi harcandı" bilgisi CV silinse bile durmalı, yoksa bir CV'yi silmek kullanıcıya kredisini
"geri iade eder", ki bu istenmeyen bir davranıştır. Bu yüzden `AnalysisUsage.AnalysisId`,
Analysis silindiğinde `SET NULL` olacak şekilde yapılandırıldı (`AppDbContext`), `Cascade` değil.

### Akış: `User → Plan → Quota → CanAnalyze? → AI Analysis → Usage increment`

`Services/Billing/AnalysisQuotaService.cs`, `IAnalysisQuotaService`'in gerçek implementasyonudur:

1. **`EnsureUserCanAnalyzeAsync`** — AI çağrısından **önce** çalışan ucuz bir ön-kontrol. Kullanıcının
   planını çözer (`ISubscriptionService`), o planın limitini bulur (`IPlanCatalog`), bu ayki
   kullanımını sayar, limit doluysa `AnalysisQuotaExceededException` fırlatır. **Bu kontrol
   atomik değildir** — amacı, kotası zaten dolu olan yaygın durumda AI sağlayıcısına hiç istek
   gitmemesini sağlamaktır (gereksiz maliyeti önler).
2. **`RecordAnalysisUsageAsync`** — AI analizi **başarıyla tamamlandıktan sonra** çağrılır, bir
   `AnalysisUsage` satırı ekler. Bu metod **atomiktir** (bkz. §4 — Race Condition).
3. **`GetUsageSummaryAsync`** — `GET /api/billing/usage` için plan + used + limit + remaining +
   period döner.

## 4. Race Condition Çözümü

Kullanıcı aynı anda iki analiz isteği gönderirse ve tam olarak 1 hakkı kaldıysa, iki isteğin de
başarılı olup 2 hak harcamasına izin **verilmemelidir**.

**Çözüm:** `Services/Billing/IUserOperationLock.cs` / `UserOperationLock.cs` — kullanıcı id'sine
göre anahtarlanmış, process içi (`SemaphoreSlim`) bir kilit. `RecordAnalysisUsageAsync`,
kullanım sayısını **tekrar sayıp** yeni satırı eklemeden önce bu kilidi alır; kilit, aynı
kullanıcı için bu kritik bölüme aynı anda yalnızca bir çağrının girmesini garanti eder. İki
eşzamanlı istek varsa, ikincisi birincisi bitene kadar bekler, tekrar sayar ve kota doluysa
`AnalysisQuotaExceededException` fırlatır — asla iki satır birden eklenmez.

**Neden Postgres advisory lock / DB transaction değil de process-içi kilit?**
`AnalysisUsageServiceTests.cs`'teki testler `Microsoft.EntityFrameworkCore.InMemory` kullanıyor
(gerçek bir Postgres bağlantısı olmadan, hızlı ve maliyetsiz test çalıştırmak için — bu projenin
tüm test paketi bu yaklaşımı kullanıyor). InMemory sağlayıcısı gerçek transaction/advisory lock
desteklemiyor (`Database.BeginTransactionAsync` ilişkisel olmayan sağlayıcılarda hata fırlatır).
Process içi kilit hem InMemory'de hem gerçek Postgres'te aynı şekilde ve doğru çalışır, test
edilebilir, ve ek bir NuGet paketi gerektirmez.

**Bilinen ölçeklenme sınırı (dürüstçe belgelenmiş — bkz. `UserOperationLock.cs`'teki yorum):**
Bu kilit **process-local**'dır. Uygulamanın tek bir instance olarak çalıştığı mevcut deployment
şeklinde (bu projenin şu anki hali) doğru çalışır. Uygulama yatay olarak ölçeklendirilip (birden
fazla instance, load balancer arkasında) çalıştırılırsa, bu kilit YETERSİZ kalır — aynı
kullanıcının iki isteği farklı instance'lara düşebilir ve bu kilidi tamamen atlayabilir. O noktada
`IUserOperationLock`'un implementasyonu bir dağıtık kilide (Postgres `pg_advisory_xact_lock` veya
Redis tabanlı bir kilit) değiştirilmeli — arayüz zaten bu değişimin tek dokunulacağı yer olacak
şekilde tasarlandı; `AnalysisQuotaService` veya `CvController`'ın değişmesi gerekmeyecek.

### `CvController.Analyze` akışı (transactional tasarım)

```
JWT → User → CV ownership
  → Quota ön-kontrolü (EnsureUserCanAnalyzeAsync)     — kota zaten dolu ise AI'a HİÇ gidilmez
  → Parse CV
  → AI Analysis                                        — DB transaction'ının DIŞINDA, uzun sürebilir
  → Analysis DB'ye kaydedilir (SaveChanges)
  → RecordAnalysisUsageAsync (atomik "kredi harca")
      ├─ başarılı → 200 OK + sonuç
      └─ yarışı kaybetti (nadir: iki eşzamanlı istek, tam 1 hak kalmışken)
            → az önce kaydedilen Analysis geri alınır (Remove + SaveChanges)
            → 402 QUOTA_EXCEEDED
```

AI çağrısı bilinçli olarak **hiçbir DB transaction'ı içinde tutulmuyor** — AI sağlayıcısı
yavaş/zaman aşımına uğrarsa bir DB transaction'ını (ve dolayısıyla satır kilitlerini) uzun süre
açık tutmamak için. Yarış durumunda kaybeden isteğin AI maliyeti geri alınamaz (bu, spec'in kabul
ettiği bir ödünleşimdir — "mümkün olduğunca" ifadesi AI **başarısızlığı** için geçerlidir, bu
yarış senaryosu için değil), ama kredi **asla** çift harcanmaz — bu, gerçek para ile ilişkili
olacak bir sistem için doğru öncelik sıralamasıdır.

**AI başarısız olursa:** `EnsureUserCanAnalyzeAsync` sonrası AI çağrısı bir exception fırlatırsa
(`AiConfigurationException`, `AiRateLimitExceededException`, vb.), controller ilgili hata
yanıtını döner ve `RecordAnalysisUsageAsync` **hiç çağrılmaz** — kullanım hakkı harcanmaz.

## 5. `GET /api/billing/usage`

```json
{
  "plan": "FREE",
  "used": 1,
  "limit": 2,
  "remaining": 1,
  "periodStart": "2026-08-01T00:00:00Z",
  "periodEnd": "2026-09-01T00:00:00Z"
}
```

Sınırsız (Premium, limit yapılandırılmamışsa) için `limit` ve `remaining` **açıkça `null`**
döner — frontend bunu `-1` gibi bir magic number olarak asla yorumlamaz, `=== null` kontrolü
yapar. Ayrı bir `GET /api/billing/plan` endpoint'i **oluşturulmadı** — `plan` alanı zaten
`usage` response'unun içinde (spec madde 12: "gereksiz endpoint çoğaltma").

## 6. Feature Gating (Altyapı, Endpoint Yok)

`PlanFeature` enum'u (`Services/Billing/PlanFeature.cs`): `AtsAnalysis`, `JobDescriptionAnalysis`,
`CvRewrite`, `AdvancedRecommendations`. `PlanCatalog`, Premium plana bu dört özelliğin hepsini
verir, Free'ye hiçbirini vermez. `IFeatureEntitlementService.HasFeatureAsync(userId, feature)`,
bu bilgiyi tek bir yerden sorgulamayı sağlar.

**Bu aşamada bu özelliklerden hiçbiri için bir endpoint oluşturulmadı.** İleride örneğin ATS
analizi eklenmek istendiğinde, o controller action'ı şu satırla başlayacak:

```csharp
if (!await _entitlements.HasFeatureAsync(userId, PlanFeature.AtsAnalysis, cancellationToken))
{
    return StatusCode(StatusCodes.Status403Forbidden, ...);
}
```

— yeni bir ad hoc plan kontrolü icat etmeye gerek kalmayacak.

## 7. Frontend: Plan/Usage UI

- `BillingContext`/`useBilling` (`context/BillingContext.tsx`), `AuthContext`'in kullanıcı
  durumu değiştiğinde (giriş/çıkış) `GET /api/billing/usage`'ı otomatik çeker/temizler — aynı
  `AuthContext`'in 401'de otomatik çıkış yapması gibi, burada da giriş yapılınca otomatik
  yüklenir, çıkış yapılınca **anında** temizlenir (`isAuthenticated=false` olduğu an `usage`
  state'i `null`'a döner — önceki oturuma ait plan bilgisi asla yeni/hiç oturuma sızmaz).
- `PlanBadge` component'i (NavBar'da gösterilir): `FREE PLAN` / `PREMIUM` etiketi, Free için
  "1 / 2 analiz kullanıldı" sayacı, ve Free için **"Premium'a Geç"** butonu.
- **(Aşama 9 ile güncellendi)** "Premium'a Geç" butonu artık gerçek checkout akışına bağlıdır:
  `/premium/checkout` sayfasına yönlendiren bir `<Link>`'tir. Bu sayfa alıcı bilgilerini toplar,
  `POST /api/billing/checkout`'u çağırır ve İyzico'nun döndürdüğü checkout formunu render eder.
  Ayrıntılar için `docs/iyzico-integration.md`.
- `HomePage`, `usage.remaining === 0` olduğunda "CV'yi Analiz Et" butonunu devre dışı bırakır ve
  nedenini gösterir — backend zaten bunu reddedecek olsa da, kullanıcıya boşuna bir istek
  attırmamak için frontend'de de engellenir (gerçek yetkilendirme her zaman backend'dedir, bu
  sadece UX).
- Backend'in `402 QUOTA_EXCEEDED` yanıtındaki mesaj, `ErrorBanner` ile doğrudan gösterilir
  (backend mesajı zaten güvenli/sanitize edilmiş Türkçe metindir — mevcut `errorMessages.ts`
  deseniyle tutarlı).

## 8. Güvenlik

- Her `/api/billing/*` endpoint'i `[Authorize]`'dır ve `userId` her zaman JWT'den
  (`User.GetUserId()`) okunur — hiçbir zaman route/query/body parametresinden.
  `GET /api/billing/usage`, çağıran kullanıcının kendi verisi dışında hiçbir şey döndürmez
  (test: `BillingControllerTests.GetUsage_OnlyReflectsTheCallingUsersOwnUsage_...`).
- **(Güncelleme — Aşama 9/10)** `BillingController`'da artık mutating endpoint'ler **var**:
  `POST /api/billing/checkout` (Aşama 9) ve `POST /api/billing/subscription/cancel`
  (Aşama 10). Aşağıdaki cümle Aşama 8'de yazıldığında doğruydu ama artık güncel değil —
  burada tarihsel doğruluk için düzeltiliyor. Güvenlik garantisi hâlâ aynı **ilkeye**
  dayanıyor, sadece "hiç mutating endpoint yok" değil: **hiçbir endpoint client'tan bir
  plan/payment-outcome değeri kabul etmiyor** — checkout sadece alıcı bilgisi (isim,
  TC kimlik no vb.) alır, cancel hiçbir parametre almaz (her zaman çağıranın **kendi**
  JWT kimliğindeki aktif aboneliği hedefler). Bu artık bir reflection testiyle
  (`CheckoutRequestDto_NeverAcceptsAPlanOrPaymentOutcomeFieldFromTheClient`) DTO şekli
  seviyesinde doğrulanıyor — "mutating endpoint yok" testi yerine, daha isabetli bir
  "mutating endpoint'ler var ama hiçbiri client-controlled plan state kabul etmiyor" testi.
  Ayrıntılar için `docs/iyzico-integration.md`.
- Frontend **hiçbir zaman** `isPremium: true` gibi bir değer göndererek plan değiştiremez —
  çünkü böyle bir alanı kabul eden hiçbir endpoint yok. Plan/kullanım her zaman backend'de,
  sunucu tarafında hesaplanır.
- `used`/`remaining`/`plan` frontend'de asla yeniden hesaplanmaz — sadece backend'in döndürdüğü
  değerler gösterilir.

## 9. Abonelik Yönetimi ve Ödeme Geçmişi (Aşama 10)

Aşama 9'da eklenen `IPaymentProvider.CancelSubscriptionAsync` o zaman **tanımlıydı ama hiç
çağrılmıyordu** (yalnızca gelecekteki kullanım için hazırdı). Aşama 10, bunu gerçekten
kullanan orkestrasyon katmanını ekledi:

- `GET /api/billing/subscription` — plan/durum/sağlayıcı/tarih detayını döner (
  `GET /api/billing/usage`'ın bare plan string'inden daha zengin — hesap/billing sayfası
  için). Hiç abonelik satırı olmayan bir Free kullanıcı için tüm alanlar `null` döner, bu
  bir hata değildir.
- `POST /api/billing/subscription/cancel` — `IPaymentService.CancelPremiumSubscriptionAsync`
  çağıranın **kendi** aktif Premium aboneliğini bulur (varsa), İyzico'ya iptal isteği
  gönderir, ve — checkout callback/webhook'taki "asla tek bir çağrının sonucuna körü
  körüne güvenme" prensibiyle tutarlı olarak — iptal sonrası durumu **tekrar**
  `RetrieveSubscriptionStatusAsync` ile sunucu-sunucu doğrular, yerel `Subscription`
  satırını ancak o zaman günceller.
- `GET /api/billing/payments` — çağıranın kendi `PaymentTransaction` kayıtlarının özetini
  (tarih/durum/sağlayıcı/referans kodu) döner, en yeniden eskiye. **Asla bir tutar
  içermez** — bu uygulama hiçbir yerde bir plan fiyatı tanımlamadı (§1) — ve asla ham bir
  İyzico response'u göstermez.

Frontend tarafında bu üçü, `AccountPage`'in "Abonelik" ve "Ödeme Geçmişi" bölümlerini
besler (bkz. `docs/frontend-authentication.md` "Aşama 10 Eklemeleri"). "Aboneliği İptal
Et" butonu sadece backend `canCancel: true` dediğinde görünür ve bir onay adımı
gerektirir.

## 9. Development'ta Bir Kullanıcıyı Premium Yapma

Production'da herkesin çağırabileceği bir `POST /api/billing/make-premium` endpoint'i **yok** —
gerçek Premium aktivasyonu artık (Aşama 9) İyzico'nun backend-doğrulanmış ödeme sonucuna göre
yapılır (bkz. `docs/iyzico-integration.md`). Sandbox kimlik bilgisi olmadan uçtan uca denemek
istersen, aşağıdaki gibi doğrudan veritabanına bir `Subscription` satırı ekleyerek bir kullanıcıyı
manuel olarak Premium yapabilirsin (yalnızca development/test amaçlı — bu yol hiçbir API
endpoint'inden erişilebilir değildir):

```sql
INSERT INTO "Subscriptions" ("Id", "UserId", "Plan", "Status", "StartDate", "EndDate", "CreatedAt", "UpdatedAt")
VALUES (
  gen_random_uuid(),
  '<KULLANICININ-USERS-TABLOSUNDAKI-ID-SI>',
  'Premium',
  'Active',
  now(),
  NULL,
  now(),
  now()
);
```

`psql` ile bağlanıp çalıştırabilirsin (bağlantı bilgileri `dotnet user-secrets list` ile
görülebilir — bkz. `docs/authentication.md`). Kullanıcının `Id`'sini önce `Users` tablosundan
bulman gerekir:

```sql
SELECT "Id", "Email" FROM "Users" WHERE "Email" = 'test@example.com';
```

## 10. `PaymentTransaction` Entity'si (Aşama 9'da Eklendi)

Aşama 8'de bu bölüm bir `Payment` entity'sinin bilinçli olarak eklenmediğini, gerekçesinin
İyzico'nun gerçek response şemasının o aşamada bilinmediğini anlatıyordu. Aşama 9'da İyzico'nun
gerçek (SDK'dan doğrulanmış) response şekli netleşince, yalnızca **idempotency ve checkout↔kullanıcı
eşlemesi için gereken minimum alanları** taşıyan bir `PaymentTransaction` entity'si eklendi
(`Models/Entities/PaymentTransaction.cs`) — spekülatif bir "tam ödeme geçmişi" tablosu değil, somut
bir güvenlik ihtiyacına (aynı İyzico event'inin iki kez işlenmemesi, callback'in her zaman doğru
kullanıcıya bağlanması) karşılık gelen dar kapsamlı bir tablo. Tam alan listesi, neden gerekli
olduğu ve unique index'ler için bkz. **`docs/iyzico-integration.md`**.

`Subscription`'ın zaten taşıdığı `Provider`/`ProviderCustomerId`/`ProviderSubscriptionId` alanları
artık gerçek İyzico değerleriyle doldurulur — bu doküman §2'de anlatılan `Subscription` şeması ve
`GetEffectivePlanAsync` mantığı **hiç değişmedi**.

## 11. Aşama 9: İyzico Entegrasyonu (Tamamlandı)

Aşama 9 ile gerçek İyzico ödeme akışı uçtan uca implement edildi:

```
Kullanıcı "Premium'a Geç"e tıklar (PlanBadge → /premium/checkout)
  → Frontend, POST /api/billing/checkout'u çağırır (JWT ile authenticated)
  → Backend, İyzico Subscription (V2) checkout form'unu başlatır, bir PaymentTransaction
    satırı oluşturur (bu satır, checkout token'ı başlatan kullanıcıyı kalıcı olarak sabitler)
  → Frontend, İyzico'nun döndürdüğü checkout form içeriğini render eder
  → Kullanıcı kart bilgilerini İYZİCO'NUN kendi arayüzünde girer (bu uygulama asla kart
    bilgisi görmez/saklamaz)
  → İyzico, callback URL'ine (POST /api/billing/checkout/callback) ve/veya webhook'a
    (POST /api/billing/webhook/iyzico) sonucu bildirir
  → Backend bu bildirimi ASLA olduğu gibi güvenmez: imza doğrulaması + zorunlu sunucu-sunucu
    "gerçek durumu getir" çağrısı (İyzico API'sine) ile teyit eder
  → Yalnızca gerçekten doğrulanmış başarı durumunda:
      - var olan PaymentTransaction işlenmiş olarak işaretlenir (idempotency)
      - ilgili kullanıcının Subscription satırı oluşturulur/güncellenir (Plan=Premium,
        Status=Active, Provider="Iyzico", ProviderCustomerId=..., ProviderSubscriptionId=...)
  → Kullanıcının bir sonraki `GET /api/billing/usage` çağrısı otomatik olarak "PREMIUM" döner
    — mevcut `SubscriptionService.GetEffectivePlanAsync` mantığı HİÇ değişmeden çalıştı
```

Ayrıntılı akış diyagramı, doğrulama mekanizması, idempotency stratejisi, webhook güvenlik modeli,
sandbox/production kurulumu ve güvenlik testleri için bkz. **[`docs/iyzico-integration.md`](./iyzico-integration.md)**.

Aşama 8'de kurulan mimarinin Aşama 9'u kolaylaştıran özellikleri (öngörüldüğü gibi çalıştı):

- `ISubscriptionService`/`IAnalysisQuotaService`/`IPlanCatalog` arayüzleri hiç değişmedi — Aşama 9
  sadece yeni bir `Subscription` satırı YAZAN bir yer ekledi (`PaymentService`), OKUYAN taraf
  (`GetEffectivePlanAsync`, quota kontrolü, `/api/billing/usage`) hiç değişmedi.
- `Subscription.Provider*` alanları zaten nullable ve hazırdı, doğrudan gerçek İyzico değerleriyle
  dolduruldu.
- Frontend'in `PlanBadge`/`useBilling`/quota-aware Analyze butonu zaten backend'den gelen gerçek
  `plan`/`used`/`limit`/`remaining` değerlerini gösteriyordu — Aşama 9'da bu bileşenlerin
  **hiçbiri** değişmedi, sadece "Premium'a Geç" butonunun hedefi "yakında" notu yerine gerçek
  checkout sayfasına (`/premium/checkout`) döndü.

## 12. Testler Nasıl Çalıştırılır?

```bash
cd CvAnalyzer
dotnet clean && dotnet build && dotnet test    # backend
cd cv-analyzer-web
npm test && npm run lint && npm run build       # frontend
```

Gerçek AI API'sine veya gerçek İyzico API'sine hiçbir testte istek atılmaz — ödeme testleri
`IPaymentProvider`'ın sahte (`FakePaymentProvider`) implementasyonu üzerinden çalışır (bkz.
`docs/iyzico-integration.md`).

# Free / Premium Plan ve Kullanım Kotası (Aşama 8)

Bu doküman, Free/Premium plan altyapısını, kullanım (usage/quota) sistemini, subscription
modelini, feature gating mimarisini ve Aşama 9'da İyzico'nun tam olarak nereye bağlanacağını
açıklar. **Bu aşamada gerçek bir ödeme sistemi implement edilmemiştir** — sadece Aşama 9'da
İyzico entegre edilebilecek altyapı kurulmuştur.

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
- **"Premium'a Geç" butonu şu anda hiçbir ödeme sayfasına gitmez** — tıklanınca sadece "Premium
  yakında!" notu gösterir. Gerçek checkout Aşama 9'da bağlanacak.
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
- `BillingController`'da hiçbir mutating endpoint (`POST`/`PUT`/`PATCH`/`DELETE`) yoktur — sadece
  `GET`. Bu, bir reflection testiyle de doğrulanır
  (`BillingController_ExposesNoWayToSetOrChangeAPlan`), böylece ileride yanlışlıkla bir "plan
  ayarla" endpoint'i eklenirse test kırılır.
- Frontend **hiçbir zaman** `isPremium: true` gibi bir değer göndererek plan değiştiremez —
  çünkü böyle bir alanı kabul eden hiçbir endpoint yok. Plan/kullanım her zaman backend'de,
  sunucu tarafında hesaplanır.
- `used`/`remaining`/`plan` frontend'de asla yeniden hesaplanmaz — sadece backend'in döndürdüğü
  değerler gösterilir.

## 9. Development'ta Bir Kullanıcıyı Premium Yapma

Production'da herkesin çağırabileceği bir `POST /api/billing/make-premium` endpoint'i **yok** —
gerçek Premium aktivasyonu Aşama 9'da İyzico ödeme sonucuna göre yapılacak. Development/test
amacıyla, doğrudan veritabanına bir `Subscription` satırı ekleyerek bir kullanıcıyı Premium
yapabilirsin:

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

## 10. `Payment` Entity'si: Aşama 9'a Ertelendi

Bu aşamada bir `Payment` entity'si **eklenmedi**. Gerekçe:

- İyzico'nun gerçek response şeması (transaction id, ödeme durumu alan adları/değerleri, hata
  kodları) Aşama 9'a kadar bilinmiyor — şimdi tahmini bir şema tasarlamak, ya kullanılmayan boş
  bir tablo olarak kalacak ya da Aşama 9'da gerçek şekliyle uyuşmadığı için yeniden yazılacaktı.
- Spec'in kendisi de sahte/tahmini ödeme kaydı oluşturmayı açıkça yasaklıyor — bir `Payment`
  tablosu şimdiden var olup içi hiç dolmayacaksa (bu aşamada gerçek ödeme yok), eklemenin somut
  bir faydası yok, sadece erken/gereksiz karmaşıklık.
- `Subscription`'ın zaten taşıdığı `Provider`/`ProviderCustomerId`/`ProviderSubscriptionId`
  alanları, Aşama 9'un ilk entegrasyonu için yeterli — bir kullanıcının aktif Premium
  aboneliğinin hangi sağlayıcıdan geldiğini bilmek için ayrı bir `Payment` tablosuna henüz gerek
  yok. Tekil ödeme/transaction geçmişi (ör. yenileme başarısız oldu, iade edildi) gerektiğinde,
  Aşama 9'da İyzico'nun gerçek response alanlarına göre eklenmesi önerilir.

## 11. Aşama 9: İyzico Tam Olarak Nereye Bağlanacak

```
Kullanıcı "Premium'a Geç"e tıklar
  → (Aşama 9) Frontend, backend'de yeni bir "checkout başlat" endpoint'ini çağırır
  → (Aşama 9) Backend, İyzico'nun ödeme/checkout formunu (veya iframe/redirect) başlatır
  → Kullanıcı kart bilgilerini İYZİCO'NUN kendi arayüzünde girer (bu uygulama asla kart
    bilgisi görmez/saklamaz)
  → İyzico ödeme sonucu bir webhook/callback ile backend'e bildirir
  → (Aşama 9) Backend bu callback'i doğrular (imza/secret kontrolü) ve:
      - yeni bir `Subscription` satırı oluşturur (Plan=Premium, Status=Active,
        Provider="Iyzico", ProviderCustomerId=..., ProviderSubscriptionId=...)
      - (muhtemelen) bir `Payment` kaydı ekler (bu doküman §10)
  → Kullanıcının bir sonraki `GET /api/billing/usage` çağrısı otomatik olarak "PREMIUM" döner
    — mevcut `SubscriptionService.GetEffectivePlanAsync` mantığı HİÇ değişmeden çalışır
```

Bu aşamada kurulan mimarinin İyzico entegrasyonunu kolaylaştıran özellikleri:

- `ISubscriptionService`/`IAnalysisQuotaService`/`IPlanCatalog` arayüzleri zaten var — Aşama 9
  sadece yeni bir `Subscription` satırı YAZAN bir yer ekleyecek (webhook handler), OKUYAN taraf
  (`GetEffectivePlanAsync`, quota kontrolü, `/api/billing/usage`) hiç değişmeyecek.
- `Subscription.Provider*` alanları zaten nullable ve hazır.
- Frontend'in `PlanBadge`/`useBilling`/quota-aware Analyze butonu zaten backend'den gelen gerçek
  `plan`/`used`/`limit`/`remaining` değerlerini gösteriyor — Aşama 9'da bu bileşenlerin
  **hiçbiri** değişmeyecek, sadece "Premium'a Geç" butonunun `onClick`'i "yakında" notu yerine
  gerçek checkout akışını başlatacak.

## 12. Testler Nasıl Çalıştırılır?

```bash
cd CvAnalyzer
dotnet clean && dotnet build && dotnet test    # backend
cd cv-analyzer-web
npm test && npm run lint && npm run build       # frontend
```

Gerçek AI API'sine veya gerçek bir ödeme sağlayıcısına hiçbir testte istek atılmaz.

# Admin Panel (Stage 16)

CVora AI'ın admin paneli; kullanıcıları, abonelikleri, ödemeleri ve sistem istatistiklerini
merkezi olarak yönetmek için eklenmiştir. Mevcut authentication/authorization, subscription,
quota ve payment mimarisi **yeniden yazılmadı** — bu aşama yalnızca üzerine minimal bir rol
katmanı ve admin-only bir API/UI yüzeyi ekler.

## 1. Rol Modeli

`User` entity'sine `Role` alanı eklendi (`UserRole` enum: `User` | `Admin`, varsayılan `User`).
Diğer enum'larla aynı kural: veritabanında string olarak saklanır (bkz. `PlanType`,
`SubscriptionStatus`).

Rol, JWT'ye `"role"` claim olarak eklenir (bkz. `JwtTokenService`) ve
`Program.cs`'te `TokenValidationParameters.RoleClaimType = "role"` ile ASP.NET Core'un yerleşik
`[Authorize(Roles = "Admin")]` mekanizmasına bağlanır — her admin endpoint'i için ayrı ayrı bir
yetkilendirme kontrolü yazmaya gerek kalmaz; middleware katmanında tek noktadan uygulanır.

**Önemli:** Bir JWT'nin `role` claim'i, token üretildiği andaki role sabitlenir. Bir kullanıcı
admin yapıldıktan sonra eski token'ı hâlâ `role: User` taşımaya devam eder — yeni yetkinin
etkili olması için kullanıcının yeniden login olması (yeni bir token alması) gerekir. Bu, JWT'nin
doğası gereği beklenen bir davranıştır; sunucu tarafında bir "token blacklist" sistemi yoktur
(bkz. `ActiveAccountFilter`'ın da aynı sınırlaması).

## 2. İlk Admin Nasıl Oluşturulur

Hiçbir zaman herkese açık/self-servis bir "admin ol" endpoint'i yoktur. İlk admin, `Admin`
konfigürasyon bölümündeki `BootstrapEmail` değeri üzerinden, uygulama her başlatıldığında
idempotent şekilde tanımlanır (bkz. `AdminBootstrap.SeedAsync`, `Program.cs`'te `app.Run()`'dan
hemen önce çağrılır):

```json
"Admin": {
  "BootstrapEmail": ""
}
```

- Boşsa (varsayılan): hiçbir şey yapılmaz — çoğu ortamda (ör. her test host'unda) bu ayar hiç
  kullanılmaz.
- Doluysa ve o e-posta ile kayıtlı bir kullanıcı varsa ve henüz Admin değilse: o kullanıcı Admin
  yapılır.
- Zaten Admin ise: no-op.

Sonraki her admin, mevcut bir admin tarafından `PATCH /api/admin/users/{id}/role` ile atanır.

## 3. Backend API Yüzeyi

Tüm endpoint'ler `[Authorize(Roles = "Admin")]` ile korunur — yalnızca frontend route gizleme
değil, her istek backend tarafından bağımsız olarak doğrulanır. Yetkisiz bir çağrı:
- Token yoksa → `401 Unauthorized`
- Token var ama rol Admin değilse → `403 Forbidden`

| Endpoint | Açıklama |
|---|---|
| `GET /api/admin/dashboard` | Kullanıcı/abonelik/ödeme/gelir/analiz istatistikleri |
| `GET /api/admin/users?page=&pageSize=&search=` | Sayfalanmış, e-posta ile aranabilir kullanıcı listesi |
| `GET /api/admin/users/{id}` | Bir kullanıcının hesap/abonelik/kullanım/ödeme detayı |
| `PATCH /api/admin/users/{id}/active` | Hesabı aktif/pasif yapar |
| `PATCH /api/admin/users/{id}/role` | Kullanıcının rolünü değiştirir |
| `POST /api/admin/users/{id}/subscription/cancel` | Kullanıcının aktif Premium aboneliğini iptal eder |
| `GET /api/admin/payments?page=&pageSize=&status=&search=&fromDate=&toDate=` | Tüm kullanıcılar genelinde ödeme listesi |
| `GET /api/admin/audit-logs?page=&pageSize=` | Kayıtlı admin işlemleri |

### Mimari: Controller → Service → Domain

Hiçbir admin controller'ı doğrudan veritabanına yazmaz. Yeni `Services/Admin/` katmanı
(`IAdminUserService`, `IAdminPaymentService`, `IAdminDashboardService`, `IAdminAuditLogService`)
mevcut servisleri **yeniden kullanır**, yeniden yazmaz:

- Kullanıcı detay sayfası: `ISubscriptionService`, `IAnalysisQuotaService`, `IPaymentService` —
  kullanıcının kendi hesap sayfasının okuduğu **aynı** servisler, sadece admin başka bir
  kullanıcı hakkında sorabiliyor.
- Abonelik iptali: `PaymentService.CancelPremiumSubscriptionAsync` — kullanıcının kendi "Aboneliği
  İptal Et" butonunun kullandığı **aynı** Iyzico-onaylı akış, sadece hedef kullanıcı admin
  tarafından belirleniyor.
- Kota: Hiç kod değişikliği gerekmedi — `AnalysisQuotaService` zaten `Subscription` tablosundan
  okuyor; bir abonelik iptal edildiğinde kota otomatik olarak Free'ye döner.

### Neden "Premium ver" işlemi yok?

Bilinçli bir kapsam kararı: Admin panelinden manuel olarak bir kullanıcıya Premium **verme**
işlemi eklenmedi. Bunun nedeni, Aşama 15'te kurulan "Premium yalnızca gerçek, doğrulanmış bir
Iyzico ödemesiyle etkinleşir" ilkesini bozmamaktır — bir admin'in tek taraflı olarak ödemesiz
Premium verebilmesi, o ilkeyi delen bir arka kapı olurdu. Admin'in tek abonelik-yönetim yetkisi
**iptal** (her zaman düşürme yönünde, asla yükseltme) — bu yüzden mevcut, zaten güvenli olan
`CancelPremiumSubscriptionAsync` akışını olduğu gibi yeniden kullanmak yeterliydi.

## 4. Denetim Günlüğü (Audit Log)

Yeni `AdminAuditLog` tablosu — her ayrıcalıklı admin işlemi (hesap aktif/pasif, rol değişimi,
abonelik iptali) için: hangi admin, hangi işlem, hangi hedef kullanıcı, ne zaman, başarılı mı.
Başarısız denemeler de (ör. bir admin'in kendi hesabını hedeflemeye çalışması) kayda geçer.

`Details` alanı her zaman kısa ve güvenli bir özet cümledir (ör. `"IsActive -> False"`,
`"Premium subscription cancelled"`) — asla bir parola, API anahtarı veya ham ödeme verisi
içermez. Bu, mevcut `PaymentTransaction.FailureReason` alanının izlediği aynı disiplindir.

Bu, uygulamanın mevcut `ILogger` tabanlı teknik loglamasının **yanında** çalışan, ayrı bir
kayıttır — teknik loglama operasyonel tanı için hâlâ aynen çalışmaya devam eder; `AdminAuditLog`
özellikle Admin Panel'in "İşlem Kayıtları" ekranından sorgulanabilir, yapılandırılmış bir kayıt
olarak eklenmiştir.

## 5. Frontend

`AdminRoute` bileşeni (`user.role === 'Admin'` kontrolü) admin sayfalarını sarar — ancak bu
**yalnızca bir UX kolaylığıdır**, güvenlik sınırı değildir: her admin API çağrısı backend
tarafından bağımsız olarak `[Authorize(Roles = "Admin")]` ile korunur. `AdminRoute`'u atlatan
(ör. client state'i elle değiştiren) bir kullanıcı yine de her gerçek istekte 403 alır.

Sayfalar: `AdminDashboardPage`, `AdminUsersPage` (arama + sayfalama), `AdminUserDetailPage`
(hesap/abonelik/kullanım/ödeme + aksiyonlar), `AdminPaymentsPage` (durum/tarih/kullanıcı
filtreleri + sayfalama), `AdminAuditLogsPage`. Tüm listeler backend-taraflı sayfalanır — hiçbir
sayfa binlerce kaydı tek seferde çekmez.

## 6. Güvenlik Kapsamı (Aşama 16; Aşama 17'de tam denetlendi)

Bu aşamada uygulanan temel kontroller: authentication, role-based authorization (middleware
katmanında), server-side pagination/arama (client'a güvenilmiyor), IDOR koruması (bir normal
kullanıcı kendi ID'siyle bile admin endpoint'lerine erişemez — rol kontrolü ID'den önce gelir),
kullanıcı izolasyonu, hassas veri koruması (parola hash'i, Iyzico secret'ları hiçbir admin
response'unda yer almaz).

**Kapsam dışı bırakılanlar (bilinçli):** Şifre görüntüleme, API key görüntüleme, Iyzico secret
görüntüleme, ham ödeme/kart verisi görüntüleme — bunlar admin paneline kesinlikle eklenmedi.

Aşama 16'nın kendi raporunda self-flagged bırakılan tek boşluk — admin controller'larında rate
limiting yoktu — Aşama 17'nin tam kapsamlı Security Audit'inde kapatıldı: her 4 admin controller'ı
artık `[EnableRateLimiting(RateLimitPolicies.Admin)]` taşıyor (bkz. `docs/production.md` §8).
Aynı denetimde, normal bir kullanıcının token'ının `role` claim'i "Admin" olarak forge edilip bir
admin endpoint'ine sunulmasının (imza artık uyuşmadığı için) reddedildiği ayrıca ayrı bir
integration testle kanıtlandı (`AdminEndpoint_WithNormalUsersTokenForgedToRoleAdmin_IsRejected`).

## 7. Ortam Değişkenleri

Yeni bir sır/secret eklenmedi. Tek yeni ayar, bir e-posta adresi olan (sır değil)
`Admin__BootstrapEmail` — mevcut `Jwt__SigningKey`, `Iyzico__SecretKey` gibi environment
variable override deseniyle aynı şekilde ayarlanır, gerçek bir değer asla repo'ya
commit edilmez.

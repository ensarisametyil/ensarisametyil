# Frontend Kimlik Doğrulama (Aşama 7)

Bu doküman, `cv-analyzer-web`'e eklenen kayıt/giriş akışını, route koruma mekanizmasını ve
token saklama kararını açıklar. Aşama 6'daki upload → analyze → dashboard akışı
(`docs/frontend.md`) değişmeden korunmuştur; bu doküman sadece üzerine eklenenleri anlatır.

## Yapı (Aşama 7 eklemeleri)

```
src/
  api/
    tokenStorage.ts     → access token'ın okunduğu/yazıldığı TEK yer
    authEvents.ts        → httpClient'ın 401'i AuthContext'e haber vermesi için küçük pub-sub
    httpClient.ts        → cvService'teki eski requestJson'ın yerini alan ORTAK fetch sarmalayıcı;
                            Authorization header'ını otomatik ekler
    authService.ts       → register(), login(), me()
    analysisService.ts   → listAnalyses(), getAnalysis() (analiz geçmişi)
  types/
    auth.ts              → User, AuthResponse, RegisterRequest, LoginRequest
    analysis.ts           → PagedResult<T>, AnalysisSummary, AnalysisDetail
  context/
    authContextObject.ts → yalnızca React context nesnesi + tip (fast-refresh lint kuralı için ayrı dosya)
    AuthContext.tsx       → AuthProvider — oturumu yönetir (login/register/logout/restore)
  hooks/
    useAuth.ts            → AuthContext'i okuyan hook
  components/
    ProtectedRoute.tsx    → giriş yapmamış kullanıcıyı /login'e yönlendirir
    AppLayout.tsx          → NavBar + <Outlet/> (korumalı sayfaların ortak iskeleti)
    NavBar.tsx              → üst gezinme + kullanıcı e-postası + çıkış butonu
  pages/
    LoginPage.tsx / RegisterPage.tsx
    HistoryPage.tsx         → "Analiz Geçmişim" listesi
    HistoryDetailPage.tsx    → tek bir analizin tam detayı (AnalysisDashboard'u tekrar kullanır)
```

`cvService.ts` (Aşama 6) kendi `requestJson`'ını artık kullanmıyor — ortak `httpClient.ts`'e
yönlendirildi. Bu sayede `uploadCv`/`analyzeCv` çağrıları da (backend artık bu endpoint'leri
`[Authorize]` ile koruduğu için) otomatik olarak `Authorization` header'ı taşır; `cvService.ts`'in
kendi fonksiyon imzaları/davranışı **değişmedi**.

## Token Saklama Kararı: `localStorage` (dokümante edilmiş ödünleşim)

Backend, access token'ı `POST /api/auth/register` ve `/login`'in **JSON gövdesinde** döner
(`Set-Cookie` ile değil) — bu Aşama 7'nin backend tasarım kararıdır. Bu yüzden httpOnly cookie
(XSS'e karşı en güvenli seçenek, ama backend'in cookie set/yönetmesini ve CSRF koruması
eklemeyi gerektirir) backend'de değişiklik yapmadan mevcut bir seçenek değildir.

Bu kısıtla gerçekçi seçenekler:

| Seçenek | Artı | Eksi |
|---|---|---|
| Sadece bellekte (React state) | XSS'e karşı en güvenli | Her sayfa yenilemesinde oturum kaybolur — bu uygulama için rahatsız edici bulundu |
| `sessionStorage` | `localStorage` ile aynı XSS riski | Sekmeler arası oturum paylaşılmaz — belirgin bir avantaj sağlamıyor |
| **`localStorage` (seçilen)** | Sayfa yenileme/sekmeler arasında oturum korunur | JS tarafından okunabilir → başarılı bir XSS saldırısı token'ı çalabilir |

`localStorage` seçildi çünkü UX kaybı (her yenilemede yeniden giriş) mevcut backend
sözleşmesiyle XSS riskini "gizli" tutmanın getirisinden daha ağır basıyor. Risk şu şekillerde
azaltıldı:

- Token'a erişen **tek dosya** `src/api/tokenStorage.ts`'tir — başka hiçbir modül
  `localStorage`'a doğrudan dokunmaz, token component'ler arasında prop olarak rastgele
  dolaştırılmaz.
- Token **hiçbir zaman URL'e/query string'e konmaz**, hiçbir `console.log`/hata mesajında
  yer almaz (`httpClient.ts`'teki hata loglaması sadece HTTP status/code içerir).
- React, render edilen her metni varsayılan olarak escape eder ve bu kod tabanında hiçbir yerde
  `dangerouslySetInnerHTML` kullanılmaz — XSS yüzeyini daraltan mevcut bir alışkanlık.
- Bu uygulama daha yüksek hassasiyetli veriler taşımaya başlarsa (ör. ödeme bilgisi), bu karar
  yeniden değerlendirilip backend'in httpOnly-cookie + CSRF-token sözleşmesine geçmesi önerilir.

## Kimlik Doğrulama Akışı

1. `AuthProvider` (uygulama kökünde) mount olduğunda `tokenStorage`'da bir token varsa
   `GET /api/auth/me` ile doğrular; geçerliyse kullanıcı state'e yüklenir, geçersizse
   (401) token otomatik temizlenir. Bu süre boyunca `isLoading=true` — `ProtectedRoute` bu
   sırada bir spinner gösterir, erken bir "giriş yapmamış" yönlendirmesi yapmaz.
2. `LoginPage`/`RegisterPage`: başarılı istekte dönen token `setToken()` ile saklanır, kullanıcı
   state'e yazılır ve önceden gitmek istediği sayfaya (`location.state.from`) veya `/`'e
   yönlendirilir.
3. `ProtectedRoute`, `isAuthenticated=false` olduğunda `/login`'e `<Navigate>` ile yönlendirir —
   `/`, `/history`, `/history/:id` dahil tüm asıl uygulama sayfaları bunun arkasındadır.
4. Herhangi bir korumalı API çağrısı **`401`** dönerse (`httpClient.ts`), bu sadece token
   gönderilmiş bir istekteyse (yani gerçek bir "oturum geçersiz/süresi dolmuş" durumuysa)
   `authEvents.emitUnauthorized()` tetiklenir; `AuthProvider` bunu dinler ve kullanıcıyı otomatik
   çıkış yaptırır — `ProtectedRoute` bir sonraki render'da kullanıcıyı `/login`'e yönlendirir.
   (Not: `/api/auth/login`'e yanlış şifreyle giden bir `401`, token taşımadığı için bu event'i
   **tetiklemez** — bu normal, beklenen bir hata, oturum sonlandırma değildir.)
5. `NavBar`'daki "Çıkış Yap" butonu `logout()`'u çağırır (token temizlenir, kullanıcı `null`
   olur) ve `/login`'e yönlendirir.

## Analiz Geçmişi

- `HistoryPage` (`/history`), `GET /api/analyses` ile kullanıcının geçmiş analizlerini
  (tarih, CV adı, skor, kısa özet) listeler.
- Bir satıra tıklamak `/history/:id`'ye götürür; `HistoryDetailPage`, `GET /api/analyses/{id}`
  ile tam sonucu çeker ve **Aşama 6'daki `AnalysisDashboard` component'ini aynen yeniden
  kullanır** (aynı `CvAnalysisResult` şekli — yeni bir "detay görünümü" component'i yazmaya
  gerek kalmadı).

## Testler Nasıl Çalıştırılır?

```bash
npm test
```

Gerçek backend'e veya gerçek AI API'sine hiçbir testte istek atılmaz (Aşama 6'daki gibi `fetch`
her testte taklit edilir). Kimlik doğrulama akışına özel testler:

| Senaryo | Dosya |
|---|---|
| Korumalı bir route'a girişsiz erişim → `/login`'e yönlendirme | `src/App.test.tsx` |
| Başarılı giriş → oturum saklanır, uygulama gösterilir | `src/App.test.tsx` |
| Hatalı giriş → hata mesajı, login sayfasında kalınır | `src/App.test.tsx` |
| Çıkış yap → oturum temizlenir, `/login`'e yönlendirilir | `src/App.test.tsx` |
| Korumalı API çağrısına `Authorization` header'ı eklenmesi | `src/App.test.tsx`, `src/api/httpClient.test.ts` |
| Süresi dolmuş/geçersiz token → otomatik çıkış (401 handling) | `src/App.test.tsx`, `src/api/httpClient.test.ts` |
| Kayıt formu — zayıf parola / zaten kayıtlı e-posta doğrulaması | `src/pages/RegisterPage.test.tsx` |
| Analiz geçmişi listesi doğru render ediliyor | `src/pages/HistoryPage.test.tsx` |
| Analiz geçmişi detayı (gerçek id ile, hard-code değil) doğru render ediliyor | `src/pages/HistoryDetailPage.test.tsx` |

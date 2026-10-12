# AcilRadar · Güvenlik ve gizlilik

Bu belge sunucu/arka uç ekibinin uygulaması gereken başlıkları ve ön yüzün güvenlik kararlarını özetler.

## 1. Önerilen HTTP başlıkları (sayfa ve statik dosyalar için)

Sayfa bu başlıklarla **çalışacak biçimde yazılmıştır** (satır içi betik, satır içi stil, satır içi olay ve `eval` yoktur). `tools/mock-server.js` aynı başlıklarla sunar; `tests/ui.test.js` CSP ihlali olmadığını denetler.

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), camera=(), microphone=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains   (yalnız HTTPS'te)
```

- API başka bir kökteyse `connect-src` içine o köken eklenmelidir (ör. `connect-src 'self' https://api.ornek`).
- `img-src` içindeki `data:` Leaflet'in iç görselleri içindir.
- `style-src 'self'` ile uyumludur: arayüz yalnız CSSOM (`element.style.setProperty`) kullanır; `style="…"` özniteliği yazmaz.
- Sayfa HTTPS üzerinden sunulmalıdır ("Konumumu kullan" HTTPS gerektirir; `localhost` istisnadır).

## 2. XSS'e karşı

- Sunucudan gelen her metin (`name`, `district`, `notice.text`) **`textContent`** ile yazılır. Uygulama kodunda `innerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function` **yoktur** (`tests/run-unit.js` tarar).
- Sunucunun hata iletisi (`error.message`) kullanıcıya **hiç gösterilmez**; yalnız hata kodu Türkçe metne çevrilir.
- Dış bağlantılar `target="_blank" rel="noopener noreferrer"` ile açılır.
- Kimlikler DOM `id`'sine yazılırken güvenli karakterlere çevrilir; seçicilerde `CSS.escape` kullanılır.

## 3. Üçüncü taraf kod

- Tek dış kütüphane: **Leaflet 1.9.4**, `vendor/leaflet/` altında **yerel kopya** (CDN'e bağımlılık yok). Lisans: BSD-2-Clause (`vendor/leaflet/LICENSE`).
- `leaflet.js` SHA-256: `db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a`
  (SRI biçimi: `sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=`; unpkg'deki resmî dosyayla aynıdır). `tests/run-unit.js` bu özeti doğrular.
- `leaflet.css` SRI: `sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=`.
- NOT: Yerel kopyada `integrity` özniteliği kullanılmaz; çünkü `file://` ile açılışta tarayıcı SRI denetimini yapamaz ve betiği engeller. Bütünlük, depodaki özetle ve testle güvenceye alınır. CDN'e geçilirse `integrity` + `crossorigin` eklenmelidir.
- Harita karoları `tile.openstreetmap.org`'dan gelir. OSM karo kullanım politikasına uyulmalıdır; yüksek trafikte kendi karo sunucusu ya da ticari sağlayıcı gerekir.

## 4. Gizlilik (KVKK)

- **Konum asla ağa çıkmaz.** "Konumumu kullan" ile alınan koordinat yalnız bellekte tutulur, mesafe tarayıcıda hesaplanır, hiçbir isteğe eklenmez, saklanmaz. "Yol tarifi al" bağlantısı yalnız hastanenin koordinatını içerir.
- Çerez yoktur. Analitik, reklam, izleyici, harici yazı tipi yoktur.
- Tarayıcıda yalnız `acilradar.prefs` anahtarı altında **yazı boyutu** ve **seçilen ilçe** saklanır (try/catch'li; depolama yoksa uygulama yine çalışır).
- Kişisel sağlık verisi toplanmaz. Aşama B panelinde de yalnız **toplu sayılar** girilecektir; hasta bazlı alan yoktur.

## 5. Kimlik doğrulama (Aşama B için not)

- Aşama A'da kimlik doğrulama yoktur. İleride tüm istekler `js/api.js › request()` çekirdeğinden geçtiği için `setRequestHook` ile tek noktadan `Authorization` başlığı ya da `credentials: 'include'` eklenebilir.
- **Arayüzde bir düğmeyi/ekranı gizlemek güvenlik DEĞİLDİR.** Rol ve yetki denetimi (hospital_staff, hospital_admin, province_viewer, system_admin) her istekte **sunucuda** yapılmalıdır. Arayüz yalnız kullanıcı deneyimi için yetkisiz öğeleri göstermez.
- Panelde: oturum çerezi `HttpOnly; Secure; SameSite=Strict`, CSRF koruması, kaba kuvvete karşı hız sınırı (429), parola alanlarında `autocomplete="current-password" / "new-password"`.

## 6. Bildirim

Bir güvenlik açığı fark edilirse proje sorumlusuna doğrudan bildirilmelidir; açık kamuya duyurulmadan önce düzeltilmelidir.

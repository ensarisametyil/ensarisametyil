# Değişiklik günlüğü

Biçim: en yeni üstte. Sözleşme (API) değişiklikleri ayrıca belirtilir.

## 1.0.0 — Aşama A (herkese açık site)

Önceki deneme sürümünün yerine baştan kuruldu. Başlıca değişiklikler:

### Mimari
- Sunucu biçimini bilen tek dosya **`js/schema.js`** eklendi (eşleme tablosu, güvenli tür dönüşümü, sınır denetimi, sürüm denetimi, hata kodu eşlemesi).
- **`js/api.js`** tek `request()` çekirdeğine geçti: 8 sn zaman aşımı, 5xx/ağ hatasında en çok 2 üstel beklemeli yeniden deneme, 429'da `Retry-After`, ETag/`If-None-Match`, "en son istek kazanır" iptali, kimlik doğrulama için tek kanca.
- Ortam seçimi (`mock | development | production`) `js/config.js`'te tek satır.
- Örnek veri yalnız `mock` ortamında yüklenir; aynı üretici `tools/mock-server.js` tarafından da kullanılır.
- Bilgi yaşı **sunucu saatiyle** hesaplanır (cihaz saati yanlış olsa da doğru).
- "Akşam 20:00" saati geçince "bugün için geçti" olur; gece yarısından sonra yeniden açılır.
- Harita görünür olunca ve tarayıcı boştayken yüklenir; Leaflet yerel kopyadır.

### Arayüz
- "Sakin güven" tasarım sistemi (`css/tokens.css`): yeni palet, 14·16·18·22·28·36 ölçeği, 4/8 boşluk ızgarası, katman ve hareket jetonları.
- Kaldırılanlar: manuel tema seçici (koyu tema yalnız sistem tercihiyle), favoriler, paylaş düğmesi, otomatik yenileme seçicisi, cam efekti ve hareketli arka plan.
- Kart: sol durum şeridi, sağda halka, "En kısa toplam süre" etiketi, "daha acil / acil olmayan başvurular" ifadeleri.
- Sunucu duyurusu (`notice`) bandı; "Veriler nereden geliyor?" bölümü; yazdırma görünümü; JS kapalı ve eski tarayıcı yedeği.

### Sözleşme
- **v1.0**: `GET /api/v1/hospitals` (`schemaVersion`, `generatedAt`, `region`, `notice`, `hospitals`), hata zarfı `{ error: { code, message } }`, `GET /api/v1/status`. Ayrıntı: `docs/SOZLESME.md`, `docs/hospitals.schema.json`.

### Testler ve araçlar
- `tests/run-unit.js`, `tests/unit.html`, `tests/contract.test.js`, `tests/ui.test.js`; `tools/mock-server.js`, `tools/check-contrast.js`, `tools/size-report.js`.

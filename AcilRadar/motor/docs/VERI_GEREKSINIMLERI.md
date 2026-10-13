# Doluluk motoru · Veri gereksinimleri

Hastaneden istenecek **en küçük veri seti**. Yalnız **toplu sayılar** istenir; hasta adı, T.C. kimlik numarası, tanı, yaş, cinsiyet gibi **hiçbir kişisel ya da hasta bazlı alan istenmez ve kabul edilmez (KVKK)**.

## 1. Gönderim biçimi

- **Sıklık:** en az 30 dakikada bir (önerilen 15 dk). Motor 30 dakikadan eski kayıtla **sayı üretmez** ("güncel bilgi yok").
- **Saat:** ISO 8601, Türkiye saati (`+03:00`). Sunucu saati esas alınır.
- **Kanal:** panel veri girişi (`panel/`) ya da hastane bilgi sisteminden otomatik aktarım (sözleşme: `docs/SOZLESME-PANEL.md`).

## 2. Alanlar

| Alan | Birim | Zorunlu mu | Neden gerekli | Olmazsa ne olur (düşüş basamağı) | KVKK notu |
|---|---|---|---|---|---|
| `timestamp` | ISO zaman | Evet | Bayatlık ve saat örüntüsü | Kayıt kullanılmaz | Kişisel veri değil |
| `hospitalId` | metin | Evet | Hastane eşlemesi | Kayıt kullanılmaz | Kurum kimliği |
| `greenWaiting` | kişi | Evet | Şu anki kuyruk (acil olmayan) | Biri yoksa 0 varsayılır, **güven düşer** (kısmi). İkisi de yoksa yalnız mevsimsel öncül (güven: düşük) | Toplu sayı |
| `yellowWaiting` | kişi | Evet | Şu anki kuyruk (daha acil) | Aynı | Toplu sayı |
| `activePhysicians` | kişi | Evet | Hizmet kapasitesi; kapasite tabanlı doluluğun paydası | Varsayılan 4 hekim, **güven düşer** (kısmi) | Toplu sayı; hekim adı istenmez |
| `arrivalsLastHour` | kişi/saat | Önerilir | Talep modelinin öğrenmesi, ani artış algısı | Bölge öncülü kullanılır (hekim × 2,4/saat — DOĞRULANMALI) | Toplu sayı |
| `boarding` | kişi | Önerilir | Yatış bekleyenlerin yatak tıkaması | Hekim × 0,3 varsayılır | Toplu sayı |
| `bedCapacity` | yatak/sedye | Önerilir | Doluluk tanımının paydası | Kapasite = hekim × 6 (**VARSAYIM**) | Kurum bilgisi |
| `inService` | kişi | İsteğe bağlı | Muayenedeki hasta sayısı | Hekim × 0,8 varsayılır | Toplu sayı |
| `physicianSchedule` | blok listesi | İsteğe bağlı | Vardiya değişiminde hekim sayısı | Hekim sayısı sabit kabul edilir | Kişi adı yok; yalnız sayı |
| `greenWaitObserved`, `yellowWaitObserved` | dk | Yalnız doğrulama | Pilotta gerçek bekleme ile karşılaştırma (kapıdan hekime süre, o 30 dk'da gelenlerin ortancası) | Bekleme doğruluğu ölçülemez (yalnız doluluk) | Toplu ortanca; tek hasta süresi gönderilmez |

Eksik alanlar çıktıda `assumedFields` listesinde **açıkça** belirtilir.

## 3. Örnek CSV (geriye dönük test için)

```
timestamp;hospitalId;greenWaiting;yellowWaiting;activePhysicians;arrivalsLastHour;boarding;bedCapacity;inService;greenWaitObserved;yellowWaitObserved
2026-05-18T10:00:00+03:00;ornek-01;14;4;7;19;3;30;6;22;4
2026-05-18T10:30:00+03:00;ornek-01;17;5;7;;3;30;7;28;6
```

- Ayırıcı `;` ya da `,` olabilir; UTF-8 (BOM'lu ya da BOM'suz).
- `arrivalsLastHour` yalnız saat başı satırlarında okunur (ör. 10:00 satırı = 09:00–10:00).
- Çalıştırma: `node motor/tools/backtest.js --csv veri.csv` → `motor/out/backtest-csv.json`.
- Bu yol **sentetik bir CSV** ile sınanmıştır (`--make-sample-csv`). Gerçek veriyle ilk çalıştırmada sütun adları ve saat biçimi doğrulanmalıdır.

## 4. Veri kalitesi kuralları (motor uygular)

| Durum | Davranış |
|---|---|
| Kayıt 30 dakikadan eski | Sayı üretilmez: `{ ok:true, level:"unknown", reason:"STALE" }` |
| Kayıt 5 dakikadan fazla gelecekte | Sayı üretilmez (`FUTURE`) |
| Sayı değil / negatif | Alan eksik sayılır, uyarı (`NOT_A_NUMBER`, `NEGATIVE`) |
| Kesirli | Yuvarlanır, uyarı (`ROUNDED`) |
| Üst sınırın üstü ya da hekim başına 60'tan fazla bekleyen | Sınırlanır, uyarı (`OUTLIER_CLAMPED`) — sessizce düzeltilmez |
| Hekim sayısı 0 | Varsayılan hekim, uyarı (`ZERO_PHYSICIANS`), güven düşer |

## 5. Pilot öncesi hastaneyle doğrulanacak varsayımlar

`motor/core/config.js` içinde **DOĞRULANMALI** etiketli değerler:

1. Sınıf payları (kırmızı/sarı/yeşil).
2. Muayene süreleri (sınıf başına ortanca).
3. Yatış oranı ve yatış bekleme süresi.
4. Hekim başına kapasite (`bedCapacity` yoksa).
5. Hekim başına saatlik başvuru öncülü.
6. Saatlik örüntü.

Bu değerler pilotun ilk iki haftasında hastanenin toplu verisiyle güncellenmelidir.

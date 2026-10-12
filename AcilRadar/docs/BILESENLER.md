# AcilRadar · Tasarım sistemi ve bileşen kataloğu

Tasarım dili: **"Sakin güven"** — ciddi bir kamu hizmeti ürünü; modern ama gösterişsiz, net ve sıcak.
Tüm değerler `css/tokens.css`'tedir; bileşenler yalnız jeton kullanır (sabit renk/ölçü yazılmaz).

## 1. Jetonlar

### Renk (açık tema · koyu tema)
Dağılım: ~%70 nötr, ~%20 lacivert/mavi, ~%10 vurgu ve durum rengi. Koyu tema yalnız sistem tercihiyle (`prefers-color-scheme: dark`) açılır ve aynı kontrast kurallarını sağlar.

| Jeton | Açık | Koyu | Kullanım |
|---|---|---|---|
| `--c-navy` | #0F2F55 | #0F2F55 | Logo, seçili yazı boyutu, adım numarası |
| `--c-blue` / `--c-primary` | #1565D8 | #1565D8 | Birincil düğme, başlangıç noktası |
| `--c-accent` | #0E7C86 | #5FC4CC | Bilgi bölümü simgeleri (az kullanılır) |
| `--c-bg` | #F3F6FA | #0D1726 | Sayfa zemini |
| `--c-surface` | #FFFFFF | #142236 | Kart, panel |
| `--c-surface-2` | #F7F9FC | #1A2B42 | Kutucuk, ayrıntı zemini |
| `--c-line` | #D6DFEA | #2A3D57 | Süs çizgisi (kart kenarı) |
| `--c-line-strong` | #6B7C93 | #8094B0 | Form öğesi sınırı (≥ 3:1) |
| `--c-text` | #14253A | #E8EEF5 | Ana yazı |
| `--c-text-2` | #4A5B70 | #B3C1D3 | İkincil yazı |
| `--c-link` | #1565D8 | #8CB7F5 | Bağlantı, açılır bölüm |
| `--c-danger` | #B3261E | #B3261E | 112 düğmesi |
| `--c-low-*` | #0B7A4B / #E6F4EC | #6FCF9C / #123426 | Az yoğun (yazı / zemin) |
| `--c-medium-*` | #9A5B00 / #FDF1DE | #EDB45A / #36270E | Orta yoğun |
| `--c-high-*` | #B3261E / #FDECEA | #FF9B91 / #3C1A1A | Çok yoğun |
| `--c-stale-*` | #4A5563 / #EEF1F5 | #BCC6D3 / #222F42 | Güncel bilgi yok |
| `--c-*-solid` | #0B7A4B · #9A5B00 · #B3261E · #5B6676 | aynı | İşaretçi ve sıra rozeti zemini (beyaz yazı) |
| `--c-*-line` | solid ile aynı | #4FB884 · #D49A3A · #F07C71 · #8C99AB | Kart şeridi, halka, seçili çip sınırı |
| `--c-info-bg` | #EAF1FB | #18304F | Bilgi zemini |
| `--c-warn-bg` | #FDECEA | #3C1A1A | Uyarı zemini (hayati tehlike, hata) |

### Tipografi
Sistem yazı tipi yığını (harici yazı tipi yok). Temel 18 px; ölçek **14 · 16 · 18 · 22 · 28 · 36** (`--fs-*`, büyükler `clamp()` ile akışkan). Başlık 750–800, gövde 400; satır aralığı 1,55; sayılarda `tabular-nums`; satır uzunluğu ≤ 70 karakter (`--measure`). Yazı boyutu kademeleri: A− 16 px · A 18 px · A+ 21 px.

### Boşluk, şekil, katman, hareket
| Grup | Değerler |
|---|---|
| Boşluk (4/8 ızgarası) | 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px (`--s-1`…`--s-8`); kenar boşluğu `clamp(16px, 4vw, 32px)` |
| Yarıçap | 12 · 16 · 24 px (`--r-1`…`--r-3`) |
| Gölge | 2 seviye, çok yumuşak (`--shadow-1`, `--shadow-2`) |
| Dokunma | En az 48 × 48 px (`--tap`) |
| Katman | harita `1` (kendi içinde yalıtılmış) · yapışkan üst çubuk `100` · içeriğe atla `200` |
| Hareket | 150 / 250 ms, ease-out; `prefers-reduced-motion`'da kapalı |

## 2. Kontrast tablosu (hesaplanmış)

`node tools/check-contrast.js --markdown` çıktısıdır; jeton değiştikçe yeniden üretin. Eşikler: ana metin 7:1 (hedef), normal metin 4,5:1, arayüz öğesi/sınır 3:1.

| Tema | Çift | Ön plan | Arka plan | Oran | Gereken | Sonuç |
|---|---|---|---|---|---|---|
| Açık | Ana metin / yüzey | #14253A | #FFFFFF | 15.49:1 | 7:1 | Geçti |
| Açık | Ana metin / zemin | #14253A | #F3F6FA | 14.29:1 | 7:1 | Geçti |
| Açık | Başlık / yüzey | #0F2F55 | #FFFFFF | 13.48:1 | 7:1 | Geçti |
| Açık | İkincil metin / yüzey | #4A5B70 | #FFFFFF | 6.95:1 | 4.5:1 | Geçti |
| Açık | İkincil metin / zemin | #4A5B70 | #F3F6FA | 6.41:1 | 4.5:1 | Geçti |
| Açık | İkincil metin / yüzey-2 | #4A5B70 | #F7F9FC | 6.59:1 | 4.5:1 | Geçti |
| Açık | Bağlantı / yüzey | #1565D8 | #FFFFFF | 5.41:1 | 4.5:1 | Geçti |
| Açık | Bağlantı / zemin | #1565D8 | #F3F6FA | 4.99:1 | 4.5:1 | Geçti |
| Açık | Bağlantı / yüzey-2 | #1565D8 | #F7F9FC | 5.13:1 | 4.5:1 | Geçti |
| Açık | Birincil düğme yazısı | #FFFFFF | #1565D8 | 5.41:1 | 4.5:1 | Geçti |
| Açık | Birincil düğme (üstüne gelme) | #FFFFFF | #0F52B5 | 7.26:1 | 4.5:1 | Geçti |
| Açık | Birincil düğme (basılı) | #FFFFFF | #0B4291 | 9.54:1 | 4.5:1 | Geçti |
| Açık | 112 düğmesi | #FFFFFF | #B3261E | 6.54:1 | 4.5:1 | Geçti |
| Açık | 112 düğmesi (üstüne gelme) | #FFFFFF | #8F1D17 | 8.91:1 | 4.5:1 | Geçti |
| Açık | Seçili segment/çip | #0F2F55 | #EAF1FB | 11.86:1 | 4.5:1 | Geçti |
| Açık | Seçili yazı boyutu düğmesi | #FFFFFF | #0F2F55 | 13.48:1 | 4.5:1 | Geçti |
| Açık | Az yoğun rozeti | #0B7A4B | #E6F4EC | 4.75:1 | 4.5:1 | Geçti |
| Açık | Orta yoğun rozeti | #9A5B00 | #FDF1DE | 4.86:1 | 4.5:1 | Geçti |
| Açık | Çok yoğun rozeti | #B3261E | #FDECEA | 5.72:1 | 4.5:1 | Geçti |
| Açık | Güncel bilgi yok rozeti | #4A5563 | #EEF1F5 | 6.69:1 | 4.5:1 | Geçti |
| Açık | Bilgi zemini | #0F2F55 | #EAF1FB | 11.86:1 | 4.5:1 | Geçti |
| Açık | Uyarı zemini (hayati tehlike, hata) | #8F1D17 | #FDECEA | 7.79:1 | 4.5:1 | Geçti |
| Açık | Ana metin / uyarı zemini | #14253A | #FDECEA | 13.55:1 | 4.5:1 | Geçti |
| Açık | İkincil metin / uyarı zemini (hata kutusu) | #4A5B70 | #FDECEA | 6.08:1 | 4.5:1 | Geçti |
| Açık | İkincil metin / bilgi zemini | #4A5B70 | #EAF1FB | 6.11:1 | 4.5:1 | Geçti |
| Açık | Örnek veri bandı | #5C3700 | #FDF1DE | 9.40:1 | 4.5:1 | Geçti |
| Açık | Çevrimdışı bandı | #FFFFFF | #14253A | 15.49:1 | 4.5:1 | Geçti |
| Açık | Altbilgi yazısı | #FFFFFF | #0F2F55 | 13.48:1 | 4.5:1 | Geçti |
| Açık | Altbilgi ikincil yazı | #C9D6E8 | #0F2F55 | 9.16:1 | 4.5:1 | Geçti |
| Açık | İşaretçi/sıra: az yoğun | #FFFFFF | #0B7A4B | 5.39:1 | 4.5:1 | Geçti |
| Açık | İşaretçi/sıra: orta yoğun | #FFFFFF | #9A5B00 | 5.43:1 | 4.5:1 | Geçti |
| Açık | İşaretçi/sıra: çok yoğun | #FFFFFF | #B3261E | 6.54:1 | 4.5:1 | Geçti |
| Açık | İşaretçi/sıra: güncel bilgi yok | #FFFFFF | #5B6676 | 5.82:1 | 4.5:1 | Geçti |
| Açık | Form sınırı / yüzey | #6B7C93 | #FFFFFF | 4.26:1 | 3:1 | Geçti |
| Açık | Form sınırı / zemin | #6B7C93 | #F3F6FA | 3.93:1 | 3:1 | Geçti |
| Açık | Seçili sınır, öneri kutusu / yüzey | #1565D8 | #FFFFFF | 5.41:1 | 3:1 | Geçti |
| Açık | Odak halkası / yüzey | #1565D8 | #FFFFFF | 5.41:1 | 3:1 | Geçti |
| Açık | Odak halkası / zemin | #1565D8 | #F3F6FA | 4.99:1 | 3:1 | Geçti |
| Açık | Hayati tehlike kutusu sınırı / zemin | #B3261E | #F3F6FA | 6.03:1 | 3:1 | Geçti |
| Açık | Durum şeridi/halka az / yüzey | #0B7A4B | #FFFFFF | 5.39:1 | 3:1 | Geçti |
| Açık | Durum şeridi/halka orta / yüzey | #9A5B00 | #FFFFFF | 5.43:1 | 3:1 | Geçti |
| Açık | Durum şeridi/halka çok / yüzey | #B3261E | #FFFFFF | 6.54:1 | 3:1 | Geçti |
| Açık | Durum şeridi eski / yüzey | #5B6676 | #FFFFFF | 5.82:1 | 3:1 | Geçti |
| Açık | Seçili çip sınırı az / az zemini | #0B7A4B | #E6F4EC | 4.75:1 | 3:1 | Geçti |
| Açık | Seçili çip sınırı orta / orta zemini | #9A5B00 | #FDF1DE | 4.86:1 | 3:1 | Geçti |
| Açık | Seçili çip sınırı çok / çok zemini | #B3261E | #FDECEA | 5.72:1 | 3:1 | Geçti |
| Koyu | Ana metin / yüzey | #E8EEF5 | #142236 | 13.71:1 | 7:1 | Geçti |
| Koyu | Ana metin / zemin | #E8EEF5 | #0D1726 | 15.40:1 | 7:1 | Geçti |
| Koyu | Başlık / yüzey | #F1F5FA | #142236 | 14.62:1 | 7:1 | Geçti |
| Koyu | İkincil metin / yüzey | #B3C1D3 | #142236 | 8.76:1 | 4.5:1 | Geçti |
| Koyu | İkincil metin / zemin | #B3C1D3 | #0D1726 | 9.84:1 | 4.5:1 | Geçti |
| Koyu | İkincil metin / yüzey-2 | #B3C1D3 | #1A2B42 | 7.82:1 | 4.5:1 | Geçti |
| Koyu | Bağlantı / yüzey | #8CB7F5 | #142236 | 7.78:1 | 4.5:1 | Geçti |
| Koyu | Bağlantı / zemin | #8CB7F5 | #0D1726 | 8.74:1 | 4.5:1 | Geçti |
| Koyu | Bağlantı / yüzey-2 | #8CB7F5 | #1A2B42 | 6.95:1 | 4.5:1 | Geçti |
| Koyu | Birincil düğme yazısı | #FFFFFF | #1565D8 | 5.41:1 | 4.5:1 | Geçti |
| Koyu | Birincil düğme (üstüne gelme) | #FFFFFF | #0F52B5 | 7.26:1 | 4.5:1 | Geçti |
| Koyu | Birincil düğme (basılı) | #FFFFFF | #0B4291 | 9.54:1 | 4.5:1 | Geçti |
| Koyu | 112 düğmesi | #FFFFFF | #B3261E | 6.54:1 | 4.5:1 | Geçti |
| Koyu | 112 düğmesi (üstüne gelme) | #FFFFFF | #8F1D17 | 8.91:1 | 4.5:1 | Geçti |
| Koyu | Seçili segment/çip | #DCE8FA | #18304F | 10.78:1 | 4.5:1 | Geçti |
| Koyu | Seçili yazı boyutu düğmesi | #FFFFFF | #0F2F55 | 13.48:1 | 4.5:1 | Geçti |
| Koyu | Az yoğun rozeti | #6FCF9C | #123426 | 7.17:1 | 4.5:1 | Geçti |
| Koyu | Orta yoğun rozeti | #EDB45A | #36270E | 7.76:1 | 4.5:1 | Geçti |
| Koyu | Çok yoğun rozeti | #FF9B91 | #3C1A1A | 7.64:1 | 4.5:1 | Geçti |
| Koyu | Güncel bilgi yok rozeti | #BCC6D3 | #222F42 | 7.83:1 | 4.5:1 | Geçti |
| Koyu | Bilgi zemini | #DCE8FA | #18304F | 10.78:1 | 4.5:1 | Geçti |
| Koyu | Uyarı zemini (hayati tehlike, hata) | #FFC2BC | #3C1A1A | 10.11:1 | 4.5:1 | Geçti |
| Koyu | Ana metin / uyarı zemini | #E8EEF5 | #3C1A1A | 13.27:1 | 4.5:1 | Geçti |
| Koyu | İkincil metin / uyarı zemini (hata kutusu) | #B3C1D3 | #3C1A1A | 8.48:1 | 4.5:1 | Geçti |
| Koyu | İkincil metin / bilgi zemini | #B3C1D3 | #18304F | 7.29:1 | 4.5:1 | Geçti |
| Koyu | Örnek veri bandı | #F6D39A | #36270E | 10.12:1 | 4.5:1 | Geçti |
| Koyu | Çevrimdışı bandı | #14253A | #E8EEF5 | 13.26:1 | 4.5:1 | Geçti |
| Koyu | Altbilgi yazısı | #FFFFFF | #0A1320 | 18.63:1 | 4.5:1 | Geçti |
| Koyu | Altbilgi ikincil yazı | #B3C1D3 | #0A1320 | 10.19:1 | 4.5:1 | Geçti |
| Koyu | İşaretçi/sıra: az yoğun | #FFFFFF | #0B7A4B | 5.39:1 | 4.5:1 | Geçti |
| Koyu | İşaretçi/sıra: orta yoğun | #FFFFFF | #9A5B00 | 5.43:1 | 4.5:1 | Geçti |
| Koyu | İşaretçi/sıra: çok yoğun | #FFFFFF | #B3261E | 6.54:1 | 4.5:1 | Geçti |
| Koyu | İşaretçi/sıra: güncel bilgi yok | #FFFFFF | #5B6676 | 5.82:1 | 4.5:1 | Geçti |
| Koyu | Form sınırı / yüzey | #8094B0 | #142236 | 5.17:1 | 3:1 | Geçti |
| Koyu | Form sınırı / zemin | #8094B0 | #0D1726 | 5.81:1 | 3:1 | Geçti |
| Koyu | Seçili sınır, öneri kutusu / yüzey | #8CB7F5 | #142236 | 7.78:1 | 3:1 | Geçti |
| Koyu | Odak halkası / yüzey | #8CB7F5 | #142236 | 7.78:1 | 3:1 | Geçti |
| Koyu | Odak halkası / zemin | #8CB7F5 | #0D1726 | 8.74:1 | 3:1 | Geçti |
| Koyu | Hayati tehlike kutusu sınırı / zemin | #F07C71 | #0D1726 | 6.70:1 | 3:1 | Geçti |
| Koyu | Durum şeridi/halka az / yüzey | #4FB884 | #142236 | 6.50:1 | 3:1 | Geçti |
| Koyu | Durum şeridi/halka orta / yüzey | #D49A3A | #142236 | 6.47:1 | 3:1 | Geçti |
| Koyu | Durum şeridi/halka çok / yüzey | #F07C71 | #142236 | 5.97:1 | 3:1 | Geçti |
| Koyu | Durum şeridi eski / yüzey | #8C99AB | #142236 | 5.53:1 | 3:1 | Geçti |
| Koyu | Seçili çip sınırı az / az zemini | #4FB884 | #123426 | 5.52:1 | 3:1 | Geçti |
| Koyu | Seçili çip sınırı orta / orta zemini | #D49A3A | #36270E | 5.84:1 | 3:1 | Geçti |
| Koyu | Seçili çip sınırı çok / çok zemini | #F07C71 | #3C1A1A | 5.78:1 | 3:1 | Geçti |

## 3. Bileşenler

Her bileşen için durumlar: **normal · üstüne gelme · odak · basılı · devre dışı · hata**. Odak her yerde 3 px `--c-focus` halkası + 3 px boşluktur.

### 3.1 Düğme (3 stil + tehlike)
| Stil | Görünüm | Ne zaman |
|---|---|---|
| `btn--primary` | Mavi zemin, beyaz yazı | Ekranda **tek** ana eylem: "Yol tarifi al" |
| `btn--secondary` | Beyaz zemin, güçlü sınır | İkincil eylem: "Konumumu kullan", "Haritada göster", "Tekrar dene" |
| `btn--ghost` | Zeminsiz, bağlantı rengi | Üçüncül eylem: "Bilgileri yenile", "Filtreleri temizle" |
| `btn--danger` | Kırmızı zemin, beyaz yazı | **Yalnız 112** için |

Durumlar: üstüne gelme → koyulaşır; basılı → bir ton daha koyu; odak → halka; devre dışı → %60 opaklık + `cursor: not-allowed` (ör. konum alınırken); meşgul → `aria-busy="true"`.
Kural: Simge + yazı birlikte; yalnız simgeli düğmede `aria-label` zorunlu. En az 48 px.

### 3.2 Durum rozeti (`badge`)
Renk + yazı + simge birlikte (Az yoğun ✓, Orta yoğun –, Çok yoğun ⚠, Güncel bilgi yok ◷). Kural: durum **asla yalnız renkle** verilmez.

### 3.3 Hastane kartı (`card`)
Sol kenarda durum şeridi; sıra no (haritadaki numarayla aynı) + ad + ilçe · mesafe · yol süresi; etiketler (En kısa toplam süre · Çocuk acili var · Öngörü · Örnek veri); sağda doluluk halkası; durum rozeti; büyük **"Tahmini toplam süre: 35–50 dk."** (daima aralık); Yol / Bekleme / Hekim kutucukları; "Ayrıntılar" açılır bölümü; "Yol tarifi al" (+ harita varsa "Haritada göster").
Durumlar: normal · vurgulu (işaretçiyle eşleşince mavi çerçeve) · odak · **eski veri** (şerit gri, süre/halka/kutucuk yerine "Bu hastane için güncel bilgi yok.").
Kural: Uzun ad alta iner, kesilmez (`overflow-wrap: anywhere`); "3–4 dk." gibi parçalar bölünmez. Yazdırırken bölünmez.

### 3.4 Halka gösterge (`ring`)
`conic-gradient` ile doluluk yüzdesi; ortada "%62" yazısı; `role="img"` + `aria-label="Doluluk %62"`. Eski veride çizilmez. Zorunlu renk kipinde çerçeve + yazı kalır.

### 3.5 Açılır bölüm (`disclosure`)
`<button aria-expanded aria-controls>` + ok simgesi (açıkken döner). Hayati tehlike kutusu ve "Süre nasıl hesaplanıyor?" **varsayılan kapalı**. Kural: içerik hiçbir zaman ekranı kaplamaz; modal yoktur.

### 3.6 Bant (`banner`)
| Tür | Ne zaman |
|---|---|
| Örnek veri | Yanıtta `dataSource: "simulated"` kayıt varsa; gerçek veri gelince kendiliğinden kalkar |
| Çevrimdışı | `navigator.onLine === false`; otomatik yenileme durur |
| Duyuru (bilgi/uyarı) | Sunucu `notice` gönderirse; metin `textContent` ile yazılır, en çok 300 karakter |

### 3.7 İskelet (`skeleton`)
İlk yüklemede 3 iskelet kart; gerçek kartla aynı yüksekliği ayırır (düzen kayması olmaz). Liste `aria-busy="true"`; ekran okuyucuya tek bir "yükleniyor" duyurusu yapılır.

### 3.8 Boş durum (`state--neutral`)
"Bu bölge için şu an acil servis bilgisi yok." (veri yok) · "Seçimlerinize uyan acil servis yok." + "Filtreleri temizle" (filtre sonucu boş).

### 3.9 Hata durumu (`state--error`, `state--warning`)
Veri hiç yoksa kırmızı çerçeveli kutu + "Tekrar dene". Eski veri hâlâ gösteriliyorsa turuncu şeritli kısa uyarı ("Bilgiler yenilenemedi; son alınan bilgiler gösteriliyor."). Metin hata **koduna** göre `strings.js › errors.codes`'tan gelir.

### 3.10 Seçim kutusu (`select.input`) ve arama alanı
Etiket her zaman görünür (`<label for>`); sınır `--c-line-strong` (≥ 3:1); üstüne gelince mavi sınır. Arama alanında büyüteç simgesi süstür; altında kısa ipucu (`aria-describedby`). Konum durumu `role="status"` ile duyurulur; hata tonu uyarı zemini.

### 3.11 Segment kontrol (`segment`)
Görünüşte bölümlü düğme, davranışta **radyo düğmesi** (klavyede ok tuşları çalışır). Seçili olan mavi sınır + açık mavi zemin + **nokta işareti** (yalnız renk değil). Devre dışı (ör. "Akşam 20:00 (bugün için geçti)") kesikli sınır.

### 3.12 Çip (`chip`)
Aç/kapa filtre (`aria-pressed`). Yoğunluk çiplerinde seçilince durum rengi + simge.

### 3.13 Harita işaretçisi (`marker`)
36 px daire, koyu durum rengi, beyaz numara (listedeki sırayla aynı), beyaz kenar + lacivert dış çizgi → hem açık karoda hem koyu temada okunur. Vurgulanınca büyür ve odak rengiyle çevrelenir. Başlangıç noktası: mavi nokta. İşaretçiler sekme sırasına alınmaz; klavyeyle "Haritada göster" kullanılır.

### 3.14 Harita açıklaması (`legend`)
Renk noktası + yazı (Az · Orta · Çok yoğun · Güncel bilgi yok · Başlangıç noktası). "© OpenStreetMap contributors" atfı haritada her zaman görünür. Harita yüklenemezse yerine sakin bilgi kutusu.

### 3.15 Öneri kutusu (`pick`)
"Seçimlerinize göre tahmini toplam süresi en kısa" + ad + aralık + rozet + "Tavsiye değil, tahmindir." + "Yol tarifi al". "En iyi" gibi değer yargısı yoktur. Güncel bilgisi olan hastane yoksa açıklayıcı bir cümle gösterir.

## 4. Genel kurallar
- Yasak: neon, cam efekti, 3B, hareketli arka plan, parıltı, aşırı degrade, emoji, stok fotoğraf, "canlı/anlık/gerçek zamanlı", "en iyi".
- Her ekranda "Bu bilgiler tahminidir. Muayene sırasını triyaj belirler. Tıbbi karar aracı değildir." ve erişilebilir 112.
- Yaş grubuna işaret eden ifade/görsel yoktur; okunaklılık herkes için temel kalitedir.

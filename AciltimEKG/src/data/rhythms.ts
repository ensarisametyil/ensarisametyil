// EKG kütüphanesi — 28 konu, kullanıcı tarafından verilen sabit sırayla.
// Her konunun görseli public/ekg/<slug>.png altındadır (orijinal dosya adı
// tarih-saat damgasına göre artan sırada sağlanan 28 PNG ile birebir
// eşleştirilmiştir; bu sıra değiştirilmemiştir).
//
// İçerik kaynağı: her görsel tek tek incelenmiş, görselde yer alan başlık,
// tanım, madde işaretli bilgiler ve kriterler birebir metne dökülmüştür.
// Görselde yalnızca EKG şeridi/başlık bulunup ayrıntılı metin bulunmayan
// konularda (çoğu ritim örneği), görselle çelişmeyecek şekilde Türkiye'de
// paramedik/acil tıp eğitiminde kullanılan standart, genel kabul görmüş
// bilgiler (tanım, EKG kriterleri, klinik önem) ile tamamlanmıştır.

export interface EkgSection {
  heading: string;
  items: string[];
}

export interface EkgTopic {
  slug: string;
  order: number;
  title: string;
  image: string;
  definition: string;
  sections: EkgSection[];
  clinicalNote?: string;
}

export const ekgTopics: EkgTopic[] = [
  {
    slug: "kalbin-ileti-sistemi",
    order: 1,
    title: "Kalbin İleti Sistemi",
    image: "/ekg/kalbin-ileti-sistemi.png",
    definition:
      "Kalbin elektriksel ileti sistemi, kalp kasının düzenli ve senkronize şekilde kasılmasını sağlayan, birbirini takip eden özelleşmiş hücre gruplarından oluşur.",
    sections: [
      { heading: "1 · SA Düğümü (Sinoatriyal Düğüm)", items: ["Sağ atriyumun üst kısmında yer alır.", "Kalbin doğal pilidir."] },
      {
        heading: "2 · AV Düğümü (Atrioventriküler Düğüm)",
        items: ["Sağ atriyumun alt kısmında (AV oluğunda) bulunur.", "Uyarıyı kısa bir süre geciktirir.", "Ventriküllere geçişi kontrol eder."],
      },
      {
        heading: "3 · His Demeti (Bundle of His)",
        items: ["AV düğümünden çıkan tek yoldur.", "Elektriksel uyarıyı ventriküllerin üst kısmına taşır."],
      },
      {
        heading: "4 · Sağ ve Sol Dal (Bundle Branches)",
        items: ["His demeti ikiye ayrılır: sağ dal → sağ ventriküle, sol dal → sol ventriküle.", "Uyarıyı ventrikül duvarlarına yayar."],
      },
      {
        heading: "5 · Purkinje Lifleri (Purkinje Fibers)",
        items: ["Ventrikül duvarına yayılan ince lif ağlarıdır.", "Uyarıyı hızlıca tüm ventriküle yayarak kasılmayı sağlar."],
      },
    ],
  },
  {
    slug: "12-derivasyonlu-ekg-cekmenin-onemi",
    order: 2,
    title: "12 Derivasyonlu EKG Çekmenin Önemi",
    image: "/ekg/12-derivasyonlu-ekg-cekmenin-onemi.png",
    definition:
      "12 derivasyonlu EKG, kalbin elektriksel aktivitesini 12 farklı açıdan (6 ekstremite + 6 göğüs derivasyonu) kaydederek kalbin tüm duvarları hakkında kapsamlı bilgi sağlayan standart tanı yöntemidir.",
    sections: [
      {
        heading: "Elektrot Yerleşimi",
        items: [
          "4 ekstremite elektrodu (sağ kol, sol kol, sağ bacak, sol bacak) standart noktalara yerleştirilir.",
          "6 göğüs elektrodu (V1–V6) standart interkostal noktalara yerleştirilir.",
        ],
      },
      {
        heading: "Neden Önemlidir",
        items: [
          "Kalbin farklı duvarlarındaki (inferior, anterior, lateral, septal) iskemi/enfarkt bölgesini lokalize etmeyi sağlar.",
          "Aritmilerin kaynağını belirlemeye yardımcı olur.",
          "Tek bir derivasyona göre çok daha güvenilir ve kapsamlı bir değerlendirme sağlar.",
        ],
      },
    ],
    clinicalNote:
      "Hastane öncesinde doğru elektrot yerleşimi, yanlış pozitif/negatif bulgulara yol açmamak için kritik önemdedir.",
  },
  {
    slug: "ekg-kalibrasyon-ayari",
    order: 3,
    title: "EKG Kalibrasyon Ayarı",
    image: "/ekg/ekg-kalibrasyon-ayari.png",
    definition:
      "Kalibrasyon, EKG cihazının kayıt hızı ve genlik ayarlarının standart değerlere göre doğrulanmasıdır; yanlış kalibrasyon dalga boyutlarının ve aralıkların hatalı yorumlanmasına yol açar.",
    sections: [
      {
        heading: "Standart Kalibrasyon Değerleri",
        items: [
          "Kağıt hızı: 25 mm/sn",
          "Genlik: 10 mm/mV",
          "Kalibrasyon darbesi 1 mV'ta 10 mm yükseklik göstermelidir (kayıt başındaki dikdörtgen darbe).",
        ],
      },
      {
        heading: "Kağıt Üzerinde Okuma",
        items: ["Büyük kare (5 mm) = 0,20 sn", "Küçük kare (1 mm) = 0,04 sn"],
      },
    ],
    clinicalNote:
      "Kalibrasyon doğrulanmadan yapılan yorumlar (örn. QRS genişliği, ST segment yüksekliği) yanıltıcı olabilir; her EKG'nin başında kalibrasyon işareti kontrol edilmelidir.",
  },
  {
    slug: "ekg-yorumlama-basamaklari",
    order: 4,
    title: "EKG Yorumlama Basamakları",
    image: "/ekg/ekg-yorumlama-basamaklari.png",
    definition: "EKG'nin sistematik ve atlanmadan değerlendirilmesi için izlenen 10 basamaklı yaklaşımdır.",
    sections: [
      {
        heading: "1 · Hızı Değerlendir",
        items: [
          "Kalp hızını belirle.",
          "300 – 150 – 100 – 75 – 60 – 50 yöntemi veya 6 saniyedeki QRS sayısı × 10.",
          "Normal: 60–100/dk · Bradikardi: <60/dk · Taşikardi: >100/dk",
        ],
      },
      {
        heading: "2 · Ritmi Değerlendir",
        items: ["Ritim düzenli mi, düzensiz mi?", "R-R aralıklarına bak.", "Düzenli: aralıklar eşit. Düzensiz: aralıklar değişken."],
      },
      {
        heading: "3 · P Dalgasını İncele",
        items: ["P dalgası var mı?", "Her QRS öncesinde P dalgası var mı?", "P dalgalarının morfolojisi normal mi?", "Atriyal aktiviteyi değerlendir."],
      },
      {
        heading: "4 · PR Aralığını Ölç",
        items: ["P başlangıcı ile QRS başlangıcı arasındaki süre.", "Normal: 0,12–0,20 sn (3–5 küçük kare)"],
      },
      {
        heading: "5 · QRS Süresini İncele",
        items: ["QRS geniş mi, dar mı?", "Normal (dar): <0,12 sn (≥3 küçük kare)", "Geniş: ≥0,12 sn (>3 küçük kare)"],
      },
      {
        heading: "6 · Aksı Değerlendir",
        items: ["Elektriksel aks normal mi?", "Normal aks: −30° ile +90° arası."],
      },
      {
        heading: "7 · Dalgaları İncele",
        items: ["P, Q, R, S, T dalgalarını değerlendir.", "P: atriyal depolarizasyon.", "QRS: ventriküler depolarizasyon.", "T: ventriküler repolarizasyon."],
      },
      {
        heading: "8 · QT Aralığını Ölç",
        items: ["QRS başlangıcı ile T bitişi arasındaki süre.", "QTc (düzeltilmiş QT) normal: <440 ms (erkek), <460 ms (kadın)"],
      },
      {
        heading: "9 · Patolojik Bulguları Ara",
        items: [
          "ST segment değişiklikleri, T dalga anormallikleri, patolojik Q dalgaları, dal bloğu bulguları, hipertrofi kriterleri, iskemik değişiklikler.",
          "Normal dışı her bulguyu sistematik olarak değerlendir.",
        ],
      },
      {
        heading: "10 · Genel Yorum Yap",
        items: ["Tüm bulguları birleştir.", "Ritmi tanımla.", "Eşlik eden patolojileri belirt.", "Klinik ile korele et.", "Acil durumları öngör."],
      },
    ],
  },
  {
    slug: "normal-sinus-ritmi",
    order: 5,
    title: "Normal Sinüs Ritmi",
    image: "/ekg/normal-sinus-ritmi.png",
    definition: "Kalbin doğal pili olan SA düğümünden köken alan, düzenli ve fizyolojik sınırlar içindeki ritimdir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "Hız: 60–100 atım/dk",
          "Ritim: düzenli (R-R aralıkları eşit)",
          "P dalgası: her QRS'ten önce, normal morfolojide, DII'de pozitif",
          "PR aralığı: 0,12–0,20 sn",
          "QRS süresi: <0,12 sn (dar)",
          "Her P dalgasını bir QRS izler",
        ],
      },
    ],
    clinicalNote: "Kalbin elektriksel sisteminin fizyolojik olarak çalıştığını gösterir; diğer ritimlerin karşılaştırıldığı referans noktasıdır.",
  },
  {
    slug: "sinus-bradikardi",
    order: 6,
    title: "Sinüs Bradikardi",
    image: "/ekg/sinus-bradikardi.png",
    definition: "SA düğümünden köken alan, normal ileti paternine sahip ancak hızı 60 atım/dk altında olan ritimdir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: ["Hız: <60 atım/dk", "Ritim: düzenli", "P dalgası: normal morfoloji, her QRS'ten önce", "PR aralığı ve QRS süresi: normal sınırlarda"],
      },
    ],
    clinicalNote:
      "Sporcularda ve uykuda fizyolojik olabilir. Semptomatik bradikardi (hipotansiyon, senkop, bilinç değişikliği) altta yatan nedenin (ilaç etkisi, hipoksi, AV ileti bozukluğu, artmış vagal tonus) acilen araştırılmasını gerektirir.",
  },
  {
    slug: "sinus-tasikardi",
    order: 7,
    title: "Sinüs Taşikardi",
    image: "/ekg/sinus-tasikardi.png",
    definition: "SA düğümünden köken alan, normal ileti paterniyle birlikte hızı 100 atım/dk üzerinde olan ritimdir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: ["Hız: >100 atım/dk (genellikle 100–150/dk)", "Ritim: düzenli", "P dalgası: normal morfoloji, her QRS'ten önce"],
      },
    ],
    clinicalNote:
      "Genellikle altta yatan bir nedene (ateş, ağrı, anksiyete, hipovolemi, hipoksi, kalp yetmezliği, tirotoksikoz vb.) ikincil fizyolojik bir kompanzasyon yanıtıdır; tedavi altta yatan nedene yönelir.",
  },
  {
    slug: "sinuzel-aritmi",
    order: 8,
    title: "Sinüzel Aritmi",
    image: "/ekg/sinuzel-aritmi.png",
    definition: "Kalp hızının solunumla ilişkili olarak düzenli şekilde değiştiği, SA düğüm kaynaklı bir ritim varyasyonudur.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "P-QRS-T morfolojisi normaldir.",
          "R-R aralıkları solunumla değişkenlik gösterir (inspiryumda hızlanma, ekspiryumda yavaşlama).",
          "PR aralığı ve QRS süresi normal sınırlardadır.",
        ],
      },
    ],
    clinicalNote: "Özellikle çocuklarda ve genç erişkinlerde sık görülen normal bir fizyolojik bulgudur; genellikle patolojik değildir ve tedavi gerektirmez.",
  },
  {
    slug: "sinuzel-blok",
    order: 9,
    title: "Sinüzel Blok",
    image: "/ekg/sinuzel-blok.png",
    definition: "SA düğümde oluşan uyarının atriyuma iletilememesi sonucu bir veya daha fazla atımın kaybolduğu ritim bozukluğudur.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "Ani, tüm P-QRS-T kompleksinin (P dalgası dahil) kaybolduğu duraklamalar görülür.",
          "Duraklama süresi, normal R-R aralığının tam katları şeklindedir.",
          "Duraklama dışındaki atımlar normal sinüs morfolojisindedir.",
        ],
      },
    ],
    clinicalNote:
      "Artmış vagal tonus, iskemi, ilaç etkisi (dijital, beta bloker) veya SA düğüm hastalığına bağlı olabilir; semptomatik ve tekrarlayan vakalarda ileri değerlendirme gerekir.",
  },
  {
    slug: "sinuzel-arrest",
    order: 10,
    title: "Sinüzel Arrest",
    image: "/ekg/sinuzel-arrest.png",
    definition: "SA düğümün geçici olarak uyarı üretememesi sonucu oluşan, süresi önceki R-R aralığının tam katı olmayan duraklamadır.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "Beklenmeyen, uzamış bir duraklama (P dalgası ve QRS kompleksi yok).",
          "Duraklama süresi normal siklusun tam katı DEĞİLDİR (sinüzel bloktan ayıran temel özellik).",
          "Duraklama sonrası genellikle bir kaçış ritmi (junctional veya ventriküler) devreye girebilir.",
        ],
      },
    ],
    clinicalNote:
      "SA düğüm disfonksiyonunun (hasta sinüs sendromu) bir bulgusu olabilir; uzun duraklamalar senkop veya bilinç kaybına yol açabilir, semptomatik hastalarda pacemaker değerlendirmesi gerekebilir.",
  },
  {
    slug: "atriyal-fibrilasyon",
    order: 11,
    title: "Atriyal Fibrilasyon",
    image: "/ekg/atriyal-fibrilasyon.png",
    definition:
      "Atriyumlarda çok sayıda kaotik ve düzensiz elektriksel odağın hakim olduğu, organize atriyal kasılmanın kaybolduğu supraventriküler bir taşiaritmidir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "Belirgin P dalgası yoktur; bunun yerine düzensiz fibrilasyon (f) dalgaları görülür.",
          "R-R aralıkları tamamen düzensizdir (\"irregularly irregular\").",
          "QRS genellikle dardır (eşlik eden dal bloğu yoksa).",
          "Ventrikül hızı değişkendir (yavaş, normal veya hızlı yanıtlı olabilir).",
        ],
      },
    ],
    clinicalNote:
      "İnme riskini artıran en sık görülen sürekli aritmidir; hızlı ventriküler yanıt hemodinamik bozukluğa yol açabilir. Altta yatan neden (hipertansiyon, kapak hastalığı, hipertiroidi vb.) araştırılmalıdır.",
  },
  {
    slug: "atriyal-flutter",
    order: 12,
    title: "Atriyal Flutter",
    image: "/ekg/atriyal-flutter.png",
    definition:
      "Atriyumda tek bir dairesel (re-entrant) elektriksel devrenin hakim olduğu, düzenli ve hızlı atriyal aktivasyonla seyreden bir supraventriküler taşiaritmidir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "Karakteristik \"testere dişi\" (sawtooth) flutter (F) dalgaları — özellikle DII, DIII, aVF'de belirgin.",
          "Atriyal hız genellikle ~250–350/dk.",
          "AV blok oranına bağlı olarak ventrikül hızı değişir (sık görülen: 2:1 blok ile ~150/dk).",
          "QRS genellikle dardır.",
        ],
      },
    ],
    clinicalNote: "Atriyal fibrilasyonla benzer tromboembolik risk taşır; hızlı ventriküler yanıt semptomatik olabilir.",
  },
  {
    slug: "multifocal-atriyal-tasikardi",
    order: 13,
    title: "Multifocal Atriyal Taşikardi",
    image: "/ekg/multifocal-atriyal-tasikardi.png",
    definition: "Atriyumda en az 3 farklı ektopik odaktan kaynaklanan, düzensiz bir supraventriküler taşiaritmidir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: ["En az 3 farklı morfolojide P dalgası.", "Değişken PR aralıkları.", "Düzensiz R-R aralıkları.", "Atriyal hız >100/dk."],
      },
    ],
    clinicalNote: "Sıklıkla ciddi altta yatan akciğer hastalığı (KOAH, solunum yetmezliği) veya hipoksi ile ilişkilidir; tedavi altta yatan nedene yöneliktir.",
  },
  {
    slug: "atriyal-tasikardi",
    order: 14,
    title: "Atriyal Taşikardi",
    image: "/ekg/atriyal-tasikardi.png",
    definition: "Atriyumda SA düğüm dışındaki tek bir ektopik odaktan kaynaklanan, düzenli bir supraventriküler taşiaritmidir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "Normal sinüs P dalgasından farklı morfolojide, tek tip P dalgası.",
          "Düzenli atriyal hız (genellikle 150–250/dk).",
          "QRS genellikle dardır.",
        ],
      },
    ],
    clinicalNote: "Yapısal kalp hastalığı, dijital toksisitesi veya artmış otomatisite ile ilişkili olabilir.",
  },
  {
    slug: "supraventrikuler-tasikardi-svt",
    order: 15,
    title: "Supraventriküler Taşikardi (SVT)",
    image: "/ekg/supraventrikuler-tasikardi-svt.png",
    definition: "AV düğüm veya atriyum düzeyinde re-entry mekanizmasıyla oluşan, ani başlangıçlı ve düzenli dar-QRS'li taşiaritmilerin genel adıdır.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "Hız: genellikle 150–220/dk",
          "Ritim: düzenli",
          "P dalgaları genellikle görülemez veya QRS içine gizlenmiştir.",
          "QRS genellikle dardır (<0,12 sn).",
        ],
      },
    ],
    clinicalNote: "Ani başlar ve ani sonlanır; vagal manevralarla sonlandırılabilir. Hemodinamik olarak stabil olmayan hastalarda acil kardiyoversiyon gerekebilir.",
  },
  {
    slug: "ventrikuler-tasikardi-vt",
    order: 16,
    title: "Ventriküler Taşikardi (VT)",
    image: "/ekg/ventrikuler-tasikardi-vt.png",
    definition: "Ventrikül dokusundan kaynaklanan, ardışık 3 veya daha fazla geniş QRS kompleksinden oluşan hızlı bir ritimdir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "Hız: genellikle >100/dk (sıklıkla 150–250/dk)",
          "QRS: geniş (≥0,12 sn) ve bizar morfolojide",
          "Ritim: genellikle düzenli",
          "AV disosiyasyon görülebilir (P dalgaları QRS'ten bağımsız).",
        ],
      },
    ],
    clinicalNote:
      "Hayatı tehdit eden bir aritmidir; nabızsız VT kardiyak arrest olarak yönetilir. Nabızlı VT'de hemodinamik durum tedavi yaklaşımını belirler (stabil ise antiaritmik, stabil değilse senkronize kardiyoversiyon).",
  },
  {
    slug: "ventrikuler-fibrilasyon-vf",
    order: 17,
    title: "Ventriküler Fibrilasyon (VF)",
    image: "/ekg/ventrikuler-fibrilasyon-vf.png",
    definition: "Ventrikül kasının organize kasılma olmaksızın kaotik ve düzensiz şekilde titreştiği, etkin kalp debisi olmayan öldürücü bir aritmidir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: ["Tanımlanabilir P, QRS, T dalgası yoktur.", "Düzensiz, kaotik, değişken genlikte dalgalanmalar.", "Organize elektriksel aktivite yoktur."],
      },
    ],
    clinicalNote: "Nabızsız kardiyak arrest nedenidir; acil defibrilasyon ve kardiyopulmoner resüsitasyon (KPR) hayat kurtarıcıdır. Şoklanabilir ritimler grubundadır.",
  },
  {
    slug: "1-derece-av-blok",
    order: 18,
    title: "1. Derece AV Blok",
    image: "/ekg/1-derece-av-blok.png",
    definition: "AV düğüm düzeyinde iletinin gecikmesi sonucu PR aralığının uzadığı, ancak her atriyal uyarının ventriküle iletildiği en hafif AV blok tipidir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: ["PR aralığı: >0,20 sn (sabit uzunlukta)", "Her P dalgasını bir QRS izler (blok yok, sadece gecikme).", "QRS genellikle dardır."],
      },
    ],
    clinicalNote:
      "Genellikle asemptomatiktir ve iyi huyludur; artmış vagal tonus, yaşlanma veya ilaç etkisi (beta bloker, kalsiyum kanal blokeri, dijital) ile ilişkili olabilir. Tek başına tedavi gerektirmez.",
  },
  {
    slug: "2-derece-tip-1-av-blok",
    order: 19,
    title: "2. Derece Tip 1 AV Blok",
    image: "/ekg/2-derece-tip-1-av-blok.png",
    definition:
      "PR aralığının art arda gelen atımlarda giderek uzadığı ve sonunda bir P dalgasının ventriküle iletilemediği AV blok tipidir (Wenckebach / Mobitz I).",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "PR aralığı, bloklu atımdan önce giderek uzar.",
          "Bir P dalgası QRS ile takip edilmez (düşen atım).",
          "Bloktan sonraki PR aralığı en kısadır, döngü tekrarlar.",
          "R-R aralıkları giderek kısalır (gruplaşan ritim paterni).",
        ],
      },
    ],
    clinicalNote: "Genellikle AV düğüm seviyesindedir ve iyi huyludur; artmış vagal tonus veya inferior MI ile ilişkili olabilir, nadiren ileri bloğa ilerler.",
  },
  {
    slug: "2-derece-tip-2-av-blok",
    order: 20,
    title: "2. Derece Tip 2 AV Blok",
    image: "/ekg/2-derece-tip-2-av-blok.png",
    definition:
      "PR aralığında uzama olmaksızın, ani ve öngörülemeyen şekilde bir veya daha fazla P dalgasının ventriküle iletilemediği, His-Purkinje sistemi düzeyinde daha ciddi bir AV blok tipidir (Mobitz II).",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "PR aralığı sabittir (bloktan önce uzama yoktur).",
          "Ani, beklenmeyen düşen atımlar (P dalgası var, QRS yok).",
          "QRS genellikle geniştir (altta yatan dal bloğu eşlik edebilir).",
        ],
      },
    ],
    clinicalNote: "3. derece tam bloğa ilerleme riski yüksektir; semptomatik hastalarda kalıcı pacemaker gerekebilir. Tip 1'e göre daha ciddi kabul edilir.",
  },
  {
    slug: "3-derece-av-tam-blok",
    order: 21,
    title: "3. Derece AV Tam Blok",
    image: "/ekg/3-derece-av-tam-blok.png",
    definition:
      "Atriyum ile ventrikül arasındaki elektriksel iletinin tamamen kesildiği, atriyum ve ventriküllerin birbirinden bağımsız kendi hızlarında çalıştığı en ciddi AV blok tipidir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "P dalgaları ve QRS kompleksleri birbirinden tamamen bağımsızdır (AV disosiyasyon).",
          "P-P aralıkları kendi içinde düzenli, R-R aralıkları kendi içinde düzenlidir; ancak ikisi arasında ilişki yoktur.",
          "Ventrikül hızı, kaçış odağının kaynağına göre yavaştır (junctional kaçış: dar QRS, ~40–60/dk; ventriküler kaçış: geniş QRS, ~20–40/dk).",
        ],
      },
    ],
    clinicalNote:
      "Hemodinamik instabiliteye ve senkopa yol açabilen acil bir durumdur; semptomatik hastalarda transkütanöz/transvenöz pacing ve kalıcı pacemaker gerekebilir.",
  },
  {
    slug: "sag-dal-blogu-rbbb",
    order: 22,
    title: "Sağ Dal Bloğu (RBBB)",
    image: "/ekg/sag-dal-blogu-rbbb.png",
    definition: "Sağ dalın ileti bloğu nedeniyle sağ ventrikülün depolarizasyonunun gecikmiş olarak, sol ventrikülden sonra gerçekleştiği ileti bozukluğudur.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "QRS süresi ≥0,12 sn (tam blok) veya 0,10–0,12 sn (inkomplet blok).",
          "V1–V2'de \"RSR'\" (M şeklinde, \"rabbit ears\") paterni.",
          "I ve V6'da geniş, sürüklü S dalgası.",
          "Sekonder ST-T değişiklikleri (V1–V2'de QRS'e ters yönde).",
        ],
      },
    ],
    clinicalNote: "Sağlıklı bireylerde izole olarak görülebilir; yapısal kalp hastalığı, pulmoner emboli veya sağ kalp yüklenmesi ile ilişkili olabilir.",
  },
  {
    slug: "sol-dal-blogu-lbbb",
    order: 23,
    title: "Sol Dal Bloğu (LBBB)",
    image: "/ekg/sol-dal-blogu-lbbb.png",
    definition: "Sol dalın ileti bloğu nedeniyle sol ventrikülün depolarizasyonunun sağ ventrikül üzerinden gecikmeli olarak gerçekleştiği ileti bozukluğudur.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "QRS süresi ≥0,12 sn.",
          "V1'de geniş, derin S dalgası (QS veya rS paterni).",
          "I, aVL, V5–V6'da geniş, çentikli/düz tepeli R dalgası; Q dalgası yoktur.",
          "Sekonder ST-T değişiklikleri (QRS'e ters yönde).",
        ],
      },
    ],
    clinicalNote:
      "Genellikle altta yatan yapısal kalp hastalığını (koroner arter hastalığı, kardiyomiyopati, hipertansif kalp hastalığı) işaret eder; yeni gelişen LBBB akut MI şüphesinde önemli bir bulgu olabilir ve Sgarbossa kriterleri ile değerlendirilir.",
  },
  {
    slug: "miyokard-infarktusu-mi",
    order: 24,
    title: "Miyokard İnfarktüsü (Mİ)",
    image: "/ekg/miyokard-infarktusu-mi.png",
    definition:
      "Koroner arter tıkanıklığına bağlı miyokard dokusunun kan akımının kesilmesi/azalması sonucu nekroze olmasıdır; EKG'de zamana ve evreye bağlı karakteristik değişiklikler gösterir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "Hiperakut T dalgaları (erken dönem).",
          "ST segment elevasyonu — ilgili duvarı besleyen derivasyonlarda (STEMI).",
          "veya ST depresyonu / T dalga inversiyonu (NSTEMI).",
          "Patolojik Q dalgaları (geç/tamamlanmış enfarkt bulgusu).",
          "Lokalizasyon tıkanan koroner artere göre değişir: inferior (DII-DIII-aVF), anterior (V1-V4), lateral (I-aVL-V5-V6).",
        ],
      },
    ],
    clinicalNote:
      "Zamana karşı yarış söz konusudur (\"time is muscle\"); STEMI bulgusu olan hastalar acil reperfüzyon tedavisine (PCI/fibrinolitik) yönlendirilmelidir. Seri EKG çekimi ve klinik korelasyon tanıyı güçlendirir.",
  },
  {
    slug: "sgarbossa-kriterleri",
    order: 25,
    title: "Sgarbossa Kriterleri",
    image: "/ekg/sgarbossa-kriterleri.png",
    definition:
      "Sol dal bloğu (LBBB) veya pacemaker ritmi varlığında, standart ST elevasyon kriterlerinin güvenilir olmadığı durumlarda akut miyokard infarktüsünü tanımak için kullanılan elektrokardiyografik kriter setidir.",
    sections: [
      {
        heading: "Kriterler",
        items: [
          "Konkordan ST elevasyonu: pozitif QRS kompleksi olan derivasyonlarda ≥1 mm ST elevasyonu (skor: 5).",
          "Konkordan ST depresyonu: V1–V3'te ≥1 mm ST depresyonu (skor: 3).",
          "Aşırı diskordan ST elevasyonu: negatif QRS kompleksi olan derivasyonlarda (görseldeki gibi V1–V3), QRS ile ters yönde ≥5 mm ST elevasyonu (skor: 2).",
        ],
      },
    ],
    clinicalNote: "Toplam skor ≥3 olması akut Mİ için anlamlı kabul edilir; LBBB veya pace ritmi nedeniyle \"gizlenen\" bir Mİ'yi yakalamada yol göstericidir.",
  },
  {
    slug: "wolf-parkinson-white-sendromu",
    order: 26,
    title: "Wolf-Parkinson-White Sendromu",
    image: "/ekg/wolf-parkinson-white-sendromu.png",
    definition:
      "Atriyum ile ventrikül arasında AV düğüm dışında ek bir ileti yolunun (aksesuar yol) bulunduğu, ventrikülün erken uyarılmasıyla (pre-eksitasyon) karakterize doğuştan bir ileti anomalisidir.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "Kısa PR aralığı (<0,12 sn).",
          "Delta dalgası: QRS'in başlangıcında yavaş, eğimli yükselme.",
          "Geniş QRS kompleksi (≥0,12 sn).",
          "Sekonder ST-T değişiklikleri.",
        ],
      },
    ],
    clinicalNote:
      "Aksesuar yol üzerinden re-entrant taşiaritmilere (AVRT) yol açabilir; atriyal fibrilasyon eşlik ettiğinde hızlı ventriküler yanıta neden olabilir. Semptomatik hastalarda kateter ablasyonu tedavi seçeneğidir.",
  },
  {
    slug: "brugada-sendromu",
    order: 27,
    title: "Brugada Sendromu",
    image: "/ekg/brugada-sendromu.png",
    definition:
      "Sodyum kanal fonksiyon bozukluğuna bağlı, yapısal olarak normal kalpte ani kardiyak ölüm riskini artıran kalıtsal bir ileti/repolarizasyon bozukluğudur.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "V1–V3'te karakteristik \"coved\" (kubbe/eyer şeklinde) tip ST segment elevasyonu.",
          "Takip eden negatif T dalgası.",
          "Sağ dal bloğu benzeri QRS morfolojisi.",
        ],
      },
    ],
    clinicalNote:
      "Ani kardiyak ölüm ve polimorfik ventriküler taşikardi/VF riski taşır; tanı alan ve yüksek riskli hastalarda ICD (implante edilebilir kardiyoverter defibrilatör) değerlendirilir. Ateş bulguları ortaya çıkarabilir/şiddetlendirebilir.",
  },
  {
    slug: "osborne-dalgasi",
    order: 28,
    title: "Osborne Dalgası",
    image: "/ekg/osborne-dalgasi.png",
    definition: "QRS kompleksinin hemen sonunda, J noktasında ortaya çıkan pozitif sapma olup klasik olarak hipotermi ile ilişkilendirilen bir EKG bulgusudur.",
    sections: [
      {
        heading: "EKG Bulguları / Kriterleri",
        items: [
          "J noktasında karakteristik \"çentik\" veya \"kubbe\" şeklinde ek dalga (J dalgası).",
          "Genellikle inferior ve lateral derivasyonlarda (V4–V6 gibi) en belirgindir.",
          "Vücut sıcaklığı düştükçe dalga amplitüdü artma eğilimindedir.",
        ],
      },
    ],
    clinicalNote:
      "Klasik olarak ciddi hipotermi ile ilişkilidir; ayrıca hiperkalsemi, subaraknoid kanama ve bazı ilaç etkilerinde de görülebilir. Altta yatan neden (özellikle hipotermi) acil olarak değerlendirilmeli ve tedavi edilmelidir.",
  },
];

export function findEkgTopic(slug: string): EkgTopic | undefined {
  return ekgTopics.find((t) => t.slug === slug);
}

// Home.tsx'teki mevcut "Sistematik Yaklaşım" bölümü bu görevin kapsamı
// dışındadır (yalnızca Bilgi Alanları kartları ve EKG alt sayfaları
// güncellenmektedir) — bu yüzden o bölümün orijinal, sade içeriği burada
// değiştirilmeden korunmuştur.
export const systematicSteps = [
  { title: "Kalibrasyon", detail: "25 mm/sn, 10 mm/mV" },
  { title: "Ritim ve Hız", detail: undefined },
  { title: "P–QRS–T", detail: undefined },
  { title: "Aralıklar ve ST-T", detail: undefined },
];

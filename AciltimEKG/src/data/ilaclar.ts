// "İlaçlar" (ilaclar) — 31 ilaç kartı, statik veri.
//
// Bu kategori kasıtlı olarak veritabanına (Postgres) bağlı DEĞİLDİR — EKG
// kütüphanesinde (src/data/rhythms.ts) ve diğer statik kategorilerde
// (algorithms.ts, pediatricAlgorithms.ts, dogumVeYenidogan.ts) kullanılan
// yöntemin birebir aynısı: görseller public/drugs/ilaclar/ altında,
// başlık/sıra/görsel eşlemesi burada sabit kodlanmış. Admin panelden
// düzenlenemez (bkz. src/pages/admin/AdminIlaclarReadOnly.tsx).
//
// EKG/Algoritma kategorilerinden farklı olarak bu kategori SADECE görsel
// değil, YAPILANDIRILMIŞ METİN içerir (EKG'deki "sections" deseniyle
// aynı: { heading, items } dizisi). Her ilaç için 5 sabit alt başlık
// kullanılır: Tanımı ve Etki Süresi, Endikasyonları ve Kontraendikasyonları,
// Uygulama Yolu ve Yetişkin/Pediatri Dozları, Yan Etkileri, Dikkat
// Edilmesi Gereken Noktalar.
//
// Kaynak: ekli ilaç tanıtım görselleri (marka adı, doz, etkin madde, kutu/
// ampul bilgisi, kullanım alanı rozetleri) — her ilacın marka/doz/etkin
// madde/temel endikasyon bilgisi görselden birebir alınmıştır. Görselde
// bulunmayan (kontraendikasyon, tam doz aralığı, yan etki, dikkat notu)
// bilgiler, Türkiye'de paramedik/acil tıp teknisyeni eğitiminde kullanılan
// genel kabul görmüş standart bilgiyle, görselle çelişmeyecek şekilde
// tamamlanmıştır — bu alanlar klinik karar değil hızlı referans amaçlıdır,
// nihai doz/uygulama kararı her zaman mevcut protokol ve hekim onayına
// tabidir.
//
// Sıralama: 31 görselin hepsi benzersiz WhatsApp zaman damgasına sahiptir
// (çakışan saniye/parantez son eki yok), bu yüzden dosya adı zaman sırası
// tek ve doğrudan kaynaktır — EKG/Algoritma setlerinden farklı olarak bu
// görsellerde sayfa numarası basılı değildir (her biri bağımsız bir ilaç
// tanıtım görseli), dolayısıyla sıralama doğrulaması dosya adı zaman
// damgasına dayanmaktadır.

export interface IlacSection {
  heading: string;
  items: string[];
}

export interface IlacTopic {
  slug: string;
  order: number;
  title: string;
  genericName: string;
  dose: string;
  image: string;
  sections: IlacSection[];
}

export const ilaclarTopics: IlacTopic[] = [
  {
    slug: "mucinac",
    order: 1,
    title: "Mucinac (Asetilsistein)",
    genericName: "Asetilsistein",
    dose: "300 mg / 3 mL",
    image: "/drugs/ilaclar/mucinac.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Asetilsistein etkin maddeli, balgam kıvamını azaltan (mukolitik) bir ilaçtır.",
          "IV veya inhalasyon yoluyla uygulanabilir; etkisi uygulamadan kısa süre sonra başlar.",
          "Sekresyonları inceltip atılımını kolaylaştırarak hava yolu açıklığını destekler.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "KOAH alevlenmesi, yoğun/yapışkan balgam, solunum yolu obstrüksiyonlarında destek tedavi.",
          "Astım atağında bronkospazmı tetikleyebileceğinden dikkatli kullanılmalıdır.",
          "Bilinen aşırı duyarlılığı olan hastalarda kontrendikedir.",
          "Aktif peptik ülser varlığında dikkatli kullanılmalıdır.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "IV / İnhalasyon — Steril, 300 mg/3 mL ampul.",
          "Yetişkin: Protokol onayına göre IV veya nebül yoluyla uygulanır.",
          "Pediatri: Hekim kararına ve vücut ağırlığına göre düzenlenir; saha protokolünde standart doz tanımlı değildir.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Bulantı, kusma", "Bronkospazm (özellikle astımlı hastalarda)", "Alerjik reaksiyon (döküntü, ürtiker)", "Ağız/burun içinde tahriş hissi (inhalasyon formunda)"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Astım öyküsü olan hastalarda bronkospazm riskine karşı yakın izlem yapılmalıdır.",
          "Solunum sıkıntısı kötüleşirse uygulama durdurulmalıdır.",
          "Diğer ilaçlarla aynı enjektörde karıştırılmamalıdır.",
        ],
      },
    ],
  },
  {
    slug: "adozin",
    order: 2,
    title: "Adozin (Adenozin)",
    genericName: "Adenozin",
    dose: "10 mg / 2 mL",
    image: "/drugs/ilaclar/adozin.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Doğal nükleosid yapılı, ultra kısa etkili bir antiaritmik ajandır.",
          "Etkisi 5-10 saniye içinde başlar, 10-30 saniye gibi çok kısa sürede sona erer.",
          "AV düğümü geçici olarak bloke ederek reentran taşikardileri sonlandırır.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "SVT (supraventriküler taşikardi) tedavisinde ilk tercih ilaçtır.",
          "2./3. derece AV blok, hasta sinüs sendromu olan hastalarda (pacemaker yoksa) kontrendikedir.",
          "Ciddi bronkospastik hastalığı (astım/KOAH) olanlarda dikkatli kullanılmalıdır.",
          "WPW sendromuna bağlı geniş QRS'li düzensiz taşikardilerde kullanılmamalıdır.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "Hızlı IV bolus yapılır, ardından serum fizyolojik (SF) ile yıkanır.",
          "Yetişkin: İlk doz 6 mg hızlı IV bolus; yanıt yoksa 1-2 dk sonra 12 mg tekrarlanabilir, gerekirse 12 mg bir kez daha verilebilir.",
          "Pediatri: 0,1 mg/kg hızlı IV bolus (maks. 6 mg); yanıt yoksa 0,2 mg/kg'a çıkılabilir (maks. 12 mg).",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Geçici göğüs sıkışması, yüzde kızarma (flushing)", "Kısa süreli bradikardi veya asistoli hissi", "Nefes darlığı hissi, baş dönmesi", "Bulantı"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Mutlaka büyük bir damar yolundan ve hızlı şekilde (SF ile birlikte) uygulanmalıdır, aksi halde etkisiz kalabilir.",
          "Uygulama sırasında EKG monitörizasyonu şarttır.",
          "Teofilin kullanan hastalarda etkisi azalabilir; dipiridamol kullananlarda etkisi artabilir.",
        ],
      },
    ],
  },
  {
    slug: "diapam",
    order: 3,
    title: "Diapam (Diazepam)",
    genericName: "Diazepam",
    dose: "10 mg / 2 mL",
    image: "/drugs/ilaclar/diapam.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Benzodiazepin grubu bir ilaç olup sedatif, anksiyolitik, kas gevşetici ve antikonvülzan etkilidir.",
          "IV uygulamada etkisi dakikalar içinde başlar.",
          "Etki süresi orta-uzundur, birkaç saate kadar sürebilir.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Status epileptikus tedavisinde etkilidir.",
          "Ajitasyon ve anksiyetede kullanılır.",
          "Kas spazmlarında rahatlama sağlar.",
          "Akut dar açılı glokom, miyastenia gravis, ağır solunum yetmezliği olanlarda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "I.M./I.V. enjeksiyonluk çözelti.",
          "Yetişkin (status epileptikus): 5-10 mg IV, yavaş (2-5 mg/dk); gerekirse 10-15 dk sonra tekrarlanabilir.",
          "Pediatri: 0,2-0,3 mg/kg IV yavaş (maks. tek doz 10 mg); rektal uygulama da yapılabilir.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Solunum depresyonu (özellikle hızlı IV uygulamada)", "Sedasyon, uyku hali", "Hipotansiyon", "Enjeksiyon yerinde ağrı/tahriş"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Solunum ve hemodinamik durum yakından izlenmeli, resüsitasyon ekipmanı hazır bulundurulmalıdır.",
          "Opioidlerle birlikte kullanımda solunum depresyonu riski artar.",
          "Yaşlı hastalarda doz azaltılmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "dramamine",
    order: 4,
    title: "Dramamine (Dimenhidrinat)",
    genericName: "Dimenhidrinat",
    dose: "50 mg / mL",
    image: "/drugs/ilaclar/dramamine.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Antihistaminik yapılı, antiemetik ve antivertigo etkili bir ilaçtır.",
          "Parenteral uygulamada etkisi kısa sürede başlar.",
          "Etki süresi yaklaşık 3-6 saat civarındadır.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Hareket hastalığında etkilidir.",
          "Vertigo ve baş dönmesi şikayetlerinde kullanılır.",
          "Bulantı ve kusmayı önler, gastrointestinal yakınmaları azaltır.",
          "Dar açılı glokom, mesane boynu obstrüksiyonu olan hastalarda dikkatli kullanılmalıdır; yenidoğan ve prematürelerde kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "Parenteral kullanım için (IV/IM uygulanabilir).",
          "Yetişkin: 50 mg (1 ampul) yavaş IV veya IM, gerekirse 4-6 saatte bir tekrarlanabilir.",
          "Pediatri: 1-1,5 mg/kg IM/IV (hekim onayına göre); 2 yaş altında rutin kullanımı önerilmez.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Sedasyon, uyku hali", "Ağız kuruluğu", "Baş dönmesi, koordinasyon bozukluğu", "Taşikardi"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Araç/makine kullanımını etkileyebilecek sedasyon yapar, hastaya bilgi verilmelidir.",
          "Diğer sedatif ilaçlarla birlikte kullanımda etkisi güçlenir.",
          "Yaşlı hastalarda konfüzyon riskine dikkat edilmelidir.",
        ],
      },
    ],
  },
  {
    slug: "cordarone",
    order: 5,
    title: "Cordarone (Amiodaron HCl)",
    genericName: "Amiodaron HCl",
    dose: "150 mg / 3 mL",
    image: "/drugs/ilaclar/cordarone.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Geniş spektrumlu, Sınıf III antiaritmik bir ilaçtır; K⁺ kanallarını bloke ederek etki gösterir.",
          "IV infüzyon şeklinde uygulanır, etkisi dakikalar içinde başlar.",
          "Yarı ömrü oldukça uzundur (günler-haftalar); akut etkisi uygulamadan hemen sonra görülür.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "VF/VT (ventriküler fibrilasyon / ventriküler taşikardi) tedavisinde kullanılır.",
          "Şok dirençli aritmilerde etkilidir.",
          "Nabızlı/nabızsız ventriküler taşikardi tedavisinde kullanılır.",
          "Ciddi sinüs düğümü hastalığı, 2./3. derece AV blok (pacemaker yoksa) ve iyot alerjisi olanlarda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "IV yolla uygulanır.",
          "Yetişkin — Kardiyak arrest (şoka dirençli VF/VT): İlk doz 300 mg IV bolus (gerekirse 150 mg tekrar). Arrest dışı aritmilerde: ilk doz 150 mg (100 mL SF'de 10 dk'da), idame 1 mg/dk (6 saat).",
          "Pediatri: 5 mg/kg IV bolus (hekim/protokol onayına göre), arrest durumunda tekrarlanabilir.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Hipotansiyon (özellikle hızlı uygulamada)", "Bradikardi", "Enjeksiyon yeri reaksiyonu (flebit)", "Uzun dönem kullanımda tiroid ve akciğer etkileri"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Hızlı IV uygulama ciddi hipotansiyona yol açabilir, mümkünse infüzyon şeklinde verilmelidir.",
          "EKG ve kan basıncı yakından izlenmelidir.",
          "Diğer QT uzatan ilaçlarla birlikte kullanımda dikkatli olunmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "atropin-sulfat",
    order: 6,
    title: "Atropin Sülfat",
    genericName: "Atropin Sülfat",
    dose: "1 mg / 1 mL",
    image: "/drugs/ilaclar/atropin-sulfat.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Antikolinerjik etkili bir ilaç olup vagal tonusu azaltarak kalp hızını artırır.",
          "Etkisi hızlı başlar (1-2 dakika).",
          "Etki süresi kısa-orta derecededir (yaklaşık 30 dk-1 saat).",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Semptomatik bradikardide ilk tercihtir.",
          "Vagal etkilere bağlı bradikardide etkilidir.",
          "AV bloklarda, özellikle Mobitz Tip 1'de kullanılır.",
          "Mobitz Tip 2 ve 3. derece AV blokta (geniş QRS'li) etkisiz kalabilir, transkutan pace düşünülmelidir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "I.V./I.M./S.C. yollarla uygulanabilir.",
          "Yetişkin (semptomatik bradikardi): 0,5-1 mg IV, 3-5 dakikada bir tekrarlanabilir (maks. toplam 3 mg).",
          "Pediatri: 0,02 mg/kg IV (minimum tek doz 0,1 mg, maksimum tek doz 0,5 mg çocuk / 1 mg adolesan).",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Taşikardi, çarpıntı", "Ağız kuruluğu", "Pupil dilatasyonu, bulanık görme", "Ciltte kızarma, sıcaklık hissi"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Çok düşük dozlarda paradoksal bradikardi yapabileceği unutulmamalıdır.",
          "Akut miyokard iskemisi olan hastalarda dikkatli kullanılmalıdır (oksijen tüketimini artırabilir).",
          "EKG monitörizasyonu altında uygulanmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "diltizem-l",
    order: 7,
    title: "Diltizem-L (Diltiazem HCl)",
    genericName: "Diltiazem HCl",
    dose: "25 mg",
    image: "/drugs/ilaclar/diltizem-l.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Kalsiyum kanal blokeri grubundan bir antiaritmik/antihipertansif ilaçtır.",
          "IV uygulamada etkisi birkaç dakika içinde başlar.",
          "Etki süresi doza ve infüzyon hızına bağlı olarak değişir.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Supraventriküler taşikardilerde kullanılır.",
          "Atriyal fibrilasyon ve atriyal flutterde hız kontrolü sağlar.",
          "Ciddi hipotansiyon, kardiyojenik şok, 2./3. derece AV blok (pacemaker yoksa) olan hastalarda kontrendikedir.",
          "Beta blokerlerle birlikte IV kullanımda ciddi bradikardi/kalp bloğu riski nedeniyle dikkatli olunmalıdır.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "I.V. kullanım için liyofilize toz, sulandırılarak uygulanır.",
          "Yetişkin: 0,25 mg/kg IV, 2 dakikada; yanıt yetersizse 15 dk sonra 0,35 mg/kg IV tekrarlanabilir; idame 5-15 mg/saat infüzyon.",
          "Pediatride rutin saha kullanımı yoktur, yalnızca hekim kararıyla uygulanır.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Hipotansiyon", "Bradikardi, AV blok", "Baş dönmesi", "Enjeksiyon yerinde ağrı"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Kalp hızı ve kan basıncı yakından izlenmelidir.",
          "WPW sendromuna bağlı geniş QRS'li aritmilerde kullanılmamalıdır.",
          "Beta bloker kullanan hastalarda birlikte uygulanırken dikkatli olunmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "dopadren",
    order: 8,
    title: "Dopadren (Dopamin HCl)",
    genericName: "Dopamin HCl",
    dose: "200 mg / 5 mL",
    image: "/drugs/ilaclar/dopadren.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Endojen katekolamin yapılı bir vazopressör/inotropik ajandır.",
          "IV infüzyon şeklinde uygulanır, etkisi dakikalar içinde başlar.",
          "Doza bağlı olarak dopaminerjik, beta-adrenerjik ve alfa-adrenerjik etkiler gösterir.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Düşük tansiyonda kan basıncını yükseltir.",
          "Şok durumlarında destek tedavisinde kullanılır.",
          "Yoğun bakımda vazopressör olarak tercih edilir.",
          "Feokromasitoma, kontrolsüz taşiaritmi/ventriküler fibrilasyonu olan hastalarda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "IV infüzyon şeklinde, damar içine uygulanır.",
          "Yetişkin: 2-20 mcg/kg/dk IV infüzyon, titre edilerek (düşük doz böbrek perfüzyonu, orta-yüksek doz vazopressör etki).",
          "Pediatri: 2-20 mcg/kg/dk IV infüzyon, hekim gözetiminde titre edilir.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Taşikardi, çarpıntı", "Ventriküler aritmi riski", "Bulantı, kusma", "Ekstravazasyonda doku nekrozu riski"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Mutlaka büyük/santral bir damar yolundan verilmesi tercih edilir, ekstravazasyon doku hasarına yol açabilir.",
          "İnfüzyon pompası ile titre edilerek uygulanmalı, EKG ve kan basıncı sürekli izlenmelidir.",
          "Ani kesilmemeli, doz kademeli azaltılmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "adrenaline",
    order: 9,
    title: "Adrenaline (Epinefrin)",
    genericName: "Epinefrin (Adrenalin)",
    dose: "1 mg / 1 mL",
    image: "/drugs/ilaclar/adrenaline.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Alfa ve beta-adrenerjik etkili endojen bir katekolamindir.",
          "IV/IM uygulamada etkisi çok hızlı başlar (saniyeler-dakikalar).",
          "Etki süresi kısadır, tekrarlayan dozlar gerekebilir.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Ani alerjik reaksiyonlarda ilk tercihtir.",
          "Anafilakside hayat kurtarıcıdır.",
          "Düşük tansiyonu destekler, acil durumlarda kullanılır; kardiyak arrestte standart ilaçtır.",
          "Hayatı tehdit eden durumlarda mutlak kontrendikasyonu yoktur; ciddi hipertansiyon/taşiaritmi öyküsünde dikkatli kullanılmalıdır.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "I.V. / I.M. yolla uygulanır.",
          "Anafilaksi — Yetişkin: 0,5 mg (0,5 mL) IM, uyluk ön-dış yüzüne, gerekirse 5-15 dk'da tekrarlanabilir. Pediatri: 0,01 mg/kg IM (maks. 0,5 mg).",
          "Kardiyak arrest — Yetişkin: 1 mg IV/IO, 3-5 dakikada bir tekrarlanır. Pediatri: 0,01 mg/kg IV/IO (maks. 1 mg), 3-5 dakikada bir tekrarlanır.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Çarpıntı, taşikardi", "Tremor, anksiyete", "Baş ağrısı", "Hipertansiyon"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Anafilakside IM uygulama tercih edilir, IV uygulama yalnızca arrest veya ciddi hemodinamik instabilitede yapılmalıdır.",
          "Uygulama sonrası EKG ve vital bulgular yakından izlenmelidir.",
          "Yanlışlıkla IV hızlı bolus yapılması ciddi aritmiye yol açabilir.",
        ],
      },
    ],
  },
  {
    slug: "talinat",
    order: 10,
    title: "Talinat (Fentanil Sitrat)",
    genericName: "Fentanil Sitrat",
    dose: "0,5 mg / 10 mL",
    image: "/drugs/ilaclar/talinat.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Güçlü, sentetik bir opioid analjeziktir.",
          "Hızlı başlangıçlı etkiye sahiptir, dakikalar içinde etki gösterir.",
          "Etki süresi görece kısadır (30-60 dakika civarı).",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Şiddetli ağrılarda güçlü analjezik etki sağlar.",
          "Cerrahi ve yoğun bakımda güvenle kullanılır.",
          "Bilinen opioid alerjisi, ciddi solunum depresyonu, paralitik ileus olan hastalarda kontrendikedir.",
          "Kafa travması/bilinç değerlendirmesi gereken hastalarda dikkatli kullanılmalıdır (bilinci ve pupil yanıtını maskeleyebilir).",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "I.V./I.M. yolla, kas içine veya damar içine uygulanır.",
          "Yetişkin: 0,5-1 mcg/kg IV yavaş, gerekirse tekrarlanabilir (hekim/protokol onayına göre).",
          "Pediatri: 0,5-1 mcg/kg IV yavaş, yakın solunum izlemi ile (hekim onayına göre).",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Solunum depresyonu", "Sedasyon, baş dönmesi", "Bulantı, kusma", "Hipotansiyon"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Solunum sayısı ve SpO₂ yakından izlenmeli, naloksan hazır bulundurulmalıdır.",
          "Diğer sedatif/opioid ilaçlarla birlikte kullanımda solunum depresyonu riski artar.",
          "Yavaş IV uygulama tercih edilmelidir.",
        ],
      },
    ],
  },
  {
    slug: "mazenil",
    order: 11,
    title: "Mazenil (Flumazenil)",
    genericName: "Flumazenil",
    dose: "0,5 mg / 5 mL",
    image: "/drugs/ilaclar/mazenil.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Benzodiazepin etkilerini hızlı şekilde geri çeviren spesifik bir antagonisttir.",
          "Hızlı etki başlangıcı sağlar, IV uygulamadan dakikalar içinde etkili olur.",
          "Etki süresi benzodiazepinlerden daha kısa olabilir, tekrar sedasyon (resedasyon) riski vardır.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Sedasyon ve uyanıklık durumlarında kullanılır.",
          "Hastanın bilinç düzeyini artırmaya yardımcı olur.",
          "Benzodiazepine bağımlı hastalarda ve trisiklik antidepresan zehirlenmesi şüphesinde nöbet riski nedeniyle dikkatli kullanılmalıdır.",
          "Kafa içi basınç artışı riski olan hastalarda dikkatli olunmalıdır.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "Damar içine (IV) uygulanır.",
          "Yetişkin: 0,2 mg IV, 15 saniyede; yanıt yoksa 1 dk arayla 0,2 mg tekrarlanır (maks. 1-3 mg).",
          "Pediatri: Saha kullanımı rutin değildir, hekim kararı gerektirir.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Nöbet (özellikle kronik benzodiazepin kullanıcılarında)", "Bulantı, kusma", "Ajitasyon, anksiyete", "Baş ağrısı"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Etki süresi kısa olduğundan resedasyon gelişebilir, hasta yakından izlenmelidir.",
          "Benzodiazepin bağımlılığı/uzun süreli kullanım öyküsünde ani nöbet riskine dikkat edilmelidir.",
          "Karışık ilaç zehirlenmelerinde (özellikle trisiklik antidepresanlarla) dikkatli kullanılmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "epitoin",
    order: 12,
    title: "Epitoin (Fenitoin Sodyum)",
    genericName: "Fenitoin Sodyum",
    dose: "250 mg / 5 mL",
    image: "/drugs/ilaclar/epitoin.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Hidantoin grubundan bir antikonvülzan ilaçtır.",
          "Hızlı etki başlangıcı sağlar.",
          "Etki süresi uzundur, yarı ömrü günler mertebesindedir.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Epileptik nöbetlerin kontrolünde etkilidir.",
          "Status epileptikusta tercih edilen ajanlardandır.",
          "Yoğun bakım koşullarında güvenle kullanılır.",
          "2./3. derece AV blok, ciddi bradikardi, sinoatriyal blok olan hastalarda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "I.V./I.M. yolla uygulanır, kas içine veya damar içine verilebilir.",
          "Yetişkin (status epileptikus): 15-20 mg/kg IV yükleme dozu, 50 mg/dk'yı geçmeyecek hızda.",
          "Pediatri: 15-20 mg/kg IV yükleme dozu, yavaş infüzyon şeklinde (hekim gözetiminde).",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Hipotansiyon ve aritmi (hızlı IV uygulamada)", "Enjeksiyon yerinde tahriş (\"purple glove\" sendromu riski)", "Baş dönmesi, ataksi", "Nistagmus"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "IV uygulama hızı 50 mg/dk'yı geçmemelidir, EKG ve kan basıncı izlenmelidir.",
          "Dekstrozlu solüsyonlarla karıştırılmamalıdır, çökelme riski vardır.",
          "Damar dışına kaçması ciddi doku hasarına yol açabilir.",
        ],
      },
    ],
  },
  {
    slug: "lasix",
    order: 13,
    title: "Lasix (Furosemid Sodyum)",
    genericName: "Furosemid Sodyum",
    dose: "20 mg / 2 mL",
    image: "/drugs/ilaclar/lasix.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Loop (Henle kulpu) diüretiği olup vücutta biriken sıvının atılmasına yardımcı olur.",
          "IV uygulamada etkisi 5 dakika içinde başlar.",
          "Etki süresi yaklaşık 2 saat civarındadır.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Ödem tedavisinde tercih edilir.",
          "Kalp yükünü azaltmaya destek olur, akut akciğer ödeminde kullanılır.",
          "Böbrek fonksiyonlarını destekler.",
          "Anürisi olan hastalarda ve ciddi elektrolit dengesizliğinde kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "I.M./I.V. yolla uygulanır.",
          "Yetişkin: 20-40 mg IV yavaş (1-2 dk'da), gerekirse doz artırılarak tekrarlanabilir.",
          "Pediatri: 1 mg/kg IV yavaş (hekim onayına göre), maks. 6 mg/kg/gün.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Hipotansiyon", "Elektrolit dengesizliği (hipokalemi)", "Dehidratasyon", "Kulak çınlaması (hızlı yüksek doz IV uygulamada)"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Kan basıncı yakından izlenmelidir, hızlı diürez hipotansiyona yol açabilir.",
          "Hızlı IV uygulama ototoksisite riskini artırır, yavaş verilmelidir.",
          "Dehidrate hastalarda dikkatli kullanılmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "coraspin-300",
    order: 14,
    title: "Coraspin 300 (Asetilsalisilik Asit)",
    genericName: "Asetilsalisilik Asit",
    dose: "300 mg",
    image: "/drugs/ilaclar/coraspin-300.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Antiplatelet etkili, trombosit agregasyonunu geri dönüşsüz şekilde inhibe eden bir ilaçtır.",
          "Oral alımdan sonra etkisi 30-60 dakika içinde başlar.",
          "Antiplatelet etkisi trombositin ömrü boyunca (yaklaşık 7-10 gün) devam eder.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Akut koroner sendromda kullanılır.",
          "Kalp krizi riskinin azaltılmasına yardımcı olur.",
          "Damar tıkanıklığının ve inme (felç) riskinin azaltılmasına destek olur.",
          "Aktif gastrointestinal kanama, aspirin alerjisi, 16 yaş altı çocuklarda (Reye sendromu riski) kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "Enterik kaplı tablet, oral yoldan çiğnenerek alınır.",
          "Yetişkin (ACS şüphesi): 150-300 mg çiğnenerek oral, tek doz.",
          "Pediatride ACS endikasyonu yoktur, kullanılmaz.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Gastrointestinal rahatsızlık, mide yanması", "Kanama eğiliminde artış", "Alerjik reaksiyon (nadir)", "Bronkospazm (aspirin duyarlılığı olanlarda)"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Aktif kanama veya kanama bozukluğu şüphesinde uygulanmamalıdır.",
          "Tablet çiğnenerek alınmalıdır, böylece emilim hızlanır.",
          "Diğer antiplatelet/antikoagülan tedavi alan hastalarda dikkatli olunmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "aritmal-2",
    order: 15,
    title: "Aritmal %2 (Lidokain HCl)",
    genericName: "Lidokain HCl",
    dose: "100 mg / 5 mL",
    image: "/drugs/ilaclar/aritmal-2.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Sınıf IB antiaritmik ve lokal anestezik etkili bir ilaçtır, sodyum kanal blokajı ile etki eder.",
          "IV uygulamada etkisi hızla başlar (dakikalar içinde).",
          "Etki süresi kısadır, tekrarlayan doz veya infüzyon gerekebilir.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Ventriküler aritmilerde kullanılır.",
          "Özellikle nabızlı/nabızsız ventriküler taşikardi (VT/VF) tedavisinde yardımcıdır.",
          "Amiodaron mevcut değilse VF/nabızsız VT'de alternatif olarak kullanılabilir.",
          "2./3. derece AV blok, ciddi sinoatriyal blok olan hastalarda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "I.M./I.V./S.C. yolla uygulanabilir.",
          "Yetişkin (VF/nabızsız VT): 1-1,5 mg/kg IV bolus, gerekirse 0,5-0,75 mg/kg ile tekrarlanabilir (maks. 3 mg/kg).",
          "Pediatri: 1 mg/kg IV/IO bolus (hekim/protokol onayına göre).",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Baş dönmesi, konfüzyon", "Perioral uyuşukluk, kulak çınlaması", "Nöbet (yüksek dozda)", "Hipotansiyon, bradikardi"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Toksik doz belirtileri (konfüzyon, nöbet) açısından yakından izlenmelidir.",
          "Karaciğer yetmezliği olan hastalarda doz azaltılmalıdır.",
          "EKG monitörizasyonu altında uygulanmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "magnezyum-sulfat",
    order: 16,
    title: "Magnezyum Sülfat",
    genericName: "Magnezyum Sülfat",
    dose: "1500 mg / 10 mL",
    image: "/drugs/ilaclar/magnezyum-sulfat.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Elektrolit dengesini düzenleyen, aynı zamanda antiaritmik ve antikonvülzan etkili bir ajandır.",
          "IV uygulamada etkisi dakikalar içinde başlar.",
          "Etki süresi uygulama hızına ve dozuna bağlıdır.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Torsades de pointes tedavisinde ilk tercih ilaçtır.",
          "Eklampsi ve preeklampside kullanılır.",
          "Ağır astım atağında destek tedavide kullanılır.",
          "Magnezyum eksikliğinde ve hipomagnezemide kullanılır; böbrek yetmezliği ve miyastenia gravis olan hastalarda dikkatli kullanılmalıdır.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "Steril, IV yolla uygulanır.",
          "Yetişkin (Torsades de pointes): 1-2 g IV, 5-20 dakikada yavaş infüzyon. Eklampsi: 4-6 g IV yükleme (15-20 dk'da), idame 1-2 g/saat.",
          "Pediatri (ağır astım): 25-50 mg/kg IV, 20 dakikada (hekim onayına göre, maks. 2 g).",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Flushing (yüzde kızarma), sıcak basması", "Hipotansiyon (hızlı uygulamada)", "Solunum depresyonu (yüksek dozda)", "Derin tendon reflekslerinde azalma"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Hızlı IV uygulama ciddi hipotansiyon ve solunum depresyonuna yol açabilir, yavaş verilmelidir.",
          "Böbrek yetmezliği olan hastalarda doz ayarlaması gerekir.",
          "Kalsiyum glukonat, magnezyum toksisitesi durumunda antidot olarak hazır bulundurulmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "beloc",
    order: 17,
    title: "Beloc (Metoprolol Tartrat)",
    genericName: "Metoprolol Tartrat",
    dose: "5 mg / 5 mL",
    image: "/drugs/ilaclar/beloc.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Kardiyoselektif beta bloker etkili bir ilaçtır.",
          "IV uygulamada etkisi dakikalar içinde başlar.",
          "Etki süresi birkaç saat sürer.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Taşikardi ve ritim kontrolünde kullanılır.",
          "Kan basıncını düşürür.",
          "SVT ve AF'de hız kontrolünde etkilidir.",
          "Ciddi bradikardi, 2./3. derece AV blok, kardiyojenik şok, dekompanse kalp yetmezliği, ağır astım olan hastalarda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "İntravenöz yoldan kullanılır.",
          "Yetişkin: 2,5-5 mg IV yavaş (5 dakikada), gerekirse 5 dakika arayla toplam 15 mg'a kadar tekrarlanabilir.",
          "Pediatride saha kullanımı rutin değildir, hekim kararı gerektirir.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Bradikardi", "Hipotansiyon", "Bronkospazm (astımlı hastalarda)", "Yorgunluk, baş dönmesi"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Kalp hızı ve kan basıncı yakından izlenmelidir.",
          "Astım/KOAH öyküsü olan hastalarda bronkospazm riskine dikkat edilmelidir.",
          "Kalsiyum kanal blokerleriyle birlikte kullanımda ciddi bradikardi/kalp bloğu riski artar.",
        ],
      },
    ],
  },
  {
    slug: "metpamid",
    order: 18,
    title: "Metpamid (Metoklopramid HCl)",
    genericName: "Metoklopramid HCl",
    dose: "10 mg / 2 mL",
    image: "/drugs/ilaclar/metpamid.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Dopamin antagonisti etkili bir antiemetik/prokinetik ilaçtır, merkezi ve periferik etki gösterir.",
          "IV/IM uygulamada etkisi dakikalar içinde başlar.",
          "Etki süresi yaklaşık 1-2 saat sürer.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Bulantı ve kusma tedavisinde kullanılır.",
          "Gastrointestinal motiliteyi artırır.",
          "Bulantı hissini azaltır.",
          "Gastrointestinal kanama, obstrüksiyon veya perforasyon şüphesinde, feokromasitomada kontrendikedir; Parkinson hastalığında dikkatli kullanılmalıdır.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "IV veya IM yolla uygulanır.",
          "Yetişkin: 10 mg IV/IM yavaş, gerekirse 6-8 saatte bir tekrarlanabilir.",
          "Pediatri: 0,1-0,15 mg/kg IV/IM (hekim onayına göre), ekstrapiramidal yan etki riski nedeniyle dikkatli kullanılmalıdır.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Ekstrapiramidal reaksiyonlar (distoni, akatizi)", "Sedasyon, yorgunluk", "Baş dönmesi", "Diyare"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Özellikle genç hastalarda ve çocuklarda distoni reaksiyonu gelişebilir, izlenmelidir.",
          "Yavaş IV uygulama önerilir (hızlı uygulamada anksiyete/huzursuzluk olabilir).",
          "Parkinson hastalarında semptomları kötüleştirebilir.",
        ],
      },
    ],
  },
  {
    slug: "meticure",
    order: 19,
    title: "Meticure (Metilprednizolon Sodyum Süksinat)",
    genericName: "Metilprednizolon Sodyum Süksinat",
    dose: "40 mg",
    image: "/drugs/ilaclar/meticure.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Güçlü, kısa-orta etkili bir kortikosteroiddir.",
          "IV/IM uygulamada etkisi dakikalar içinde başlar, ancak tam antiinflamatuar etki saatler içinde gelişir.",
          "Etki süresi 24-48 saat civarındadır.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Alerjik reaksiyonlarda kullanılır.",
          "Anafilakside adjuvan tedavidir.",
          "İnflamasyon ve ödemi azaltır.",
          "Astım ve KOAH ataklarında kullanılır; sistemik fungal enfeksiyon varlığında kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "I.M./I.V. yolla, kas içine veya damar içine uygulanır.",
          "Yetişkin: 40-125 mg IV/IM, duruma göre tek doz veya tekrarlanan dozlar.",
          "Pediatri: 1-2 mg/kg IV/IM (hekim onayına göre).",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Hiperglisemi", "Kan basıncında yükselme", "Gastrointestinal rahatsızlık", "İmmün yanıtta baskılanma, enfeksiyon riskinde artış"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Diyabetik hastalarda kan şekeri yakından izlenmelidir.",
          "Acil durumda tek doz kullanım genellikle güvenlidir, uzun süreli kullanımda ek önlemler gerekir.",
          "Canlı aşı uygulamasıyla birlikte kullanılmamalıdır.",
        ],
      },
    ],
  },
  {
    slug: "dormicum",
    order: 20,
    title: "Dormicum (Midazolam)",
    genericName: "Midazolam",
    dose: "5 mg / 5 mL (ayrıca 15 mg/3 mL ve 50 mg/10 mL formları mevcut)",
    image: "/drugs/ilaclar/dormicum.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Kısa etkili bir benzodiazepin olup sedasyon, anksiyoliz ve antikonvülzan etki gösterir.",
          "IV uygulamada etkisi 1-2 dakika içinde başlar.",
          "Etki süresi kısadır (yaklaşık 30-80 dakika).",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Sedasyon ve anksiyoliz sağlar.",
          "Status epileptikusta kullanılır.",
          "Girişimsel işlemlerde sedasyon amacıyla kullanılır; entübasyon öncesi premedikasyonda kullanılabilir.",
          "Akut dar açılı glokom, ciddi solunum yetmezliği olan hastalarda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "I.V./I.M./Rektal yollarla uygulanabilir.",
          "Yetişkin (status epileptikus): 0,1-0,2 mg/kg IV/IM (maks. 10 mg); intranazal/buccal da uygulanabilir.",
          "Pediatri: 0,1-0,2 mg/kg IV/IM/intranazal/buccal (maks. 10 mg), protokole göre.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Solunum depresyonu", "Sedasyon, amnezi", "Hipotansiyon", "Paradoksal ajitasyon (özellikle çocuklarda)"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Solunum ve hemodinamik durum yakından izlenmeli, resüsitasyon ekipmanı hazır bulundurulmalıdır.",
          "Opioidlerle birlikte kullanımda solunum depresyonu riski ciddi şekilde artar.",
          "Yaşlı hastalarda doz azaltılmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "naloxone",
    order: 21,
    title: "Naloxone (Naloksan Hidroklorür)",
    genericName: "Naloksan Hidroklorür",
    dose: "0,4 mg / mL",
    image: "/drugs/ilaclar/naloxone.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Opioid reseptör antagonisti olup opioid etkilerini hızla geri çevirir.",
          "Hızlı etki başlangıcı vardır, IV uygulamada 1-2 dakika içinde etkili olur.",
          "Etki süresi kısadır (30-90 dakika), kullanılan opioidden daha kısa sürebilir.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Opioid zehirlenmelerinde kullanılır.",
          "Solunum depresyonunu düzeltir.",
          "Bilinç düzeyini artırır.",
          "Bilinen naloksan alerjisi dışında mutlak kontrendikasyonu yoktur; opioid bağımlılarında ani yoksunluk sendromu riskine dikkat edilmelidir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "Güvenli ve hayat kurtarıcıdır; IV/IM/IN/SC yollarla uygulanabilir.",
          "Yetişkin: 0,4-2 mg IV/IM/IN, 2-3 dakikada bir tekrarlanabilir (maks. 10 mg).",
          "Pediatri: 0,1 mg/kg IV/IM/IN (maks. tek doz 2 mg), gerekirse tekrarlanabilir.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Ani opioid yoksunluk semptomları (ajitasyon, terleme, taşikardi)", "Bulantı, kusma", "Baş ağrısı", "Pulmoner ödem (nadir, yüksek dozda)"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Etki süresi birçok opioidden kısa olduğundan tekrar solunum depresyonu (resedasyon) gelişebilir, hasta yakından izlenmelidir.",
          "Kronik opioid kullanıcılarında ani ve şiddetli yoksunluk sendromuna yol açabilir, doz titre edilerek verilmelidir.",
          "Solunum desteği (BVM, oksijen) her zaman hazır bulundurulmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "perlinganit",
    order: 22,
    title: "Perlinganit (Gliseril Trinitrat)",
    genericName: "Gliseril Trinitrat",
    dose: "10 mg / 10 mL",
    image: "/drugs/ilaclar/perlinganit.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Nitrat grubu bir vazodilatördür, koroner ve periferik damarları genişletir.",
          "IV infüzyon şeklinde uygulanır, etkisi hızlı başlar (1-2 dakika).",
          "Etki süresi kısadır, infüzyon kesilince etkisi hızla sonlanır.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Akut koroner sendromda kullanılır.",
          "Preload'u azaltarak kalbin iş yükünü düşürür.",
          "Akut akciğer ödeminde kullanılır.",
          "Hipotansiyon, sağ ventrikül infarktüsü şüphesi, son 24-48 saatte fosfodiesteraz-5 inhibitörü (sildenafil vb.) kullanımında kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "İnfüzyon şeklinde damar içine uygulanır.",
          "Yetişkin: 5-10 mcg/dk IV infüzyon ile başlanır, kan basıncına göre 5-10 dakikada bir titre edilir (maks. genellikle 200 mcg/dk).",
          "Pediatride rutin saha kullanımı yoktur.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Baş ağrısı", "Hipotansiyon, baş dönmesi", "Refleks taşikardi", "Yüzde kızarma (flushing)"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Kan basıncı sürekli izlenmeli, hipotansiyon gelişirse infüzyon yavaşlatılmalı/durdurulmalıdır.",
          "Sağ ventrikül infarktüsü şüphesinde (inferior MI + hipotansiyon) kullanılmamalıdır.",
          "Hastaya son 24-48 saatte sildenafil/tadalafil gibi ilaç kullanıp kullanmadığı mutlaka sorulmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "zofer",
    order: 23,
    title: "Zofer (Ondansetron)",
    genericName: "Ondansetron",
    dose: "8 mg / 4 mL",
    image: "/drugs/ilaclar/zofer.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Selektif 5-HT3 reseptör antagonisti etkili güçlü bir antiemetiktir.",
          "IV uygulamada etkisi dakikalar içinde başlar.",
          "Etki süresi yaklaşık 4-8 saat sürer.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Bulantı ve kusmada kullanılır.",
          "Kemoterapiye bağlı bulantı ve kusmada etkilidir.",
          "Gastroenteritlerde ve hareket (seyahat) kusmalarında kullanılır.",
          "Konjenital uzun QT sendromu olan hastalarda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "IV yavaş uygulanır (2-5 dakikada).",
          "Yetişkin: 4-8 mg IV yavaş, gerekirse 8 saatte bir tekrarlanabilir.",
          "Pediatri: 0,1-0,15 mg/kg IV yavaş (maks. 4 mg), hekim onayına göre.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Baş ağrısı", "Kabızlık", "Geçici görme bozukluğu (hızlı IV uygulamada)", "QT uzaması (yüksek dozda)"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Mutlaka yavaş IV uygulanmalıdır (2-5 dakikada), hızlı uygulama geçici görme bozukluğuna yol açabilir.",
          "QT uzatan diğer ilaçlarla birlikte kullanımda dikkatli olunmalıdır.",
          "Kardiyak risk faktörü olan hastalarda EKG izlemi düşünülmelidir.",
        ],
      },
    ],
  },
  {
    slug: "progas",
    order: 24,
    title: "Progas (Pantoprazol)",
    genericName: "Pantoprazol",
    dose: "40 mg",
    image: "/drugs/ilaclar/progas.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Proton pompa inhibitörü (PPI) grubundan, mide asit salgısını azaltan bir ilaçtır.",
          "IV uygulamada etkisi saatler içinde gelişir.",
          "Etki süresi 24 saate kadar uzayabilir.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Mide asidini azaltır.",
          "Mideyi korur, ülser tedavisinde kullanılır.",
          "Gastrit, reflü ve mide yanmasında etkilidir.",
          "Üst gastrointestinal kanama şüphesinde destek tedavide kullanılabilir; bilinen PPI alerjisi olan hastalarda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "IV yolla, hastane ortamında uygulanır.",
          "Yetişkin: 40 mg IV, günde 1 kez, yavaş bolus veya kısa infüzyon şeklinde.",
          "Pediatride saha kullanımı rutin değildir, hekim kararı gerektirir.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Baş ağrısı", "Bulantı, karın ağrısı", "Diyare veya kabızlık", "Enjeksiyon yerinde reaksiyon"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Üst gastrointestinal kanama şüphesinde hastaneye nakil önceliklidir, Progas destek tedavidir.",
          "Diğer ilaçlarla etkileşim potansiyeli açısından hasta öyküsü değerlendirilmelidir.",
          "Uzun süreli kullanımda elektrolit dengesizliği (hipomagnezemi) riski bulunur.",
        ],
      },
    ],
  },
  {
    slug: "sodyum-bikarbonat",
    order: 25,
    title: "Sodyum Bikarbonat",
    genericName: "Sodyum Bikarbonat",
    dose: "840 mg / 10 mL",
    image: "/drugs/ilaclar/sodyum-bikarbonat.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Vücuttaki asit-baz dengesini düzenleyen bir alkalileştirici ajandır.",
          "IV uygulamada etkisi hızlıdır (dakikalar içinde).",
          "Etki süresi klinik duruma bağlı olarak değişir.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Metabolik asidoz tedavisinde kullanılır.",
          "Kan pH'ını düzenler, asitliği azaltır.",
          "Acil durumlarda hayat kurtarıcıdır; özellikle trisiklik antidepresan zehirlenmesi, hiperkalemi ve uzamış resüsitasyonda kullanılır.",
          "Metabolik veya respiratuar alkaloz, hipokalsemi durumunda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "IV yolla uygulanır.",
          "Yetişkin: 1 mEq/kg IV bolus (genellikle uzamış arrest, hiperkalemi veya TCA zehirlenmesinde), gerekirse kan gazına göre tekrarlanır.",
          "Pediatri: 1 mEq/kg IV yavaş (hekim onayına göre), hızlı uygulamadan kaçınılmalıdır.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Metabolik alkaloz (aşırı dozda)", "Hipernatremi", "Hipokalemi", "Ekstravazasyonda doku tahrişi"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Kalsiyum içeren solüsyonlarla aynı hatta karıştırılmamalıdır, çökelti oluşur.",
          "Yeterli ventilasyon sağlanmadan uygulanması paradoksal intraselüler asidozu artırabilir.",
          "Mümkünse kan gazı sonuçlarına göre doz ayarlanmalıdır.",
        ],
      },
    ],
  },
  {
    slug: "avil",
    order: 26,
    title: "Avil (Feniramin Maleat)",
    genericName: "Feniramin Maleat",
    dose: "45,5 mg / 2 mL",
    image: "/drugs/ilaclar/avil.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Birinci kuşak antihistaminik etkili bir ilaçtır.",
          "IM/IV uygulamada etkisi dakikalar içinde başlar.",
          "Etki süresi yaklaşık 4-6 saat sürer.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Alerjik reaksiyonlarda kullanılır.",
          "Anafilaksi tedavisinde destek amaçlı kullanılır.",
          "Böcek sokmalarında, ürtikerde ve alerjik rinit semptomlarında etkilidir.",
          "Akut astım atağı, dar açılı glokom, yenidoğanlarda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "İM veya İV yolla uygulanır.",
          "Yetişkin: 1 ampul (45,5 mg/2 mL) IM/IV yavaş, gerekirse tekrarlanabilir.",
          "Pediatri: Hekim onayına göre vücut ağırlığına uygun dozda; saha protokolünde standart doz tanımlı değildir.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Sedasyon, uyku hali", "Ağız kuruluğu", "Baş dönmesi", "Hipotansiyon (hızlı IV uygulamada)"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Anafilakside tek başına yeterli değildir, adrenalin ile birlikte kullanılmalıdır.",
          "Sedasyon yapacağından hastaya bilgi verilmelidir.",
          "Diğer sedatif ilaçlarla birlikte kullanımda etkisi güçlenir.",
        ],
      },
    ],
  },
  {
    slug: "dekort",
    order: 27,
    title: "Dekort (Deksametazon)",
    genericName: "Deksametazon",
    dose: "8 mg / 2 mL",
    image: "/drugs/ilaclar/dekort.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Güçlü, uzun etkili bir kortikosteroiddir.",
          "IV/IM uygulamada etkisi dakikalar içinde başlar, tam etki saatler içinde gelişir.",
          "Etki süresi uzundur (36-72 saat).",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Alerjik reaksiyonlarda kullanılır.",
          "Hava yolu ödeminde (larenks, anjiyoödem) etkilidir.",
          "İnflamasyonu azaltır, beyin ödeminde kullanılır.",
          "Sistemik fungal enfeksiyon varlığında kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "İM veya İV yolla uygulanır.",
          "Yetişkin: 4-20 mg IV/IM, duruma göre tek doz veya tekrarlanan dozlar.",
          "Pediatri: 0,15-0,6 mg/kg IV/IM (hekim onayına göre, maks. genellikle 16 mg).",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Hiperglisemi", "Kan basıncında yükselme", "Gastrointestinal rahatsızlık", "Enfeksiyona yatkınlıkta artış"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Anafilakside adrenalinin yerini tutmaz, destek tedavi olarak kullanılır.",
          "Diyabetik hastalarda kan şekeri izlenmelidir.",
          "Acil tek doz kullanımda genellikle güvenlidir.",
        ],
      },
    ],
  },
  {
    slug: "isordil",
    order: 28,
    title: "İsordil (İzosorbid Dinitrat)",
    genericName: "İzosorbid Dinitrat",
    dose: "5 mg (dilaltı tablet)",
    image: "/drugs/ilaclar/isordil.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Nitrat grubu bir vazodilatördür, koroner damarları genişleterek kalbe giden kan akımını artırır.",
          "Dilaltından alındığında hızlı etki başlar (2-5 dakika).",
          "Etki süresi kısadır (yaklaşık 1-2 saat).",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Anjina (göğüs ağrısı) ataklarında kullanılır.",
          "Koroner damarları genişleterek kalbe giden kan akımını artırır.",
          "Ciddi hipotansiyon, sağ ventrikül infarktüsü, son 24-48 saatte fosfodiesteraz-5 inhibitörü kullanımında kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "Dilaltından alınır, çiğnenmeden eritilir.",
          "Yetişkin: 5 mg dilaltı tablet, gerekirse 5 dakika arayla tekrarlanabilir (maks. 3 doz).",
          "Pediatride endikasyonu yoktur.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Baş ağrısı", "Baş dönmesi", "Tansiyonu düşürebilir", "Yüzde kızarma (flushing)"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Uygulama öncesi kan basıncı kontrol edilmelidir, hipotansif hastalarda dikkatli kullanılmalıdır.",
          "Hastaya son 24-48 saatte sildenafil/tadalafil gibi ilaç kullanıp kullanmadığı mutlaka sorulmalıdır.",
          "Sağ ventrikül infarktüsü şüphesinde (inferior MI bulguları) kullanılmamalıdır.",
        ],
      },
    ],
  },
  {
    slug: "buscopan",
    order: 29,
    title: "Buscopan (Hiyosin-N-Butil Bromür)",
    genericName: "Hiyosin-N-Butil Bromür",
    dose: "20 mg / mL",
    image: "/drugs/ilaclar/buscopan.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Antikolinerjik/antispazmodik etkili bir ilaçtır, düz kas spazmlarını çözer.",
          "Parenteral uygulamada etkisi hızlı başlar.",
          "Etki süresi birkaç saat sürer.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Mide ve bağırsak kramplarını hafifletir.",
          "Sindirim sistemi spazmlarını azaltır.",
          "Şişkinlik, gaz ve karın ağrısında kullanılır.",
          "Dar açılı glokom, miyastenia gravis, mekanik gastrointestinal obstrüksiyon, taşiaritmi olan hastalarda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "Enjeksiyonluk çözelti (20 mg/mL) veya oral draje formu mevcuttur.",
          "Yetişkin: 20 mg (1 ampul) IM/IV/SC, gerekirse 6 saatte bir tekrarlanabilir (maks. 100 mg/gün).",
          "Pediatri: Hekim onayına göre vücut ağırlığına uygun dozda kullanılır.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Ağız kuruluğu", "Taşikardi", "Bulanık görme", "Üriner retansiyon"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Akut karın ağrısında altta yatan ciddi patolojiyi (apandisit, perforasyon vb.) maskeleyebileceği unutulmamalıdır.",
          "Prostat hipertrofisi olan hastalarda idrar retansiyonu riskine dikkat edilmelidir.",
          "Kalp hastalığı olanlarda taşikardi riskine karşı izlenmelidir.",
        ],
      },
    ],
  },
  {
    slug: "novalgin",
    order: 30,
    title: "Novalgin (Metamizol Sodyum)",
    genericName: "Metamizol Sodyum",
    dose: "1 g / 2 mL",
    image: "/drugs/ilaclar/novalgin.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Güçlü analjezik ve antipiretik etkili bir pirazolon türevidir.",
          "IV/IM uygulamada etkisi hızlı başlar.",
          "Etki süresi yaklaşık 4-6 saat sürer.",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Şiddetli ağrıların hafifletilmesinde kullanılır.",
          "Ateşin düşürülmesine yardımcı olur.",
          "Kas ve eklem ağrılarında etkilidir.",
          "Bilinen pirazolon alerjisi, agranülositoz öyküsü, G6PD eksikliği olan hastalarda kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "IM/IV yolla uygulanır.",
          "Yetişkin: 1 g (1 ampul) IM/IV yavaş, gerekirse 6-8 saatte bir tekrarlanabilir (maks. 4 g/gün).",
          "Pediatri: 10-15 mg/kg IV/IM (hekim onayına göre).",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Hipotansiyon (hızlı IV uygulamada)", "Alerjik reaksiyon, anafilaksi (nadir ama ciddi)", "Agranülositoz (nadir, uzun süreli kullanımda)", "Bulantı"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Mutlaka yavaş IV uygulanmalıdır, hızlı uygulama ciddi hipotansiyona yol açabilir.",
          "Alerjik reaksiyon potansiyeli nedeniyle ilk doz sonrası hasta izlenmelidir.",
          "Daha önce metamizole bağlı alerjik reaksiyon öyküsü olanlarda kesinlikle kullanılmamalıdır.",
        ],
      },
    ],
  },
  {
    slug: "nitrolingual-pompspray",
    order: 31,
    title: "Nitrolingual Pompspray (Nitrogliserin)",
    genericName: "Nitrogliserin",
    dose: "0,4 mg / doz",
    image: "/drugs/ilaclar/nitrolingual-pompspray.jpg",
    sections: [
      {
        heading: "Tanımı ve Etki Süresi",
        items: [
          "Nitrat grubu hızlı etkili bir vazodilatördür.",
          "Dil altına uygulandığında dakikalar içinde etki gösterir.",
          "Etki süresi kısadır (yaklaşık 30-60 dakika).",
        ],
      },
      {
        heading: "Endikasyonları ve Kontraendikasyonları",
        items: [
          "Ani göğüs ağrısında hızlı rahatlama sağlar.",
          "Taşınabilir ve kolay kullanılır, her an yanında taşınabilir.",
          "Ciddi hipotansiyon, sağ ventrikül infarktüsü, son 24-48 saatte fosfodiesteraz-5 inhibitörü kullanımında kontrendikedir.",
        ],
      },
      {
        heading: "Uygulama Yolu ve Yetişkin/Pediatri Dozları",
        items: [
          "Dil altına uygulanır.",
          "Yetişkin: 1 püskürtme (0,4 mg) dil altına, gerekirse 5 dakika arayla tekrarlanabilir (maks. 3 doz).",
          "Pediatride endikasyonu yoktur.",
        ],
      },
      {
        heading: "Yan Etkileri",
        items: ["Baş ağrısı", "Hipotansiyon, baş dönmesi", "Yüzde kızarma (flushing)", "Refleks taşikardi"],
      },
      {
        heading: "Dikkat Edilmesi Gereken Noktalar",
        items: [
          "Uygulama öncesi kan basıncı kontrol edilmelidir.",
          "Hastaya son 24-48 saatte sildenafil/tadalafil gibi ilaç kullanıp kullanmadığı mutlaka sorulmalıdır.",
          "Kullanım talimatına uyulmalı, ilk kullanımda püskürtücünün hazırlanması (priming) gerekebilir.",
        ],
      },
    ],
  },
];

export function findIlacTopic(slug: string): IlacTopic | undefined {
  return ilaclarTopics.find((t) => t.slug === slug);
}

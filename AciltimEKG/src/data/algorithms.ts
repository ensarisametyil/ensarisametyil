// "Yetişkin Algoritmalar" (acil-yaklasimlar) — 53 konu, statik veri.
//
// Bu kategori kasıtlı olarak veritabanına (Postgres) bağlı DEĞİLDİR — EKG
// kütüphanesinde (src/data/rhythms.ts) kullanılan yöntemin birebir aynısı:
// görseller public/algorithms/acil-yaklasimlar/ altında, başlık/sıra/görsel
// eşlemesi burada sabit kodlanmış. Admin panelden düzenlenemez (bkz.
// src/pages/admin/AdminAlgorithmsReadOnly.tsx) — EKG ile aynı "salt okunur"
// muamelesi görür.
//
// Kaynak: T.C. Sağlık Bakanlığı hastane öncesi yetişkin algoritma seti.
// Her konu SADECE ilgili görseli gösterir; ek açıklama metni yoktur.

export interface AlgorithmTopic {
  slug: string;
  order: number;
  title: string;
  image: string;
}

export const acilYaklasimlarTopics: AlgorithmTopic[] = [
  { slug: "olay-yeri-yonetimi", order: 1, title: "Olay Yeri Yönetimi", image: "/algorithms/acil-yaklasimlar/olay-yeri-yonetimi.jpg" },
  { slug: "acil-olgu-yonetimi-anahtar-noktalar", order: 2, title: "Acil Olgu Yönetimi Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/acil-olgu-yonetimi-anahtar-noktalar.jpg" },
  { slug: "acil-olgu-yonetimi", order: 3, title: "Acil Olgu Yönetimi", image: "/algorithms/acil-yaklasimlar/acil-olgu-yonetimi.jpg" },
  { slug: "hava-yolu-tikanikliklari", order: 4, title: "Hava Yolu Tıkanıklıkları", image: "/algorithms/acil-yaklasimlar/hava-yolu-tikanikliklari.jpg" },
  { slug: "koah-anahtar-noktalar", order: 5, title: "KOAH Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/koah-anahtar-noktalar.jpg" },
  { slug: "koah", order: 6, title: "KOAH", image: "/algorithms/acil-yaklasimlar/koah.jpg" },
  { slug: "astim-anahtar-noktalar", order: 7, title: "Astım Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/astim-anahtar-noktalar.jpg" },
  { slug: "astim", order: 8, title: "Astım", image: "/algorithms/acil-yaklasimlar/astim.jpg" },
  { slug: "akut-koroner-sendrom-anahtar-noktalar", order: 9, title: "Akut Koroner Sendrom Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/akut-koroner-sendrom-anahtar-noktalar.jpg" },
  { slug: "akut-koroner-sendrom", order: 10, title: "Akut Koroner Sendrom", image: "/algorithms/acil-yaklasimlar/akut-koroner-sendrom.jpg" },
  { slug: "bradikardi-anahtar-noktalar", order: 11, title: "Bradikardi Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/bradikardi-anahtar-noktalar.jpg" },
  { slug: "bradikardi", order: 12, title: "Bradikardi", image: "/algorithms/acil-yaklasimlar/bradikardi.jpg" },
  { slug: "nabizli-tasikardi", order: 13, title: "Nabızlı Taşikardi", image: "/algorithms/acil-yaklasimlar/nabizli-tasikardi.jpg" },
  { slug: "arrest-yonetimi", order: 14, title: "Arrest Yönetimi", image: "/algorithms/acil-yaklasimlar/arrest-yonetimi.jpg" },
  { slug: "soklanamaz-ritim-yonetimi-anahtar-noktalar", order: 15, title: "Şoklanamaz Ritim Yönetimi Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/soklanamaz-ritim-yonetimi-anahtar-noktalar.jpg" },
  { slug: "soklanamaz-ritim-yonetimi-asistoli-nea", order: 16, title: "Şoklanamaz Ritim Yönetimi: Asistoli / NEA", image: "/algorithms/acil-yaklasimlar/soklanamaz-ritim-yonetimi-asistoli-nea.jpg" },
  { slug: "soklanir-ritim-yonetimi-vf-nabizsiz-vt-anahtar-noktalar", order: 17, title: "Şoklanır Ritim Yönetimi VF / Nabızsız VT Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/soklanir-ritim-yonetimi-vf-nabizsiz-vt-anahtar-noktalar.jpg" },
  { slug: "soklanir-ritim-yonetimi-vf-nabizsiz-vt", order: 18, title: "Şoklanır Ritim Yönetimi: VF / Nabızsız VT", image: "/algorithms/acil-yaklasimlar/soklanir-ritim-yonetimi-vf-nabizsiz-vt.jpg" },
  { slug: "resusitasyon-sonrasi-bakim", order: 19, title: "Resüsitasyon Sonrası Bakım", image: "/algorithms/acil-yaklasimlar/resusitasyon-sonrasi-bakim.jpg" },
  { slug: "hipovolemik-sok", order: 20, title: "Hipovolemik Şok", image: "/algorithms/acil-yaklasimlar/hipovolemik-sok.jpg" },
  { slug: "akut-akciger-odemi-ve-kardiyojenik-sok-anahtar-noktalar", order: 21, title: "Akut Akciğer Ödemi ve Kardiyojenik Şok Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/akut-akciger-odemi-ve-kardiyojenik-sok-anahtar-noktalar.jpg" },
  { slug: "kalp-yetmezligine-bagli-akut-akciger-odemi-ve-kardiyojenik-sok", order: 22, title: "Kalp Yetmezliğine Bağlı Akut Akciğer Ödemi ve Kardiyojenik Şok", image: "/algorithms/acil-yaklasimlar/kalp-yetmezligine-bagli-akut-akciger-odemi-ve-kardiyojenik-sok.jpg" },
  { slug: "ajite-hastaya-yaklasim-anahtar-noktalar", order: 23, title: "Ajite Hastaya Yaklaşım Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/ajite-hastaya-yaklasim-anahtar-noktalar.jpg" },
  { slug: "ajite-hastaya-yaklasim", order: 24, title: "Ajite Hastaya Yaklaşım", image: "/algorithms/acil-yaklasimlar/ajite-hastaya-yaklasim.jpg" },
  { slug: "bilinc-degisiklikleri-anahtar-noktalar", order: 25, title: "Bilinç Değişiklikleri Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/bilinc-degisiklikleri-anahtar-noktalar.jpg" },
  { slug: "bilinc-degisikligi", order: 26, title: "Bilinç Değişikliği", image: "/algorithms/acil-yaklasimlar/bilinc-degisikligi.jpg" },
  { slug: "diyabetik-aciller", order: 27, title: "Diyabetik Aciller", image: "/algorithms/acil-yaklasimlar/diyabetik-aciller.jpg" },
  { slug: "i-nme-svo", order: 28, title: "İnme / SVO", image: "/algorithms/acil-yaklasimlar/i-nme-svo.jpg" },
  { slug: "nobet-konvulziyon", order: 29, title: "Nöbet / Konvülziyon", image: "/algorithms/acil-yaklasimlar/nobet-konvulziyon.jpg" },
  { slug: "vertigo", order: 30, title: "Vertigo", image: "/algorithms/acil-yaklasimlar/vertigo.jpg" },
  { slug: "alerjik-reaksiyon", order: 31, title: "Alerjik Reaksiyon", image: "/algorithms/acil-yaklasimlar/alerjik-reaksiyon.jpg" },
  { slug: "anafilaksi-anahtar-noktalar", order: 32, title: "Anafilaksi Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/anafilaksi-anahtar-noktalar.jpg" },
  { slug: "anafilaksi", order: 33, title: "Anafilaksi", image: "/algorithms/acil-yaklasimlar/anafilaksi.jpg" },
  { slug: "hipertermi-anahtar-noktalar", order: 34, title: "Hipertermi Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/hipertermi-anahtar-noktalar.jpg" },
  { slug: "hipertermi", order: 35, title: "Hipertermi", image: "/algorithms/acil-yaklasimlar/hipertermi.jpg" },
  { slug: "hipotermi-anahtar-noktalar", order: 36, title: "Hipotermi Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/hipotermi-anahtar-noktalar.jpg" },
  { slug: "hipotermi", order: 37, title: "Hipotermi", image: "/algorithms/acil-yaklasimlar/hipotermi.jpg" },
  { slug: "hipotermide-arrest-yonetimi-anahtar-noktalar", order: 38, title: "Hipotermide Arrest Yönetimi Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/hipotermide-arrest-yonetimi-anahtar-noktalar.jpg" },
  { slug: "hipotermide-arrest-yonetimi", order: 39, title: "Hipotermide Arrest Yönetimi", image: "/algorithms/acil-yaklasimlar/hipotermide-arrest-yonetimi.jpg" },
  { slug: "isirma-ve-sokmalar-anahtar-noktalar", order: 40, title: "Isırma ve Sokmalar Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/isirma-ve-sokmalar-anahtar-noktalar.jpg" },
  { slug: "isirma-ve-sokmalar", order: 41, title: "Isırma ve Sokmalar", image: "/algorithms/acil-yaklasimlar/isirma-ve-sokmalar.jpg" },
  { slug: "suda-bogulma-anahtar-noktalar", order: 42, title: "Suda Boğulma Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/suda-bogulma-anahtar-noktalar.jpg" },
  { slug: "suda-bogulma", order: 43, title: "Suda Boğulma", image: "/algorithms/acil-yaklasimlar/suda-bogulma.jpg" },
  { slug: "yanik-anahtar-noktalar-sivi-ve-transfer", order: 44, title: "Yanık Anahtar Noktalar (Sıvı ve Transfer)", image: "/algorithms/acil-yaklasimlar/yanik-anahtar-noktalar-sivi-ve-transfer.jpg" },
  { slug: "yanik-anahtar-noktalar-vucut-yuzey-alani", order: 45, title: "Yanık Anahtar Noktalar (Vücut Yüzey Alanı)", image: "/algorithms/acil-yaklasimlar/yanik-anahtar-noktalar-vucut-yuzey-alani.jpg" },
  { slug: "termal-yanik", order: 46, title: "Termal Yanık", image: "/algorithms/acil-yaklasimlar/termal-yanik.jpg" },
  { slug: "elektrik-yaniklari", order: 47, title: "Elektrik Yanıkları", image: "/algorithms/acil-yaklasimlar/elektrik-yaniklari.jpg" },
  { slug: "kimyasal-yaniklar", order: 48, title: "Kimyasal Yanıklar", image: "/algorithms/acil-yaklasimlar/kimyasal-yaniklar.jpg" },
  { slug: "zehirlenmelere-genel-yaklasim-anahtar-noktalar", order: 49, title: "Zehirlenmelere Genel Yaklaşım Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/zehirlenmelere-genel-yaklasim-anahtar-noktalar.jpg" },
  { slug: "zehirlenmelere-genel-yaklasim", order: 50, title: "Zehirlenmelere Genel Yaklaşım", image: "/algorithms/acil-yaklasimlar/zehirlenmelere-genel-yaklasim.jpg" },
  { slug: "yuksek-doz-i-lac-alimi", order: 51, title: "Yüksek Doz İlaç Alımı", image: "/algorithms/acil-yaklasimlar/yuksek-doz-i-lac-alimi.jpg" },
  { slug: "karbonmonoksit-zehirlenmesi", order: 52, title: "Karbonmonoksit Zehirlenmesi", image: "/algorithms/acil-yaklasimlar/karbonmonoksit-zehirlenmesi.jpg" },
  { slug: "kalsiyum-kanal-blokerleri-beta-blokerlerle-zehirlenme-anahtar-noktalar", order: 53, title: "Kalsiyum Kanal Blokerleri / Beta Blokerlerle Zehirlenme Anahtar Noktalar", image: "/algorithms/acil-yaklasimlar/kalsiyum-kanal-blokerleri-beta-blokerlerle-zehirlenme-anahtar-noktalar.jpg" },
];

export function findAlgorithmTopic(slug: string): AlgorithmTopic | undefined {
  return acilYaklasimlarTopics.find((t) => t.slug === slug);
}

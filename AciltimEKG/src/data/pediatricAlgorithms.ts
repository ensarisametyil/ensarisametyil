// "Pediatri Algoritmalar" (pediatri) — 56 konu, statik veri.
//
// Bu kategori kasıtlı olarak veritabanına (Postgres) bağlı DEĞİLDİR — EKG
// kütüphanesinde (src/data/rhythms.ts) ve Yetişkin Algoritmalar'da
// (src/data/algorithms.ts) kullanılan yöntemin birebir aynısı: görseller
// public/algorithms/pediatri/ altında, başlık/sıra/görsel eşlemesi burada
// sabit kodlanmış. Admin panelden düzenlenemez (bkz.
// src/pages/admin/AdminPediatricAlgorithmsReadOnly.tsx) — EKG ve Yetişkin
// Algoritmalar ile aynı "salt okunur" muamelesi görür.
//
// Kaynak: T.C. Sağlık Bakanlığı hastane öncesi çocuk algoritma seti.
// Her konu SADECE ilgili görseli gösterir; ek açıklama metni yoktur.
//
// Sıralama, her görselin sağ alt köşesinde basılı sayfa numarasına göre
// doğrulanmıştır (84-139, boşluksuz) — bu sıra, dosya adı sıralaması
// (WhatsApp zaman damgası + parantez son eki) ile birebir örtüşmektedir.

export interface PediatricAlgorithmTopic {
  slug: string;
  order: number;
  title: string;
  image: string;
}

export const pediatriTopics: PediatricAlgorithmTopic[] = [
  { slug: "olay-yeri-yonetimi", order: 1, title: "Olay Yeri Yönetimi", image: "/algorithms/pediatri/olay-yeri-yonetimi.jpg" },
  { slug: "acil-olgu-yonetimi-anahtar-noktalar", order: 2, title: "Acil Olgu Yönetimi Anahtar Noktalar", image: "/algorithms/pediatri/acil-olgu-yonetimi-anahtar-noktalar.jpg" },
  { slug: "acil-olgu-yonetimi", order: 3, title: "Acil Olgu Yönetimi", image: "/algorithms/pediatri/acil-olgu-yonetimi.jpg" },
  { slug: "yabanci-cisme-bagli-hava-yolu-tikanikligi-anahtar-noktalar", order: 4, title: "Yabancı Cisme Bağlı Hava Yolu Tıkanıklığı Anahtar Noktalar", image: "/algorithms/pediatri/yabanci-cisme-bagli-hava-yolu-tikanikligi-anahtar-noktalar.jpg" },
  { slug: "yabanci-cisme-bagli-hava-yolu-tikanikligi", order: 5, title: "Yabancı Cisme Bağlı Hava Yolu Tıkanıklığı", image: "/algorithms/pediatri/yabanci-cisme-bagli-hava-yolu-tikanikligi.jpg" },
  { slug: "astim-anahtar-noktalar", order: 6, title: "Astım Anahtar Noktalar", image: "/algorithms/pediatri/astim-anahtar-noktalar.jpg" },
  { slug: "astim", order: 7, title: "Astım", image: "/algorithms/pediatri/astim.jpg" },
  { slug: "epiglottit", order: 8, title: "Epiglottit", image: "/algorithms/pediatri/epiglottit.jpg" },
  { slug: "krup-anahtar-noktalar-siddet-skorlamasi", order: 9, title: "Krup Anahtar Noktalar (Şiddet Skorlaması)", image: "/algorithms/pediatri/krup-anahtar-noktalar-siddet-skorlamasi.jpg" },
  { slug: "krup-anahtar-noktalar-tedavi", order: 10, title: "Krup Anahtar Noktalar (Tedavi)", image: "/algorithms/pediatri/krup-anahtar-noktalar-tedavi.jpg" },
  { slug: "krup", order: 11, title: "Krup", image: "/algorithms/pediatri/krup.jpg" },
  { slug: "hipovolemik-sok-anahtar-noktalar", order: 12, title: "Hipovolemik Şok Anahtar Noktalar", image: "/algorithms/pediatri/hipovolemik-sok-anahtar-noktalar.jpg" },
  { slug: "hipovolemik-sok", order: 13, title: "Hipovolemik Şok", image: "/algorithms/pediatri/hipovolemik-sok.jpg" },
  { slug: "kardiyojenik-sok-anahtar-noktalar", order: 14, title: "Kardiyojenik Şok Anahtar Noktalar", image: "/algorithms/pediatri/kardiyojenik-sok-anahtar-noktalar.jpg" },
  { slug: "kardiyojenik-sok", order: 15, title: "Kardiyojenik Şok", image: "/algorithms/pediatri/kardiyojenik-sok.jpg" },
  { slug: "etiyolojisi-saptanmamis-sok-tablosuna-yaklasim", order: 16, title: "Etiyolojisi Saptanmamış Şok Tablosuna Yaklaşım", image: "/algorithms/pediatri/etiyolojisi-saptanmamis-sok-tablosuna-yaklasim.jpg" },
  { slug: "septik-sok-anahtar-noktalar", order: 17, title: "Septik Şok Anahtar Noktalar", image: "/algorithms/pediatri/septik-sok-anahtar-noktalar.jpg" },
  { slug: "septik-sok", order: 18, title: "Septik Şok", image: "/algorithms/pediatri/septik-sok.jpg" },
  { slug: "bradikardi-anahtar-noktalar", order: 19, title: "Bradikardi Anahtar Noktalar", image: "/algorithms/pediatri/bradikardi-anahtar-noktalar.jpg" },
  { slug: "bradikardi", order: 20, title: "Bradikardi", image: "/algorithms/pediatri/bradikardi.jpg" },
  { slug: "tasikardi-nabizli-anahtar-noktalar", order: 21, title: "Taşikardi (Nabızlı) Anahtar Noktalar", image: "/algorithms/pediatri/tasikardi-nabizli-anahtar-noktalar.jpg" },
  { slug: "tasikardi-nabizli", order: 22, title: "Taşikardi (Nabızlı)", image: "/algorithms/pediatri/tasikardi-nabizli.jpg" },
  { slug: "arrest-yonetimi-anahtar-noktalar", order: 23, title: "Arrest Yönetimi Anahtar Noktalar", image: "/algorithms/pediatri/arrest-yonetimi-anahtar-noktalar.jpg" },
  { slug: "arrest-yonetimi", order: 24, title: "Arrest Yönetimi", image: "/algorithms/pediatri/arrest-yonetimi.jpg" },
  { slug: "soklanir-ritim-anahtar-noktalar", order: 25, title: "Şoklanır Ritim Anahtar Noktalar", image: "/algorithms/pediatri/soklanir-ritim-anahtar-noktalar.jpg" },
  { slug: "soklanir-ritim-vf-nabizsiz-vt", order: 26, title: "Şoklanır Ritim VF / Nabızsız VT", image: "/algorithms/pediatri/soklanir-ritim-vf-nabizsiz-vt.jpg" },
  { slug: "soklanamaz-ritim-asistoli-nea", order: 27, title: "Şoklanamaz Ritim Asistoli / NEA", image: "/algorithms/pediatri/soklanamaz-ritim-asistoli-nea.jpg" },
  { slug: "resusitasyon-sonrasi-bakim-anahtar-noktalar", order: 28, title: "Resüsitasyon Sonrası Bakım Anahtar Noktalar", image: "/algorithms/pediatri/resusitasyon-sonrasi-bakim-anahtar-noktalar.jpg" },
  { slug: "resusitasyon-sonrasi-bakim", order: 29, title: "Resüsitasyon Sonrası Bakım", image: "/algorithms/pediatri/resusitasyon-sonrasi-bakim.jpg" },
  { slug: "bilinc-degisiklikleri-anahtar-noktalar", order: 30, title: "Bilinç Değişiklikleri Anahtar Noktalar", image: "/algorithms/pediatri/bilinc-degisiklikleri-anahtar-noktalar.jpg" },
  { slug: "bilinc-degisiklikleri", order: 31, title: "Bilinç Değişiklikleri", image: "/algorithms/pediatri/bilinc-degisiklikleri.jpg" },
  { slug: "nobet-konvulziyon-anahtar-noktalar", order: 32, title: "Nöbet/Konvülziyon Anahtar Noktalar", image: "/algorithms/pediatri/nobet-konvulziyon-anahtar-noktalar.jpg" },
  { slug: "nobet-konvulziyon", order: 33, title: "Nöbet/Konvülziyon", image: "/algorithms/pediatri/nobet-konvulziyon.jpg" },
  { slug: "ates-yonetimi-anahtar-noktalar", order: 34, title: "Ateş Yönetimi Anahtar Noktalar", image: "/algorithms/pediatri/ates-yonetimi-anahtar-noktalar.jpg" },
  { slug: "ates-yonetimi", order: 35, title: "Ateş Yönetimi", image: "/algorithms/pediatri/ates-yonetimi.jpg" },
  { slug: "hiperglisemi", order: 36, title: "Hiperglisemi", image: "/algorithms/pediatri/hiperglisemi.jpg" },
  { slug: "hipoglisemi-anahtar-noktalar", order: 37, title: "Hipoglisemi Anahtar Noktalar", image: "/algorithms/pediatri/hipoglisemi-anahtar-noktalar.jpg" },
  { slug: "hipoglisemi", order: 38, title: "Hipoglisemi", image: "/algorithms/pediatri/hipoglisemi.jpg" },
  { slug: "anafilaksi-anahtar-noktalar", order: 39, title: "Anafilaksi Anahtar Noktalar", image: "/algorithms/pediatri/anafilaksi-anahtar-noktalar.jpg" },
  { slug: "anafilaksi", order: 40, title: "Anafilaksi", image: "/algorithms/pediatri/anafilaksi.jpg" },
  { slug: "hipertermi-anahtar-noktalar", order: 41, title: "Hipertermi Anahtar Noktalar", image: "/algorithms/pediatri/hipertermi-anahtar-noktalar.jpg" },
  { slug: "hipertermi", order: 42, title: "Hipertermi", image: "/algorithms/pediatri/hipertermi.jpg" },
  { slug: "hipotermi-anahtar-noktalar", order: 43, title: "Hipotermi Anahtar Noktalar", image: "/algorithms/pediatri/hipotermi-anahtar-noktalar.jpg" },
  { slug: "hipotermi", order: 44, title: "Hipotermi", image: "/algorithms/pediatri/hipotermi.jpg" },
  { slug: "hipotermide-arrest-yonetimi-anahtar-noktalar", order: 45, title: "Hipotermide Arrest Yönetimi Anahtar Noktalar", image: "/algorithms/pediatri/hipotermide-arrest-yonetimi-anahtar-noktalar.jpg" },
  { slug: "hipotermide-arrest-yonetimi", order: 46, title: "Hipotermide Arrest Yönetimi", image: "/algorithms/pediatri/hipotermide-arrest-yonetimi.jpg" },
  { slug: "isirma-ve-sokmalar", order: 47, title: "Isırma ve Sokmalar", image: "/algorithms/pediatri/isirma-ve-sokmalar.jpg" },
  { slug: "suda-bogulma-anahtar-noktalar", order: 48, title: "Suda Boğulma Anahtar Noktalar", image: "/algorithms/pediatri/suda-bogulma-anahtar-noktalar.jpg" },
  { slug: "suda-bogulma", order: 49, title: "Suda Boğulma", image: "/algorithms/pediatri/suda-bogulma.jpg" },
  { slug: "yanik-anahtar-noktalar-sivi-ve-transfer", order: 50, title: "Yanık Anahtar Noktalar (Sıvı ve Transfer)", image: "/algorithms/pediatri/yanik-anahtar-noktalar-sivi-ve-transfer.jpg" },
  { slug: "yanik-anahtar-noktalar-vucut-yuzey-alani", order: 51, title: "Yanık Anahtar Noktalar (Vücut Yüzey Alanı)", image: "/algorithms/pediatri/yanik-anahtar-noktalar-vucut-yuzey-alani.jpg" },
  { slug: "yanik", order: 52, title: "Yanık", image: "/algorithms/pediatri/yanik.jpg" },
  { slug: "toksikoloji-zehirlenme-doz-asimi", order: 53, title: "Toksikoloji-Zehirlenme Doz Aşımı", image: "/algorithms/pediatri/toksikoloji-zehirlenme-doz-asimi.jpg" },
  { slug: "jump-start-triyaj-anahtar-noktalar", order: 54, title: "Jump Start Triyaj Anahtar Noktalar", image: "/algorithms/pediatri/jump-start-triyaj-anahtar-noktalar.jpg" },
  { slug: "jump-start-triyaj", order: 55, title: "Jump Start Triyaj", image: "/algorithms/pediatri/jump-start-triyaj.jpg" },
  { slug: "travmali-hastada-acil-olgu-yonetimi", order: 56, title: "Travmalı Hastada Acil Olgu Yönetimi", image: "/algorithms/pediatri/travmali-hastada-acil-olgu-yonetimi.jpg" },
];

export function findPediatricTopic(slug: string): PediatricAlgorithmTopic | undefined {
  return pediatriTopics.find((t) => t.slug === slug);
}

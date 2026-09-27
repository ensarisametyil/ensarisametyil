// "Doğum ve Yenidoğan" (dogum-ve-yenidogan) — 8 konu, statik veri.
//
// Bu kategori kasıtlı olarak veritabanına (Postgres) bağlı DEĞİLDİR — EKG
// kütüphanesinde (src/data/rhythms.ts), Yetişkin Algoritmalar'da
// (src/data/algorithms.ts) ve Pediatri Algoritmalar'da
// (src/data/pediatricAlgorithms.ts) kullanılan yöntemin birebir aynısı:
// görseller public/algorithms/dogum-ve-yenidogan/ altında, başlık/sıra/görsel
// eşlemesi burada sabit kodlanmış. Admin panelden düzenlenemez (bkz.
// src/pages/admin/AdminDogumReadOnly.tsx) — diğer statik kategorilerle aynı
// "salt okunur" muamelesi görür.
//
// Kaynak: T.C. Sağlık Bakanlığı hastane öncesi doğum ve yenidoğan algoritma
// seti. Her konu SADECE ilgili görseli gösterir; ek açıklama metni yoktur.
//
// Sıralama, her görselin sağ alt köşesinde basılı sayfa numarasına göre
// doğrulanmıştır (75-82, boşluksuz) — bu sıra, dosya adı sıralaması
// (WhatsApp zaman damgası + parantez son eki) ile birebir örtüşmektedir.

export interface DogumTopic {
  slug: string;
  order: number;
  title: string;
  image: string;
}

export const dogumVeYenidoganTopics: DogumTopic[] = [
  { slug: "acil-dogum-eylemi", order: 1, title: "Acil Doğum Eylemi", image: "/algorithms/dogum-ve-yenidogan/acil-dogum-eylemi.jpg" },
  { slug: "dogum-komplikasyonlari", order: 2, title: "Doğum Komplikasyonları", image: "/algorithms/dogum-ve-yenidogan/dogum-komplikasyonlari.jpg" },
  { slug: "postpartum-kanama", order: 3, title: "Postpartum Kanama", image: "/algorithms/dogum-ve-yenidogan/postpartum-kanama.jpg" },
  { slug: "gebelikte-akut-hipertansiyon-yonetimi", order: 4, title: "Gebelikte Akut Hipertansiyon Yönetimi", image: "/algorithms/dogum-ve-yenidogan/gebelikte-akut-hipertansiyon-yonetimi.jpg" },
  { slug: "ucuncu-trimestr-nobetler-eklampsi", order: 5, title: "Üçüncü Trimestr Nöbetler (Eklampsi)", image: "/algorithms/dogum-ve-yenidogan/ucuncu-trimestr-nobetler-eklampsi.jpg" },
  { slug: "normal-yenidogan-bakimi", order: 6, title: "Normal Yenidoğan Bakımı", image: "/algorithms/dogum-ve-yenidogan/normal-yenidogan-bakimi.jpg" },
  { slug: "yenidogan-canlandirmasi-anahtar-noktalar", order: 7, title: "Yenidoğan Canlandırması Anahtar Noktalar", image: "/algorithms/dogum-ve-yenidogan/yenidogan-canlandirmasi-anahtar-noktalar.jpg" },
  { slug: "yenidogan-canlandirmasi", order: 8, title: "Yenidoğan Canlandırması", image: "/algorithms/dogum-ve-yenidogan/yenidogan-canlandirmasi.jpg" },
];

export function findDogumTopic(slug: string): DogumTopic | undefined {
  return dogumVeYenidoganTopics.find((t) => t.slug === slug);
}

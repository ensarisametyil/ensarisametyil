// EKG ritim kütüphanesi — başlıklar ve görsel altyazıları kaynak bundle'dan
// bire bir alınmıştır. Görsellerin kendisi kaynakta bulunmuyordu (yalnızca
// alt-text/caption dizesi kurtarıldı); bu yüzden her ritim burada gerçek
// başlık + gerçek altyazı ile, görsel alanı yer tutucu olarak modellenmiştir.

export interface RhythmGroup {
  heading: string;
  items: { title: string; caption: string; slug: string }[];
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function r(title: string, caption: string) {
  return { title, caption, slug: slugify(title) };
}

export const rhythmGroups: RhythmGroup[] = [
  {
    heading: "Sinüs Ritimleri",
    items: [
      r("Normal Sinüs Ritmi", "12 derivasyonlu EKG"),
      r("Sinüs Bradikardisi", "12 derivasyonlu EKG"),
      r("Sinüs Taşikardisi", "12 derivasyonlu EKG"),
      r("Sinüs Aritmisi", "12 derivasyonlu EKG"),
      r("Sinüzel Blok", "EKG örneği"),
      r("Sinüzel Arrest", "EKG örneği"),
    ],
  },
  {
    heading: "Atriyal Ritimler",
    items: [
      r("Atriyal Fibrilasyon", "12 derivasyonlu EKG"),
      r("Atriyal Flutter", "EKG örnekleri"),
      r("Multifokal Atriyal Taşikardi", "EKG örneği"),
      r("Atriyal Taşikardi", "EKG örneği"),
      r("Supraventriküler Taşikardi (SVT)", "12 derivasyonlu EKG"),
    ],
  },
  {
    heading: "Ventriküler Ritimler",
    items: [
      r("Monomorfik Ventriküler Taşikardi", "EKG örneği"),
      r("Polimorfik Ventriküler Taşikardi", "EKG örneği"),
      r("Torsades de Pointes", "EKG örneği"),
      r("Ventriküler Fibrilasyon (VF)", "EKG örneği"),
    ],
  },
  {
    heading: "İleti Bozuklukları",
    items: [
      r("1. Derece AV Blok", "12 derivasyonlu EKG"),
      r("2. Derece Tip 1 AV Blok", "12 derivasyonlu EKG"),
      r("2. Derece Tip 2 AV Blok", "12 derivasyonlu EKG"),
      r("3. Derece AV Tam Blok", "EKG örneği"),
      r("Sağ Dal Bloğu (RBBB)", "12 derivasyonlu EKG"),
      r("Sol Dal Bloğu (LBBB)", "12 derivasyonlu EKG"),
    ],
  },
  {
    heading: "Sendromlar ve Özel Bulgular",
    items: [
      r("Wolff-Parkinson-White Sendromu", "12 derivasyonlu EKG"),
      r("Brugada Sendromu", "12 derivasyonlu EKG"),
      r("Sgarbossa Kriterleri", "LBBB / pace ritmi"),
      r("Osborne (J) Dalgası", "V4–V5 derivasyonları"),
    ],
  },
  {
    heading: "Miyokard İnfarktüsü",
    items: [
      r("Miyokard İnfarktüsü", "Genel EKG görünümü"),
      r("STEMI", "12 derivasyonlu EKG"),
      r("NONSTEMI · ST Depresyonu", "ST depresyonu"),
      r("NONSTEMI · T Dalga İnversiyonu", "T dalga inversiyonu"),
    ],
  },
];

export const allRhythms = rhythmGroups.flatMap((g) => g.items);

export function findRhythm(slug: string) {
  return allRhythms.find((r) => r.slug === slug);
}

// "EKG'yi sırayla değerlendir" — kaynakta yer alan sistematik yaklaşım adımları.
export const systematicSteps = [
  { title: "Kalibrasyon", detail: "25 mm/sn, 10 mm/mV" },
  { title: "Ritim ve Hız", detail: undefined },
  { title: "P–QRS–T", detail: undefined },
  { title: "Aralıklar ve ST-T", detail: undefined },
];

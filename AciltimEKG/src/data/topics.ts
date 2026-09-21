import type { CategorySlug } from "./categories";

export type TopicKind = "algorithm" | "drug" | "rhythm" | "article";

export interface Topic {
  slug: string;
  /** Category this topic's route lives under: /kategori/:primaryCategory/:slug */
  primaryCategory: CategorySlug;
  /** Additional categories this topic is also indexed under. */
  crossCategories?: CategorySlug[];
  title: string;
  kind: TopicKind;
  /** Real alt-text captions recovered from the source for the flow/key-point visuals. */
  flowCaption?: string;
  keyPointsCaption?: string;
  /** True once real structured detail content exists for this topic (see drugs.ts, rhythms.ts). */
  hasDetail: boolean;
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

let seq = 0;
function algo(
  title: string,
  primaryCategory: CategorySlug,
  opts: { cross?: CategorySlug[]; keyPoints?: boolean; slugSuffix?: string } = {},
): Topic {
  seq += 1;
  const base = slugify(title);
  return {
    slug: opts.slugSuffix ? `${base}-${opts.slugSuffix}` : base,
    primaryCategory,
    crossCategories: opts.cross,
    title,
    kind: "algorithm",
    flowCaption: `${title} algoritma akışı`,
    keyPointsCaption: opts.keyPoints === false ? undefined : `${title} anahtar noktalar`,
    hasDetail: false,
  };
}

// Titles below are taken verbatim from the original application's compiled
// bundle (image alt-text for each algorithm's flow-chart / key-points
// visuals). Category placement follows the two parallel topic lists found in
// the source: a general/adult list (acil-yaklasimlar) and a pediatric list
// (pediatri) that mirrors many of the same concepts. Where a topic's real
// subject matter clearly belongs to a dedicated category (doğum-ve-yenidoğan,
// travma, toksikoloji, kardiyoloji) it is cross-listed there as well — no new
// topics or clinical content are introduced.

export const topics: Topic[] = [
  // --- Genel yaklaşım / sahne yönetimi (Yetişkin Algoritmalar) ---
  algo("Start Triyaj", "acil-yaklasimlar", { cross: ["travma"] }),
  algo("Acil Olgu Yönetimi", "acil-yaklasimlar"),
  algo("Travmalı Hastada Acil Olgu Yönetimi", "acil-yaklasimlar", { cross: ["travma"] }),
  algo("Bilinç Değişikliği", "acil-yaklasimlar"),
  algo("Olay Yeri Yönetimi", "acil-yaklasimlar", { cross: ["travma"], keyPoints: false }),

  // --- Arrest / kardiyoloji kümesi ---
  algo("Arrest Yönetimi", "acil-yaklasimlar", { cross: ["kardiyoloji"] }),
  algo("Şoklanabilir Ritim Yönetimi", "acil-yaklasimlar", { cross: ["kardiyoloji"] }),
  algo("Şoklanamaz Ritim Yönetimi", "acil-yaklasimlar", { cross: ["kardiyoloji"] }),
  algo("Resüsitasyon Sonrası Bakım", "acil-yaklasimlar", { cross: ["kardiyoloji"] }),
  algo("Akut Koroner Sendrom", "acil-yaklasimlar", { cross: ["kardiyoloji"] }),
  algo("Bradikardi Yaklaşım", "acil-yaklasimlar", { cross: ["kardiyoloji"] }),
  algo("Taşikardi Yaklaşım", "acil-yaklasimlar", { cross: ["kardiyoloji"], keyPoints: false }),
  algo("Akut Akciğer Ödemi ve Kardiyojenik Şok", "acil-yaklasimlar", { cross: ["kardiyoloji"] }),
  algo("Kardiyojenik Şok", "acil-yaklasimlar", { cross: ["kardiyoloji"] }),
  algo("Septik Şok", "acil-yaklasimlar"),
  algo("Hipovolemik Şok", "acil-yaklasimlar", { cross: ["travma"] }),

  // --- Solunum / metabolik / nörolojik ---
  algo("Hipertermi", "acil-yaklasimlar"),
  algo("Hipotermi", "acil-yaklasimlar"),
  algo("Hipotermide Arrest Yönetimi", "acil-yaklasimlar", { cross: ["kardiyoloji"] }),
  algo("Alerjik Reaksiyon", "acil-yaklasimlar", { keyPoints: false }),
  algo("Anafilaksi", "acil-yaklasimlar"),
  algo("Nöbet / Konvülziyon", "acil-yaklasimlar"),
  algo("Diyabetik Aciller", "acil-yaklasimlar", { keyPoints: false }),
  algo("Hiperglisemi", "acil-yaklasimlar", { keyPoints: false }),
  algo("Hipoglisemi", "acil-yaklasimlar"),
  algo("Hava Yolu Tıkanıklıkları", "acil-yaklasimlar", { keyPoints: false }),
  algo("Yabancı Cisme Bağlı Havayolu Tıkanıklığı", "acil-yaklasimlar"),
  algo("KOAH", "acil-yaklasimlar"),
  algo("Astım", "acil-yaklasimlar"),
  algo("İnme / SVO", "acil-yaklasimlar", { keyPoints: false }),
  algo("Vertigo", "acil-yaklasimlar", { keyPoints: false }),
  algo("Ateş Yönetimi", "acil-yaklasimlar"),

  // --- Travma / çevresel ---
  algo("Kafa Travmalı Hastaya Yaklaşım", "acil-yaklasimlar", { cross: ["travma"] }),
  algo("Yanık Yüzdesi ve Vücut Yüzey Alanı", "acil-yaklasimlar", { cross: ["travma"], keyPoints: false }),
  algo("Yanıkta Sıvı Tedavisi ve Transfer Kriterleri", "acil-yaklasimlar", { cross: ["travma"], keyPoints: false }),
  algo("Termal Yanık", "acil-yaklasimlar", { cross: ["travma"], keyPoints: false }),
  algo("Elektrik Yanıkları", "acil-yaklasimlar", { cross: ["travma"], keyPoints: false }),
  algo("Kimyasal Yanıklar", "acil-yaklasimlar", { cross: ["travma"], keyPoints: false }),
  algo("Suda Boğulma", "acil-yaklasimlar", { cross: ["travma"] }),
  algo("Isırma ve Sokmalar", "acil-yaklasimlar", { cross: ["toksikoloji"] }),
  algo("Ajite Hastaya Yaklaşım", "acil-yaklasimlar"),
  algo("Crush Sendromu", "acil-yaklasimlar", { cross: ["travma"] }),

  // --- Toksikoloji ---
  algo("Zehirlenmelere Genel Yaklaşım", "acil-yaklasimlar", { cross: ["toksikoloji"] }),
  algo("Yüksek Doz İlaç Alımı", "acil-yaklasimlar", { cross: ["toksikoloji"], keyPoints: false }),
  algo("Kalsiyum Kanal ve Beta Bloker Zehirlenmesi", "acil-yaklasimlar", { cross: ["toksikoloji"] }),
  algo("Trisiklik Antidepresan Zehirlenmesi", "acil-yaklasimlar", { cross: ["toksikoloji"] }),
  algo("Kolinerjik Ajanlarla Zehirlenme", "acil-yaklasimlar", { cross: ["toksikoloji"] }),
  algo("Narkotik / Opioid Zehirlenmesi", "acil-yaklasimlar", { cross: ["toksikoloji"] }),
  algo("Karbonmonoksit Zehirlenmesi", "acil-yaklasimlar", { cross: ["toksikoloji"], keyPoints: false }),

  // --- Doğum ve Yenidoğan ---
  algo("Acil Doğum Eylemi", "dogum-ve-yenidogan", { keyPoints: false }),
  algo("Doğum Komplikasyonları", "dogum-ve-yenidogan", { keyPoints: false }),
  algo("Postpartum Kanama", "dogum-ve-yenidogan", { keyPoints: false }),
  algo("Gebelikte Akut Hipertansiyon Yönetimi", "dogum-ve-yenidogan", { keyPoints: false }),
  algo("Üçüncü Trimester Nöbetler (Eklampsi)", "dogum-ve-yenidogan", { keyPoints: false }),
  algo("Normal Yenidoğan Bakımı", "dogum-ve-yenidogan", { keyPoints: false }),
  algo("Yenidoğan Canlandırması", "dogum-ve-yenidogan"),

  // --- Pediatri Algoritmalar (paralel pediatrik liste; kaynakta aynı başlıklar ikinci kez geçer) ---
  algo("Jump Start Triyaj", "pediatri"),
  algo("Astım", "pediatri", { slugSuffix: "pediatri" }),
  algo("Hipovolemik Şok", "pediatri", { slugSuffix: "pediatri" }),
  algo("Kardiyojenik Şok", "pediatri", { slugSuffix: "pediatri" }),
  algo("Septik Şok", "pediatri", { slugSuffix: "pediatri" }),
  algo("Bradikardi", "pediatri"),
  algo("Taşikardi", "pediatri"),
  algo("Arrest Yönetimi", "pediatri", { slugSuffix: "pediatri" }),
  algo("Şoklanır Ritim: VF / Nabızsız VT", "pediatri"),
  algo("Şoklanamaz Ritim: Asistoli / NEA", "pediatri", { keyPoints: false }),
  algo("Resüsitasyon Sonrası Bakım", "pediatri", { slugSuffix: "pediatri" }),
  algo("Hipotermide Arrest Yönetimi", "pediatri", { slugSuffix: "pediatri" }),
  algo("Bilinç Değişiklikleri", "pediatri"),
  algo("Nöbet / Konvülziyon", "pediatri", { slugSuffix: "pediatri" }),
  algo("Ateş Yönetimi", "pediatri", { slugSuffix: "pediatri" }),
  algo("Hipertermi", "pediatri", { slugSuffix: "pediatri" }),
  algo("Hipotermi", "pediatri", { slugSuffix: "pediatri" }),
  algo("Hiperglisemi", "pediatri", { slugSuffix: "pediatri" }),
  algo("Hipoglisemi", "pediatri", { slugSuffix: "pediatri" }),
  algo("Anafilaksi", "pediatri", { slugSuffix: "pediatri" }),
  algo("Isırma ve Sokmalar", "pediatri", { slugSuffix: "pediatri", keyPoints: false }),
  algo("Suda Boğulma", "pediatri", { slugSuffix: "pediatri" }),
  algo("Yanık Yönetimi", "pediatri", { cross: ["travma"], keyPoints: false }),
  algo("Yanık Alanı Hesaplama", "pediatri", { cross: ["travma"] }),
  algo("Yanık Transferi ve Sıvı Resüsitasyonu", "pediatri", { cross: ["travma"], keyPoints: false }),
  algo("Toksikoloji, Zehirlenme ve Doz Aşımı", "pediatri", { cross: ["toksikoloji"], keyPoints: false }),
  algo("Yabancı Cisme Bağlı Havayolu Tıkanıklığı", "pediatri", { slugSuffix: "pediatri" }),
  algo("Epiglotit", "pediatri", { keyPoints: false }),
  algo("Krup", "pediatri", { keyPoints: false }),
  algo("Westley Krup Şiddeti Skorlaması", "pediatri", { keyPoints: false }),
  algo("Krup Şiddetine Göre Tedavi", "pediatri", { keyPoints: false }),
];

// --- İlaçlar: yalnızca kaynakta tam doz kartı bulunan 3 ilaç ---
export const drugTopics: Topic[] = [
  {
    slug: "adenozin",
    primaryCategory: "ilaclar",
    title: "Adenozin",
    kind: "drug",
    hasDetail: true,
  },
  {
    slug: "amiodaron",
    primaryCategory: "ilaclar",
    crossCategories: ["kardiyoloji"],
    title: "Amiodaron",
    kind: "drug",
    hasDetail: true,
  },
  {
    slug: "atropin",
    primaryCategory: "ilaclar",
    title: "Atropin",
    kind: "drug",
    hasDetail: true,
  },
];

topics.push(...drugTopics);

export function topicsByCategory(category: CategorySlug): Topic[] {
  return topics.filter(
    (t) => t.primaryCategory === category || t.crossCategories?.includes(category),
  );
}

export function findTopic(category: CategorySlug, slug: string): Topic | undefined {
  return topics.find(
    (t) => t.slug === slug && (t.primaryCategory === category || t.crossCategories?.includes(category)),
  );
}

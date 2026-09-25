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

/** Kept for future re-population of the currently-empty categories below. */
export function algo(
  title: string,
  primaryCategory: CategorySlug,
  opts: { cross?: CategorySlug[]; keyPoints?: boolean; slugSuffix?: string } = {},
): Topic {
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

// Yetişkin Algoritmalar, Pediatri Algoritmalar, Doğum ve Yenidoğan, İlaçlar
// ve Toksikoloji kategorileri şu an kasıtlı olarak BOŞTUR: bu kategoriler
// için hiçbir alt başlık eklenmemiştir. Kategori sayfaları ve "Bilgi
// Alanları" kartları bu kategorileri "0 hızlı referans konusu" ve "İçerik
// hazırlanıyor" durumuyla gösterir. `algo()` yardımcı fonksiyonu, ileride bu
// kategoriler gerçek içerikle doldurulduğunda aynı veri şemasını kullanmak
// üzere korunmuştur.
export const topics: Topic[] = [];

// --- İlaçlar: kategori boş bırakılmıştır, ilaç kartı eklenmemiştir. ---
export const drugTopics: Topic[] = [];

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

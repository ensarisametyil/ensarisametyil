// The 7 fixed "Bilgi Alanları" categories. EKG (src/data/rhythms.ts) and
// Yetişkin Algoritmalar (src/data/algorithms.ts) are managed separately as
// static frontend data, untouched by this admin system — the other 5 are
// backed by the database and manageable here.
export const DYNAMIC_CATEGORIES = [
  { slug: "pediatri", label: "Pediatri Algoritmalar" },
  { slug: "dogum-ve-yenidogan", label: "Doğum ve Yenidoğan" },
  { slug: "ilaclar", label: "İlaçlar" },
  { slug: "toksikoloji", label: "Toksikoloji" },
  { slug: "makaleler", label: "Makaleler" },
] as const;

export type DynamicCategorySlug = (typeof DYNAMIC_CATEGORIES)[number]["slug"];

export function isDynamicCategory(slug: string): slug is DynamicCategorySlug {
  return DYNAMIC_CATEGORIES.some((c) => c.slug === slug);
}

export function categoryLabel(slug: string): string {
  return DYNAMIC_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

// The 7 fixed "Bilgi Alanları" categories. EKG (src/data/rhythms.ts),
// Yetişkin Algoritmalar (src/data/algorithms.ts), Pediatri Algoritmalar
// (src/data/pediatricAlgorithms.ts), Doğum ve Yenidoğan
// (src/data/dogumVeYenidogan.ts) and İlaçlar (src/data/ilaclar.ts) are
// managed separately as static frontend data, untouched by this admin
// system — the other 2 are backed by the database and manageable here.
export const DYNAMIC_CATEGORIES = [
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

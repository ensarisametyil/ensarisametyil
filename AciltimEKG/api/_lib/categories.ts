// The 7 fixed "Bilgi Alanları" categories. EKG (src/data/rhythms.ts),
// Yetişkin Algoritmalar (src/data/algorithms.ts), Pediatri Algoritmalar
// (src/data/pediatricAlgorithms.ts), Doğum ve Yenidoğan
// (src/data/dogumVeYenidogan.ts) and İlaçlar (src/data/ilaclar.ts) are
// managed separately as static frontend data, untouched by this admin
// system — Makaleler is backed by the database and manageable here.
//
// "Toksikoloji" was removed from here by request (hidden from the admin
// panel and public site), but its rows in the `topics` table are left
// untouched — re-adding `{ slug: "toksikoloji", label: "Toksikoloji" }`
// here (and in src/data/categories.ts / src/lib/dynamicCategories.ts)
// restores it with no data loss.
export const DYNAMIC_CATEGORIES = [{ slug: "makaleler", label: "Makaleler" }] as const;

export type DynamicCategorySlug = (typeof DYNAMIC_CATEGORIES)[number]["slug"];

export function isDynamicCategory(slug: string): slug is DynamicCategorySlug {
  return DYNAMIC_CATEGORIES.some((c) => c.slug === slug);
}

export function categoryLabel(slug: string): string {
  return DYNAMIC_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

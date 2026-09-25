// The 7 fixed "Bilgi Alanları" categories. EKG is managed separately (static
// data in src/data/rhythms.ts, untouched by this admin system per the task
// brief) — the other 6 are backed by the database and manageable here.
export const DYNAMIC_CATEGORIES = [
  { slug: "acil-yaklasimlar", label: "Yetişkin Algoritmalar" },
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

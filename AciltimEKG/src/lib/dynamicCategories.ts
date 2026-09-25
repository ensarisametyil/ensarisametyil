// Mirrors AciltimEKG/api/_lib/categories.ts (kept as a separate small constant
// since the frontend build doesn't include the /api directory). EKG is
// managed separately (static data, read-only in the admin for now).
export const DYNAMIC_CATEGORIES = [
  { slug: "acil-yaklasimlar", label: "Yetişkin Algoritmalar" },
  { slug: "pediatri", label: "Pediatri Algoritmalar" },
  { slug: "dogum-ve-yenidogan", label: "Doğum ve Yenidoğan" },
  { slug: "ilaclar", label: "İlaçlar" },
  { slug: "toksikoloji", label: "Toksikoloji" },
  { slug: "makaleler", label: "Makaleler" },
] as const;

export type DynamicCategorySlug = (typeof DYNAMIC_CATEGORIES)[number]["slug"];

export function isDynamicCategory(slug: string | undefined): slug is DynamicCategorySlug {
  return !!slug && DYNAMIC_CATEGORIES.some((c) => c.slug === slug);
}

export function categoryLabel(slug: string): string {
  return DYNAMIC_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

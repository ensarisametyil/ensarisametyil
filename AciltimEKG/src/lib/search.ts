import { categories, type CategorySlug } from "../data/categories";
import { topics } from "../data/topics";
import { allRhythms } from "../data/rhythms";

export type SearchKind = "algorithm" | "drug" | "rhythm" | "category" | "article";

export interface SearchItem {
  title: string;
  subtitle: string;
  description: string;
  href: string;
  kind: SearchKind;
  categorySlug: CategorySlug | "ekg";
}

export const kindLabels: Record<SearchKind, string> = {
  algorithm: "Algoritmalar",
  drug: "İlaçlar",
  rhythm: "Ritimler",
  category: "Kategoriler",
  article: "Makaleler",
};

function normalize(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

const categoryLabel = (slug: CategorySlug) => categories.find((c) => c.slug === slug)?.label ?? slug;
const categoryDescription = (slug: CategorySlug) => categories.find((c) => c.slug === slug)?.description ?? "";

const index: SearchItem[] = [
  ...topics.map((t) => ({
    title: t.title,
    subtitle: categoryLabel(t.primaryCategory),
    description: categoryDescription(t.primaryCategory),
    href: `/kategori/${t.primaryCategory}/${t.slug}`,
    kind: (t.kind === "drug" ? "drug" : t.kind === "article" ? "article" : "algorithm") as SearchKind,
    categorySlug: t.primaryCategory,
  })),
  ...allRhythms.map((r) => ({
    title: r.title,
    subtitle: "EKG kütüphanesi",
    description: r.caption,
    href: `/ekg/${r.slug}`,
    kind: "rhythm" as SearchKind,
    categorySlug: "ekg" as const,
  })),
  ...categories.map((c) => ({
    title: c.label,
    subtitle: "Kategori",
    description: c.description,
    href: `/kategori/${c.slug}`,
    kind: "category" as SearchKind,
    categorySlug: c.slug,
  })),
];

export function search(query: string, kindFilter?: SearchKind): SearchItem[] {
  const q = normalize(query.trim());
  const pool = kindFilter ? index.filter((i) => i.kind === kindFilter) : index;
  if (!q) return kindFilter ? pool : [];
  return pool.filter((item) => normalize(item.title).includes(q) || normalize(item.subtitle).includes(q)).slice(0, 60);
}

export const searchableItems: SearchItem[] = index.filter((i) => i.kind !== "category");

export function matchesQuery(item: SearchItem, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  return normalize(item.title).includes(q) || normalize(item.subtitle).includes(q);
}

export interface SearchGroup {
  kind: SearchKind;
  label: string;
  items: SearchItem[];
}

export function searchGrouped(query: string, max = 6): SearchGroup[] {
  const results = search(query);
  const order: SearchKind[] = ["algorithm", "drug", "rhythm", "category", "article"];
  return order
    .map((kind) => ({ kind, label: kindLabels[kind], items: results.filter((r) => r.kind === kind).slice(0, max) }))
    .filter((g) => g.items.length > 0);
}

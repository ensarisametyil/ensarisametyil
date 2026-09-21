import { categories } from "../data/categories";
import { topics } from "../data/topics";
import { allRhythms } from "../data/rhythms";

export interface SearchItem {
  title: string;
  subtitle: string;
  href: string;
}

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

const categoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug;

const index: SearchItem[] = [
  ...topics.map((t) => ({
    title: t.title,
    subtitle: categoryLabel(t.primaryCategory),
    href: `/kategori/${t.primaryCategory}/${t.slug}`,
  })),
  ...allRhythms.map((r) => ({
    title: r.title,
    subtitle: "EKG kütüphanesi",
    href: `/ekg/${r.slug}`,
  })),
  ...categories.map((c) => ({
    title: c.label,
    subtitle: "Kategori",
    href: `/kategori/${c.slug}`,
  })),
];

export function search(query: string): SearchItem[] {
  const q = normalize(query.trim());
  if (!q) return [];
  return index.filter((item) => normalize(item.title).includes(q) || normalize(item.subtitle).includes(q)).slice(0, 30);
}

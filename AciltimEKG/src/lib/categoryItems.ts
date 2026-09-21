import type { CategorySlug } from "../data/categories";
import { topicsByCategory } from "../data/topics";
import { allRhythms } from "../data/rhythms";

export interface CategoryCardItem {
  slug: string;
  title: string;
  href: string;
  kindLabel: string;
  showWaveform?: boolean;
}

/**
 * The "Ritimler" category (confirmed real: slug + label recovered from the
 * source) has no entries in the algorithm/drug topic list — its real content
 * is the EKG rhythm library, which the source models as a separate
 * top-level section (/ekg). Rather than leaving this category empty, it
 * surfaces that same real rhythm data so the category isn't a dead end.
 */
export function itemsForCategory(categorySlug: CategorySlug): CategoryCardItem[] {
  if (categorySlug === "ritimler") {
    return allRhythms.map((r) => ({
      slug: r.slug,
      title: r.title,
      href: `/ekg/${r.slug}`,
      kindLabel: "Ritim",
      showWaveform: true,
    }));
  }
  return topicsByCategory(categorySlug).map((t) => ({
    slug: t.slug,
    title: t.title,
    href: `/kategori/${categorySlug}/${t.slug}`,
    kindLabel: t.kind === "drug" ? "İlaç Kartı" : "Algoritma",
  }));
}

import type { CategorySlug } from "../data/categories";
import { topicsByCategory } from "../data/topics";
import { ekgTopics } from "../data/rhythms";
import { acilYaklasimlarTopics } from "../data/algorithms";
import { pediatriTopics } from "../data/pediatricAlgorithms";
import { dogumVeYenidoganTopics } from "../data/dogumVeYenidogan";

export interface CategoryCardItem {
  slug: string;
  title: string;
  href: string;
  kindLabel: string;
  showWaveform?: boolean;
  imageUrl?: string | null;
}

/**
 * The "Ritimler" category (confirmed real: slug + label recovered from the
 * source) has no entries in the algorithm/drug topic list — its real content
 * is the EKG rhythm library, which the source models as a separate
 * top-level section (/ekg). Rather than leaving this category empty, it
 * surfaces that same real rhythm data so the category isn't a dead end.
 *
 * "Yetişkin Algoritmalar" (acil-yaklasimlar), "Pediatri Algoritmalar"
 * (pediatri) and "Doğum ve Yenidoğan" (dogum-ve-yenidogan) are likewise
 * static — their topics live in src/data/algorithms.ts,
 * src/data/pediatricAlgorithms.ts and src/data/dogumVeYenidogan.ts, not the
 * database, so these categories need no Postgres connection to display
 * content.
 */
export function itemsForCategory(categorySlug: CategorySlug): CategoryCardItem[] {
  if (categorySlug === "ritimler") {
    return ekgTopics.map((t) => ({
      slug: t.slug,
      title: t.title,
      href: `/ekg/${t.slug}`,
      kindLabel: "Ritim",
      showWaveform: true,
    }));
  }
  if (categorySlug === "acil-yaklasimlar") {
    return acilYaklasimlarTopics.map((t) => ({
      slug: t.slug,
      title: t.title,
      href: `/kategori/acil-yaklasimlar/${t.slug}`,
      kindLabel: "Konu",
      imageUrl: t.image,
    }));
  }
  if (categorySlug === "pediatri") {
    return pediatriTopics.map((t) => ({
      slug: t.slug,
      title: t.title,
      href: `/kategori/pediatri/${t.slug}`,
      kindLabel: "Konu",
      imageUrl: t.image,
    }));
  }
  if (categorySlug === "dogum-ve-yenidogan") {
    return dogumVeYenidoganTopics.map((t) => ({
      slug: t.slug,
      title: t.title,
      href: `/kategori/dogum-ve-yenidogan/${t.slug}`,
      kindLabel: "Konu",
      imageUrl: t.image,
    }));
  }
  return topicsByCategory(categorySlug).map((t) => ({
    slug: t.slug,
    title: t.title,
    href: `/kategori/${categorySlug}/${t.slug}`,
    kindLabel: t.kind === "drug" ? "İlaç Kartı" : "Algoritma",
  }));
}

import { categoryMap, type CategorySlug } from "../data/categories";
import { topics, type Topic } from "../data/topics";
import { drugs } from "../data/drugs";
import { allRhythms, rhythmGroups } from "../data/rhythms";

export interface RelatedItem {
  title: string;
  categoryLabel: string;
  href: string;
}

/** Related-content is derived purely from the existing category/cross-category graph — no new relationships are invented. */
export function relatedForTopic(topic: Topic, max = 6): RelatedItem[] {
  const categorySlugs = [topic.primaryCategory, ...(topic.crossCategories ?? [])];
  const siblings = topics.filter((t) => t.slug !== topic.slug && categorySlugs.some((c) => t.primaryCategory === c || t.crossCategories?.includes(c)));

  const items: RelatedItem[] = siblings.slice(0, max).map((t) => ({
    title: t.title,
    categoryLabel: categoryMap[t.primaryCategory].label,
    href: `/kategori/${t.primaryCategory}/${t.slug}`,
  }));

  // If this topic touches Kardiyoloji/EKG-adjacent ground, surface the EKG library and relevant drugs too.
  if (categorySlugs.includes("kardiyoloji") || categorySlugs.includes("acil-yaklasimlar")) {
    const relevantDrugs = drugs.filter((d) => d.slug === "amiodaron" || d.slug === "atropin").slice(0, 2);
    for (const d of relevantDrugs) {
      if (items.length >= max) break;
      items.push({ title: d.name, categoryLabel: "İlaçlar", href: `/kategori/ilaclar/${d.slug}` });
    }
  }

  return items.slice(0, max);
}

export function relatedForDrug(drugSlug: string, categorySlugs: CategorySlug[], max = 6): RelatedItem[] {
  const siblings = topics.filter((t) => categorySlugs.some((c) => t.primaryCategory === c || t.crossCategories?.includes(c)));
  const items: RelatedItem[] = siblings.slice(0, max).map((t) => ({
    title: t.title,
    categoryLabel: categoryMap[t.primaryCategory].label,
    href: `/kategori/${t.primaryCategory}/${t.slug}`,
  }));
  const otherDrugs = drugs.filter((d) => d.slug !== drugSlug);
  for (const d of otherDrugs) {
    if (items.length >= max) break;
    items.push({ title: d.name, categoryLabel: "İlaçlar", href: `/kategori/ilaclar/${d.slug}` });
  }
  return items.slice(0, max);
}

export function relatedForRhythm(rhythmSlug: string, max = 6): RelatedItem[] {
  const owningGroup = rhythmGroups.find((g) => g.items.some((i) => i.slug === rhythmSlug));
  const pool = owningGroup ? owningGroup.items : allRhythms;
  const siblings = pool.filter((r) => r.slug !== rhythmSlug);
  const rest = siblings.length >= max ? siblings : [...siblings, ...allRhythms.filter((r) => r.slug !== rhythmSlug && !siblings.includes(r))];
  return rest.slice(0, max).map((r) => ({
    title: r.title,
    categoryLabel: owningGroup?.heading ?? "EKG Kütüphanesi",
    href: `/ekg/${r.slug}`,
  }));
}

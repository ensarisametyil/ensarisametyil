export type CategorySlug =
  | "acil-yaklasimlar"
  | "pediatri"
  | "dogum-ve-yenidogan"
  | "ilaclar"
  | "ritimler"
  | "kardiyoloji"
  | "travma"
  | "toksikoloji"
  | "makaleler";

export interface Category {
  slug: CategorySlug;
  label: string;
  /** Short one-line description of scope, derived only from the topic titles filed under it. */
  description: string;
}

// Category slugs and labels are taken verbatim from the original ACİLTİMEKG
// application's route configuration. Descriptions are short, neutral scope
// summaries derived from the topics actually filed under each category below —
// no clinical claims are made here.
export const categories: Category[] = [
  {
    slug: "acil-yaklasimlar",
    label: "Yetişkin Algoritmalar",
    description: "Sahne yönetiminden ileri yaşam desteğine, yetişkin hastada acil yaklaşım algoritmaları.",
  },
  {
    slug: "pediatri",
    label: "Pediatri Algoritmalar",
    description: "Pediatrik hastaya özgü triyaj, resüsitasyon ve acil yaklaşım algoritmaları.",
  },
  {
    slug: "dogum-ve-yenidogan",
    label: "Doğum ve Yenidoğan",
    description: "Saha doğumu, doğum komplikasyonları ve yenidoğan canlandırması.",
  },
  {
    slug: "ilaclar",
    label: "İlaçlar",
    description: "Acil ilaçların uygulama yolu, doz basamakları ve kritik güvenlik uyarıları.",
  },
  {
    slug: "ritimler",
    label: "Ritimler",
    description: "EKG ritim kütüphanesi: sinüs, atriyal, ventriküler ve ileti bozuklukları.",
  },
  {
    slug: "kardiyoloji",
    label: "Kardiyoloji",
    description: "Akut koroner sendrom, arrest yönetimi ve kardiyojenik aciller.",
  },
  {
    slug: "travma",
    label: "Travma",
    description: "Travmalı hastada olgu yönetimi, yanıklar ve çevresel travma yaklaşımları.",
  },
  {
    slug: "toksikoloji",
    label: "Toksikoloji",
    description: "Zehirlenme, doz aşımı ve toksik ajan yönetimi algoritmaları.",
  },
  {
    slug: "makaleler",
    label: "Makaleler",
    description: "Hastane öncesi acil tıp üzerine yazılar.",
  },
];

export const categoryMap: Record<CategorySlug, Category> = Object.fromEntries(
  categories.map((c) => [c.slug, c]),
) as Record<CategorySlug, Category>;

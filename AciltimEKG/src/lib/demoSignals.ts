/**
 * Demo-only UI signals (popularity ranking, "recently added" ordering) used
 * to demonstrate how a category hub's sort controls would behave once a real
 * backend supplies analytics and publish timestamps. These are deterministic
 * and clearly presentational — no medical claims ride on them, and they are
 * isolated here so swapping them for a real `GET /api/topics?sort=popular`
 * call later touches exactly one module.
 */

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/** Stable 0–100 "usage" score for a slug, standing in for real view/favorite analytics. */
export function popularityScore(slug: string): number {
  return hash(slug) % 100;
}

/** True for the top ~1-in-4 items by popularityScore — drives the "sık kullanılan" filter. */
export function isPopular(slug: string): boolean {
  return popularityScore(slug) >= 75;
}

/**
 * Stable "recently added" rank for a slug within its list — index position
 * stands in for a real `createdAt` timestamp from the future CMS.
 */
export function addedRank<T extends { slug: string }>(items: T[], slug: string): number {
  return items.findIndex((i) => i.slug === slug);
}

import type { Locale } from './locales'

/** BCP-47 tags used for every Intl call — keep in one place so adding a locale only touches this map. */
const INTL_TAG: Record<Locale, string> = {
  tr: 'tr-TR',
  en: 'en-US',
  de: 'de-DE',
}

export function toIntlTag(locale: Locale): string {
  return INTL_TAG[locale];
}

/** Long date, e.g. "28 Ağustos 2026" / "August 28, 2026" / "28. August 2026". */
export function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(toIntlTag(locale), { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(toIntlTag(locale)).format(value);
}

export function formatPercent(fraction: number, locale: Locale): string {
  return new Intl.NumberFormat(toIntlTag(locale), { style: 'percent', maximumFractionDigits: 0 }).format(fraction);
}

/** Not used anywhere yet (no price is currently displayed anywhere in the product) — kept for when one is. */
export function formatCurrency(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(toIntlTag(locale), { style: 'currency', currency }).format(amount);
}

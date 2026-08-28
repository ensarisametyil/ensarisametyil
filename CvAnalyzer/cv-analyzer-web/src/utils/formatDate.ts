/** Formats an ISO date string as a Turkish long date, e.g. "28 Ağustos 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
}

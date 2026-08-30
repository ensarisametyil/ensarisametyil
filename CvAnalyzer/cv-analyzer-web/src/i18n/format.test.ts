import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, formatNumber, formatPercent, toIntlTag } from './format'

describe('locale-aware formatting', () => {
  it('maps each supported locale to its BCP-47 Intl tag', () => {
    expect(toIntlTag('tr')).toBe('tr-TR')
    expect(toIntlTag('en')).toBe('en-US')
    expect(toIntlTag('de')).toBe('de-DE')
  })

  it('formats a date differently per locale (month name + ordering) via Intl, not a fixed format', () => {
    const iso = '2026-08-28T00:00:00Z'

    const tr = formatDate(iso, 'tr')
    const en = formatDate(iso, 'en')
    const de = formatDate(iso, 'de')

    expect(tr).toContain('2026')
    expect(en).toContain('2026')
    expect(de).toContain('2026')
    // The three locales don't all render the same string for the same instant.
    expect(new Set([tr, en, de]).size).toBeGreaterThan(1)
  })

  it('formats a number using locale-specific grouping/decimal separators', () => {
    expect(formatNumber(1234.5, 'tr')).toBe(new Intl.NumberFormat('tr-TR').format(1234.5))
    expect(formatNumber(1234.5, 'en')).toBe(new Intl.NumberFormat('en-US').format(1234.5))
    expect(formatNumber(1234.5, 'de')).toBe(new Intl.NumberFormat('de-DE').format(1234.5))
  })

  it('formats a fraction as a whole-number percent', () => {
    expect(formatPercent(0.82, 'en')).toBe('82%')
  })

  it('formats a currency amount using the given ISO currency code and locale', () => {
    const result = formatCurrency(199.9, 'TRY', 'tr')
    expect(result).toContain('199')
  })
})

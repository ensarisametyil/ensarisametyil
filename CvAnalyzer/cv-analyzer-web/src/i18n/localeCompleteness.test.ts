import { describe, expect, it } from 'vitest'
import tr from './locales/tr.json'
import en from './locales/en.json'
import de from './locales/de.json'
import { SUPPORTED_LOCALES } from './locales'

/**
 * The compile-time check in locales/index.ts (en/de structurally checked against `typeof tr`)
 * already fails the build for a missing key, but only reports the first TypeScript error it
 * hits and gives no signal at all for an *extra* key some locale has that others don't. This
 * test is the second, readable line of defense: it flattens every locale to a full set of
 * dot-paths and diffs them directly, so a missing/extra key anywhere shows up by name.
 */
function flattenKeys(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return [prefix]
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      flattenKeys(child, prefix ? `${prefix}.${key}` : key),
    )
  }
  return [prefix]
}

const LOCALE_DATA: Record<string, unknown> = { tr, en, de }

describe('locale translation completeness', () => {
  it('ships exactly the three documented locales', () => {
    expect(SUPPORTED_LOCALES).toEqual(['tr', 'en', 'de'])
  })

  it('has at least one translation key', () => {
    expect(flattenKeys(tr).length).toBeGreaterThan(50)
  })

  it.each(['en', 'de'])('has exactly the same translation keys as tr.json (%s)', (locale) => {
    const trKeys = new Set(flattenKeys(tr))
    const localeKeys = new Set(flattenKeys(LOCALE_DATA[locale]))

    const missing = [...trKeys].filter((key) => !localeKeys.has(key))
    const extra = [...localeKeys].filter((key) => !trKeys.has(key))

    expect({ missing, extra }).toEqual({ missing: [], extra: [] })
  })

  it('never leaves the brand name "CVora AI" translated in any locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const data = LOCALE_DATA[locale] as { app: { name: string } }
      expect(data.app.name).toBe('CVora AI')
    }
  })
})

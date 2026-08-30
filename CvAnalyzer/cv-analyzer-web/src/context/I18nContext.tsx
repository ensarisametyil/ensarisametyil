import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_LOCALE, messages, SUPPORTED_LOCALES, type Locale } from '../i18n/locales'
import { I18nContext, type I18nContextValue } from './i18nContextObject'

const STORAGE_KEY = 'cvorai.locale'

/** og:locale uses underscore-joined language_TERRITORY tags, distinct from format.ts's BCP-47 (hyphenated) tags. */
const OG_LOCALE: Record<Locale, string> = {
  tr: 'tr_TR',
  en: 'en_US',
  de: 'de_DE',
}

function isSupportedLocale(value: string | null | undefined): value is Locale {
  return value != null && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/**
 * Stored preference wins. With no stored preference, the documented default (Turkish) is used —
 * deliberately with no browser-language auto-detection. That was evaluated (narrowing
 * navigator.language to one of the three supported locales) but rejected: it would make the
 * "default is Turkish" guarantee depend on the visitor's browser/OS language setting, which is
 * neither safe nor predictable (and, concretely, every test environment reports "en-US" as its
 * default navigator.language, which would silently flip every first-render test to English).
 * The architecture stays extensible for a future explicit "detect my language" affordance if
 * ever wanted — it just isn't the default behavior.
 */
function detectInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isSupportedLocale(stored)) {
      return stored
    }
  } catch {
    // localStorage unavailable (private mode, disabled by policy) — fall through.
  }

  return DEFAULT_LOCALE
}

function resolveValue(source: unknown, path: string[]): unknown {
  let current: unknown = source
  for (const segment of path) {
    if (typeof current !== 'object' || current === null || !(segment in current)) {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template
  }
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

/** Wraps the whole app (see App.tsx) — every page/component reaches this through useTranslation(). */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale)

  const t = useCallback<I18nContextValue['t']>(
    (key, params) => {
      const path = key.split('.')
      const activeValue = resolveValue(messages[locale], path)
      const fallbackValue = resolveValue(messages[DEFAULT_LOCALE], path)
      const resolved = typeof activeValue === 'string' ? activeValue : typeof fallbackValue === 'string' ? fallbackValue : key
      return interpolate(resolved, params)
    },
    [locale],
  )

  const tList = useCallback<I18nContextValue['tList']>(
    (key) => {
      const path = key.split('.')
      const activeValue = resolveValue(messages[locale], path)
      const fallbackValue = resolveValue(messages[DEFAULT_LOCALE], path)
      const resolved = Array.isArray(activeValue) ? activeValue : Array.isArray(fallbackValue) ? fallbackValue : []
      return resolved as string[]
    },
    [locale],
  )

  useEffect(() => {
    document.documentElement.lang = locale
    document.title = `${t('app.name')} — ${t('app.tagline')}`

    const description = t('app.description')
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ]) {
      document.querySelector(selector)?.setAttribute('content', description)
    }
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', OG_LOCALE[locale])

    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      // Best-effort persistence only — a private/disabled localStorage must never crash the app.
    }
  }, [locale, t])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
  }, [])

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t, tList }), [locale, setLocale, t, tList])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

import { createContext } from 'react'
import type { Locale } from '../i18n/locales'

export interface I18nContextValue {
  locale: Locale
  /** Switches the active language — persists to localStorage and updates <html lang> as a side effect. */
  setLocale: (locale: Locale) => void
  /** Looks up a dot-path key (e.g. "auth.login.title"). Falls back to Turkish, then to the raw key — never throws. */
  t: (key: string, params?: Record<string, string | number>) => string
  /** Same lookup, for keys whose value is a string array (used by the legal pages' bullet lists). */
  tList: (key: string) => string[]
}

export const I18nContext = createContext<I18nContextValue | null>(null)

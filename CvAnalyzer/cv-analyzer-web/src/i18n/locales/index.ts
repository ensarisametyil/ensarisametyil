import tr from './tr.json'
import en from './en.json'
import de from './de.json'

/** The three languages CVora AI ships with. Add a new one here (see docs/i18n.md). */
export const SUPPORTED_LOCALES = ['tr', 'en', 'de'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

/** Turkish is the product default — first-time visitors and any unrecognized browser language land here. */
export const DEFAULT_LOCALE: Locale = 'tr'

export type Translations = typeof tr

/**
 * `en`/`de` are structurally checked against `typeof tr` here — if either locale file is
 * missing a key that `tr.json` has, this assignment fails to compile. That's the first of two
 * lines of defense against incomplete translations (see also
 * i18n/localeCompleteness.test.ts, which checks the same thing at test time with a readable
 * diff instead of a raw TS error).
 */
export const messages: Record<Locale, Translations> = { tr, en, de }

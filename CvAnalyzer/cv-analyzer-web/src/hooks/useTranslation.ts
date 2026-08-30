import { useContext } from 'react'
import { I18nContext } from '../context/i18nContextObject'

/** Reads { locale, setLocale, t, tList }. Must be used inside <I18nProvider> (wraps the whole app in App.tsx). */
export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return context
}

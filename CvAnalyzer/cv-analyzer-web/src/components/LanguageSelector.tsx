import { SUPPORTED_LOCALES, type Locale } from '../i18n/locales'
import { useTranslation } from '../hooks/useTranslation'
import styles from './LanguageSelector.module.css'

const LOCALE_LABEL: Record<Locale, string> = {
  tr: 'TR',
  en: 'EN',
  de: 'DE',
}

/**
 * TR | EN | DE language switcher. Plain <button>s (native keyboard support — Tab/Enter/Space —
 * for free, no custom key handling needed) inside a labelled group; aria-pressed marks the active
 * one instead of color alone. Switching never reloads the page — it just updates I18nContext,
 * which every t()-consuming component re-renders from immediately.
 */
function LanguageSelector() {
  const { locale, setLocale, t } = useTranslation()

  return (
    <div className={styles.group} role="group" aria-label={t('languageSelector.label')}>
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          className={styles.option}
          aria-pressed={locale === code}
          aria-label={t(`languageSelector.${code}`)}
          onClick={() => setLocale(code)}
        >
          {LOCALE_LABEL[code]}
        </button>
      ))}
    </div>
  )
}

export default LanguageSelector

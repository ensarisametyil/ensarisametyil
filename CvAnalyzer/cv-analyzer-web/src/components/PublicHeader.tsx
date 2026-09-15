import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import LanguageSelector from './LanguageSelector'
import ThemeToggle from './ThemeToggle'
import styles from './PublicHeader.module.css'

/**
 * Shared top bar for public (unauthenticated-reachable) pages — landing, legal pages, contact.
 * The in-page section links (Features/How it works/Pricing) only make sense on the landing page
 * itself, since that's the only page with matching anchor ids — they're hidden everywhere else
 * rather than linking to a route change plus a hash the target page doesn't have.
 */
function PublicHeader() {
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isLandingPage = pathname === '/'

  return (
    <header className={styles.topBar}>
      <Link to="/" className={styles.brand}>
        {t('app.name')}
      </Link>

      {isLandingPage && (
        <nav className={styles.sectionNav} aria-label={t('landing.nav.features')}>
          <a href="#features">{t('landing.nav.features')}</a>
          <a href="#how-it-works">{t('landing.nav.howItWorks')}</a>
          <a href="#pricing">{t('landing.nav.pricing')}</a>
        </nav>
      )}

      <nav className={styles.topNav}>
        {isAuthenticated ? (
          <Link to="/app" className={styles.topNavCta}>
            {t('publicHeader.goToApp')}
          </Link>
        ) : (
          <>
            <Link to="/login" className={styles.topNavLink}>
              {t('publicHeader.login')}
            </Link>
            <Link to="/register" className={styles.topNavCta}>
              {t('publicHeader.registerFree')}
            </Link>
          </>
        )}
        <ThemeToggle />
        <LanguageSelector />
      </nav>
    </header>
  )
}

export default PublicHeader

import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import LanguageSelector from './LanguageSelector'
import styles from './PublicHeader.module.css'

/** Shared top bar for public (unauthenticated-reachable) pages — landing, legal pages, contact. */
function PublicHeader() {
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation()

  return (
    <header className={styles.topBar}>
      <Link to="/" className={styles.brand}>
        {t('app.name')}
      </Link>
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
        <LanguageSelector />
      </nav>
    </header>
  )
}

export default PublicHeader

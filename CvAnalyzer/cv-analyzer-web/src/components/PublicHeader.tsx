import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './PublicHeader.module.css'

/** Shared top bar for public (unauthenticated-reachable) pages — landing, legal pages, contact. */
function PublicHeader() {
  const { isAuthenticated } = useAuth()

  return (
    <header className={styles.topBar}>
      <Link to="/" className={styles.brand}>
        CVora AI
      </Link>
      <nav className={styles.topNav}>
        {isAuthenticated ? (
          <Link to="/app" className={styles.topNavLink}>
            Uygulamaya Git
          </Link>
        ) : (
          <>
            <Link to="/login" className={styles.topNavLink}>
              Giriş Yap
            </Link>
            <Link to="/register" className={styles.topNavCta}>
              Ücretsiz Başla
            </Link>
          </>
        )}
      </nav>
    </header>
  )
}

export default PublicHeader

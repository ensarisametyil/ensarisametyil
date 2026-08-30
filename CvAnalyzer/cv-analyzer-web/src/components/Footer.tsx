import { Link } from 'react-router-dom'
import { useTranslation } from '../hooks/useTranslation'
import styles from './Footer.module.css'

/** Shared footer for public pages (landing + legal + contact). Not shown inside the authenticated app shell (AppLayout has its own NavBar-only chrome). */
function Footer() {
  const { t } = useTranslation()

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.brand}>{t('app.name')}</span>
        <nav className={styles.links} aria-label={t('footer.linksLabel')}>
          <Link to="/privacy">{t('footer.privacy')}</Link>
          <Link to="/terms">{t('footer.terms')}</Link>
          <Link to="/cookies">{t('footer.cookies')}</Link>
          <Link to="/contact">{t('footer.contact')}</Link>
        </nav>
        <span className={styles.copyright}>
          © {new Date().getFullYear()} {t('app.name')}
        </span>
      </div>
    </footer>
  )
}

export default Footer

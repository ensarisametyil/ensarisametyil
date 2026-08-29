import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

/** Shared footer for public pages (landing + legal + contact). Not shown inside the authenticated app shell (AppLayout has its own NavBar-only chrome). */
function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.brand}>CVora AI</span>
        <nav className={styles.links} aria-label="Alt bilgi bağlantıları">
          <Link to="/privacy">Gizlilik Politikası</Link>
          <Link to="/terms">Kullanım Şartları</Link>
          <Link to="/cookies">Çerez Politikası</Link>
          <Link to="/contact">İletişim</Link>
        </nav>
        <span className={styles.copyright}>© {new Date().getFullYear()} CVora AI</span>
      </div>
    </footer>
  )
}

export default Footer

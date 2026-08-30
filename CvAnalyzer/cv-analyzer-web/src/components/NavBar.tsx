import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import PlanBadge from './PlanBadge'
import LanguageSelector from './LanguageSelector'
import styles from './NavBar.module.css'

/** Top navigation — shown only for authenticated users (rendered inside ProtectedRoute pages). */
function NavBar() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.left}>
        <Link to="/app" className={styles.brand}>
          {t('app.name')}
        </Link>
        <NavLink to="/app" end className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
          {t('nav.home')}
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
          {t('nav.history')}
        </NavLink>
      </div>

      <div className={styles.right}>
        <PlanBadge />
        <NavLink to="/account" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
          {t('nav.account')}
        </NavLink>
        {user && <span className={styles.email}>{user.email}</span>}
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          {t('nav.logout')}
        </button>
        <LanguageSelector />
      </div>
    </nav>
  )
}

export default NavBar

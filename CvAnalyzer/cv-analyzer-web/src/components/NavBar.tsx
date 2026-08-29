import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import PlanBadge from './PlanBadge'
import styles from './NavBar.module.css'

/** Top navigation — shown only for authenticated users (rendered inside ProtectedRoute pages). */
function NavBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.left}>
        <Link to="/app" className={styles.brand}>
          CVora AI
        </Link>
        <NavLink to="/app" end className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
          Ana Sayfa
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
          Analiz Geçmişim
        </NavLink>
      </div>

      <div className={styles.right}>
        <PlanBadge />
        <NavLink to="/account" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
          Hesabım
        </NavLink>
        {user && <span className={styles.email}>{user.email}</span>}
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          Çıkış Yap
        </button>
      </div>
    </nav>
  )
}

export default NavBar

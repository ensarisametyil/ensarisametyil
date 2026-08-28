import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
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
        <span className={styles.brand}>CV Analyzer</span>
        <NavLink to="/" end className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
          Ana Sayfa
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
          Analiz Geçmişim
        </NavLink>
      </div>

      <div className={styles.right}>
        {user && <span className={styles.email}>{user.email}</span>}
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          Çıkış Yap
        </button>
      </div>
    </nav>
  )
}

export default NavBar

import { LogOut, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import LanguageSelector from './LanguageSelector'
import PlanBadge from './PlanBadge'
import ThemeToggle from './ThemeToggle'
import styles from './Topbar.module.css'

interface TopbarProps {
  onMenuClick: () => void
}

/** Top bar for the authenticated app shell: mobile menu toggle, plan status, account, logout. */
function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className={styles.topbar}>
      <button type="button" className={styles.menuButton} onClick={onMenuClick} aria-label={t('nav.toggleMenu')}>
        <Menu size={20} strokeWidth={1.75} />
      </button>

      <div className={styles.spacer} />

      <div className={styles.right}>
        <PlanBadge />
        {user && <span className={styles.email}>{user.email}</span>}
        <button type="button" className={styles.logoutButton} onClick={handleLogout}>
          <LogOut size={15} strokeWidth={1.75} aria-hidden="true" />
          {t('nav.logout')}
        </button>
        <ThemeToggle />
        <LanguageSelector />
      </div>
    </header>
  )
}

export default Topbar

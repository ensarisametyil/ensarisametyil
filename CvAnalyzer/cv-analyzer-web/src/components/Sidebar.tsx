import { GitCompareArrows, History, LayoutDashboard, ShieldCheck, UserCog, X } from 'lucide-react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import styles from './Sidebar.module.css'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Primary vertical navigation for the authenticated app shell (used by both AppLayout and
 * AdminLayout, so admins are always one click from leaving the admin area). Off-canvas on small
 * screens, controlled by `isOpen`/`onClose` (see Topbar's menu toggle).
 */
function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth()
  const { t } = useTranslation()

  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? styles.linkActive : styles.link)

  return (
    <>
      {isOpen && <div className={styles.scrim} onClick={onClose} aria-hidden="true" />}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.header}>
          <Link to="/app" className={styles.brand} onClick={onClose}>
            {t('app.name')}
          </Link>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t('nav.closeMenu')}>
            <X size={18} />
          </button>
        </div>

        <nav className={styles.nav} aria-label={t('app.name')}>
          <NavLink to="/app" end className={linkClass} onClick={onClose}>
            <LayoutDashboard size={18} strokeWidth={1.75} aria-hidden="true" />
            {t('nav.home')}
          </NavLink>
          <NavLink to="/history" className={linkClass} onClick={onClose}>
            <History size={18} strokeWidth={1.75} aria-hidden="true" />
            {t('nav.history')}
          </NavLink>
          <NavLink to="/compare" className={linkClass} onClick={onClose}>
            <GitCompareArrows size={18} strokeWidth={1.75} aria-hidden="true" />
            {t('nav.compare')}
          </NavLink>
          <NavLink to="/account" className={linkClass} onClick={onClose}>
            <UserCog size={18} strokeWidth={1.75} aria-hidden="true" />
            {t('nav.account')}
          </NavLink>
          {user?.role === 'Admin' && (
            <NavLink to="/admin" className={linkClass} onClick={onClose}>
              <ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />
              {t('nav.admin')}
            </NavLink>
          )}
        </nav>
      </aside>
    </>
  )
}

export default Sidebar

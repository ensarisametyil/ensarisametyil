import { ChevronsLeft, ChevronsRight, GitCompareArrows, History, LayoutDashboard, ShieldCheck, UserCog, X } from 'lucide-react'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import styles from './Sidebar.module.css'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

/**
 * Primary vertical navigation for the authenticated app shell (used by both AppLayout and
 * AdminLayout, so admins are always one click from leaving the admin area). Off-canvas on small
 * screens, controlled by `isOpen`/`onClose` (see Topbar's menu toggle). On desktop it can also
 * collapse to an icon-only rail via `isCollapsed`/`onToggleCollapse` — the two behaviors are
 * independent (collapse never applies below the off-canvas breakpoint, and vice versa).
 */
function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) {
  const { user } = useAuth()
  const { t } = useTranslation()

  const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? styles.linkActive : styles.link)

  const navItems = [
    { to: '/app', end: true, icon: LayoutDashboard, label: t('nav.home') },
    { to: '/history', end: false, icon: History, label: t('nav.history') },
    { to: '/compare', end: false, icon: GitCompareArrows, label: t('nav.compare') },
    { to: '/account', end: false, icon: UserCog, label: t('nav.account') },
    ...(user?.role === 'Admin' ? [{ to: '/admin', end: false, icon: ShieldCheck, label: t('nav.admin') }] : []),
  ]

  return (
    <>
      {isOpen && <div className={styles.scrim} onClick={onClose} aria-hidden="true" />}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.header}>
          <Link to="/app" className={styles.brand} onClick={onClose}>
            {t('app.name')}
          </Link>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={t('nav.closeMenu')}>
            <X size={18} />
          </button>
        </div>

        <nav className={styles.nav} aria-label={t('app.name')}>
          {navItems.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} onClick={onClose} title={isCollapsed ? label : undefined}>
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className={styles.linkLabel}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className={styles.collapseButton}
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
          title={isCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          {isCollapsed ? <ChevronsRight size={16} strokeWidth={1.75} /> : <ChevronsLeft size={16} strokeWidth={1.75} />}
          <span className={styles.linkLabel}>{t('nav.collapseSidebar')}</span>
        </button>
      </aside>
    </>
  )
}

export default Sidebar

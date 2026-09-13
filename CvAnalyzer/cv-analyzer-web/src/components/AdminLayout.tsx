import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed'
import { useTranslation } from '../hooks/useTranslation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import styles from './AdminLayout.module.css'

/** Shared chrome for every Admin panel page: the same app Sidebar + Topbar as the rest of the
 * authenticated app (so leaving the admin area is always one click away), plus an admin-only tab
 * bar for the four admin sub-sections. */
function AdminLayout() {
  const { t } = useTranslation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { isCollapsed, toggle: toggleCollapsed } = useSidebarCollapsed()

  const tabClass = ({ isActive }: { isActive: boolean }) => (isActive ? styles.tabActive : styles.tab)

  return (
    <div className={styles.shell}>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapsed}
      />
      <div className={styles.main}>
        <Topbar onMenuClick={() => setIsSidebarOpen((open) => !open)} />
        <div className={styles.content}>
          <nav className={styles.tabs} aria-label={t('admin.nav.label')}>
            <NavLink to="/admin" end className={tabClass}>
              {t('admin.nav.dashboard')}
            </NavLink>
            <NavLink to="/admin/users" className={tabClass}>
              {t('admin.nav.users')}
            </NavLink>
            <NavLink to="/admin/payments" className={tabClass}>
              {t('admin.nav.payments')}
            </NavLink>
            <NavLink to="/admin/audit-logs" className={tabClass}>
              {t('admin.nav.auditLogs')}
            </NavLink>
          </nav>
          <main className={styles.page}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default AdminLayout

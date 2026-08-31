import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from '../hooks/useTranslation'
import NavBar from './NavBar'
import styles from './AdminLayout.module.css'

/** Shared chrome for every Admin panel page: the normal app NavBar (so leaving the admin area is always one click away) plus an admin-only sidebar. */
function AdminLayout() {
  const { t } = useTranslation()

  return (
    <>
      <NavBar />
      <div className={styles.shell}>
        <nav className={styles.sidebar} aria-label={t('admin.nav.label')}>
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            {t('admin.nav.dashboard')}
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            {t('admin.nav.users')}
          </NavLink>
          <NavLink to="/admin/payments" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            {t('admin.nav.payments')}
          </NavLink>
          <NavLink to="/admin/audit-logs" className={({ isActive }) => (isActive ? styles.linkActive : styles.link)}>
            {t('admin.nav.auditLogs')}
          </NavLink>
        </nav>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </>
  )
}

export default AdminLayout

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import { useNoIndex } from '../hooks/useNoIndex'
import Spinner from './Spinner'
import styles from './ProtectedRoute.module.css'

/**
 * Gates the Admin panel's routes. This is a UX convenience ONLY — it hides the admin UI from a
 * visitor who obviously isn't an admin so they don't see a flash of a page full of 403 errors.
 * It is NOT the security boundary: every /api/admin/* endpoint independently enforces
 * [Authorize(Roles = "Admin")] server-side (see AdminController docs), so a user who bypassed
 * this check entirely (e.g. by editing client state) would still get 403 from every real request.
 * user.role comes from the backend's own UserDto — never something this app sets itself.
 */
function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  useNoIndex()

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner label={t('common.loading')} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user?.role !== 'Admin') {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}

export default AdminRoute

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listUsers } from '../api/adminService'
import { useTranslation } from '../hooks/useTranslation'
import { getErrorMessage } from '../utils/errorMessages'
import { formatDate } from '../i18n/format'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import type { AdminUserListItem } from '../types/admin'
import styles from './AdminPages.module.css'

const PAGE_SIZE = 20

/** Paginated, searchable user list. Search/pagination are both backend-side (see IAdminUserService.ListUsersAsync) — this page never fetches the whole user table at once. */
function AdminUsersPage() {
  const { t, locale } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState<AdminUserListItem[] | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listUsers(page, PAGE_SIZE, search || undefined)
      .then((result) => {
        if (!cancelled) {
          setUsers(result.items)
          setTotalCount(result.totalCount)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, t))
      })

    return () => {
      cancelled = true
    }
  }, [page, search, t])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function goToPage(nextPage: number) {
    setUsers(null)
    setError(null)
    setPage(nextPage)
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault()
    setUsers(null)
    setError(null)
    setPage(1)
    setSearch(searchInput.trim())
  }

  return (
    <div className={styles.page}>
      <h1>{t('admin.users.title')}</h1>

      <form className={styles.toolbar} onSubmit={handleSearchSubmit} role="search">
        <input
          type="search"
          className={styles.searchInput}
          placeholder={t('admin.users.searchPlaceholder')}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label={t('admin.users.searchPlaceholder')}
        />
        <button type="submit" className={styles.actionButton}>
          {t('admin.users.search')}
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {!users && !error && (
        <div className={styles.loading}>
          <Spinner label={t('common.loading')} />
        </div>
      )}

      {users && users.length === 0 && <p className={styles.empty}>{t('admin.users.empty')}</p>}

      {users && users.length > 0 && (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t('admin.users.email')}</th>
                  <th scope="col">{t('admin.users.role')}</th>
                  <th scope="col">{t('admin.users.plan')}</th>
                  <th scope="col">{t('admin.users.status')}</th>
                  <th scope="col">{t('admin.users.registered')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link to={`/admin/users/${user.id}`} className={styles.rowLink}>
                        {user.email}
                      </Link>
                    </td>
                    <td>{user.role}</td>
                    <td>{user.plan}</td>
                    <td>
                      <span className={`${styles.badge} ${user.isActive ? styles.badgeSuccess : styles.badgeNeutral}`}>
                        {user.isActive ? t('admin.users.statusActive') : t('admin.users.statusInactive')}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label={t('admin.pagination.label')}>
              <button type="button" className={styles.pageButton} onClick={() => goToPage(page - 1)} disabled={page <= 1}>
                {t('admin.pagination.previous')}
              </button>
              <span className={styles.pageIndicator}>{t('admin.pagination.pageIndicator', { page, totalPages })}</span>
              <button type="button" className={styles.pageButton} onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
                {t('admin.pagination.next')}
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}

export default AdminUsersPage

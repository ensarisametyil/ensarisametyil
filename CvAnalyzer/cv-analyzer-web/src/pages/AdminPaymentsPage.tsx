import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPayments } from '../api/adminService'
import { useTranslation } from '../hooks/useTranslation'
import { getErrorMessage } from '../utils/errorMessages'
import { formatCurrency, formatDate } from '../i18n/format'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import PaymentStatusBadge from '../components/PaymentStatusBadge'
import type { AdminPaymentListItem } from '../types/admin'
import styles from './AdminPages.module.css'

const PAGE_SIZE = 20

/** Paginated, filterable list of every payment transaction across every user. Revenue/status figures come exclusively from IAdminPaymentService — never something computed from what this page fetches. */
function AdminPaymentsPage() {
  const { t, locale } = useTranslation()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [payments, setPayments] = useState<AdminPaymentListItem[] | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listPayments(page, PAGE_SIZE, {
      status: status || undefined,
      search: search || undefined,
      fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
      toDate: toDate ? new Date(toDate).toISOString() : undefined,
    })
      .then((result) => {
        if (!cancelled) {
          setPayments(result.items)
          setTotalCount(result.totalCount)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, t))
      })

    return () => {
      cancelled = true
    }
  }, [page, search, status, fromDate, toDate, t])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function resetForNewQuery() {
    setPayments(null)
    setError(null)
  }

  function goToPage(nextPage: number) {
    resetForNewQuery()
    setPage(nextPage)
  }

  function handleFilterSubmit(event: React.FormEvent) {
    event.preventDefault()
    resetForNewQuery()
    setPage(1)
    setSearch(searchInput.trim())
  }

  return (
    <div className={styles.page}>
      <h1>{t('admin.payments.title')}</h1>

      <form className={styles.toolbar} onSubmit={handleFilterSubmit} role="search">
        <input
          type="search"
          className={styles.searchInput}
          placeholder={t('admin.payments.searchPlaceholder')}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label={t('admin.payments.searchPlaceholder')}
        />
        <select
          className={styles.filterSelect}
          value={status}
          onChange={(event) => {
            resetForNewQuery()
            setPage(1)
            setStatus(event.target.value)
          }}
          aria-label={t('admin.payments.filterStatus')}
        >
          <option value="">{t('admin.payments.allStatuses')}</option>
          <option value="Succeeded">{t('admin.payments.statusSucceeded')}</option>
          <option value="Failed">{t('admin.payments.statusFailed')}</option>
          <option value="Initiated">{t('admin.payments.statusInitiated')}</option>
        </select>
        <input
          type="date"
          className={styles.dateInput}
          value={fromDate}
          onChange={(event) => {
            resetForNewQuery()
            setPage(1)
            setFromDate(event.target.value)
          }}
          aria-label={t('admin.payments.fromDate')}
        />
        <input
          type="date"
          className={styles.dateInput}
          value={toDate}
          onChange={(event) => {
            resetForNewQuery()
            setPage(1)
            setToDate(event.target.value)
          }}
          aria-label={t('admin.payments.toDate')}
        />
        <button type="submit" className={styles.actionButton}>
          {t('admin.users.search')}
        </button>
      </form>

      {error && <ErrorBanner message={error} />}

      {!payments && !error && (
        <div className={styles.loading}>
          <Spinner label={t('common.loading')} />
        </div>
      )}

      {payments && payments.length === 0 && <p className={styles.empty}>{t('admin.payments.empty')}</p>}

      {payments && payments.length > 0 && (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t('admin.payments.user')}</th>
                  <th scope="col">{t('admin.payments.status')}</th>
                  <th scope="col">{t('admin.payments.amount')}</th>
                  <th scope="col">{t('admin.payments.reference')}</th>
                  <th scope="col">{t('admin.payments.date')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <Link to={`/admin/users/${payment.userId}`} className={styles.rowLink}>
                        {payment.userEmail}
                      </Link>
                    </td>
                    <td>
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                    <td>{payment.amount != null ? formatCurrency(payment.amount, payment.currency ?? 'USD', locale) : t('common.dash')}</td>
                    <td>{payment.subscriptionReference ?? t('common.dash')}</td>
                    <td>{formatDate(payment.createdAt, locale)}</td>
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

export default AdminPaymentsPage

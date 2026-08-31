import { useEffect, useState } from 'react'
import { listAuditLogs } from '../api/adminService'
import { useTranslation } from '../hooks/useTranslation'
import { getErrorMessage } from '../utils/errorMessages'
import { formatDate } from '../i18n/format'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import type { AdminAuditLogEntry } from '../types/admin'
import styles from './AdminPages.module.css'

const PAGE_SIZE = 20

/** Every recorded privileged admin action ("who did what to whom"), newest first — see AdminAuditLog's doc comment. Never shows a password/secret/raw payment payload; Details is always a short safe summary. */
function AdminAuditLogsPage() {
  const { t, locale } = useTranslation()
  const [page, setPage] = useState(1)
  const [logs, setLogs] = useState<AdminAuditLogEntry[] | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listAuditLogs(page, PAGE_SIZE)
      .then((result) => {
        if (!cancelled) {
          setLogs(result.items)
          setTotalCount(result.totalCount)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, t))
      })

    return () => {
      cancelled = true
    }
  }, [page, t])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function goToPage(nextPage: number) {
    setLogs(null)
    setError(null)
    setPage(nextPage)
  }

  return (
    <div className={styles.page}>
      <h1>{t('admin.auditLogs.title')}</h1>

      {error && <ErrorBanner message={error} />}

      {!logs && !error && (
        <div className={styles.loading}>
          <Spinner label={t('common.loading')} />
        </div>
      )}

      {logs && logs.length === 0 && <p className={styles.empty}>{t('admin.auditLogs.empty')}</p>}

      {logs && logs.length > 0 && (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t('admin.auditLogs.admin')}</th>
                  <th scope="col">{t('admin.auditLogs.action')}</th>
                  <th scope="col">{t('admin.auditLogs.target')}</th>
                  <th scope="col">{t('admin.auditLogs.details')}</th>
                  <th scope="col">{t('admin.auditLogs.result')}</th>
                  <th scope="col">{t('admin.auditLogs.date')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.adminEmail}</td>
                    <td>{log.action}</td>
                    <td>{log.targetEmail ?? t('common.dash')}</td>
                    <td>{log.details ?? t('common.dash')}</td>
                    <td>
                      <span className={`${styles.badge} ${log.success ? styles.badgeSuccess : styles.badgeDanger}`}>
                        {log.success ? t('admin.auditLogs.resultSuccess') : t('admin.auditLogs.resultFailed')}
                      </span>
                    </td>
                    <td>{formatDate(log.createdAt, locale)}</td>
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

export default AdminAuditLogsPage

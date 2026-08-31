import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDashboardStats } from '../api/adminService'
import { useTranslation } from '../hooks/useTranslation'
import { getErrorMessage } from '../utils/errorMessages'
import { formatCurrency, formatDate } from '../i18n/format'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import PaymentStatusBadge from '../components/PaymentStatusBadge'
import type { AdminDashboardStats } from '../types/admin'
import styles from './AdminPages.module.css'

/** Admin panel landing page — user/subscription/payment/revenue/analysis counts plus the most recent payments. Every figure is computed backend-side; nothing here is derived from client state. */
function AdminDashboardPage() {
  const { t, locale } = useTranslation()
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getDashboardStats()
      .then((result) => {
        if (!cancelled) setStats(result)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, t))
      })

    return () => {
      cancelled = true
    }
  }, [t])

  return (
    <div className={styles.page}>
      <h1>{t('admin.dashboard.title')}</h1>

      {error && <ErrorBanner message={error} />}

      {!stats && !error && (
        <div className={styles.loading}>
          <Spinner label={t('common.loading')} />
        </div>
      )}

      {stats && (
        <>
          <div className={styles.statGrid}>
            <StatCard label={t('admin.dashboard.totalUsers')} value={stats.totalUsers} />
            <StatCard label={t('admin.dashboard.activeUsers')} value={stats.activeUsers} />
            <StatCard label={t('admin.dashboard.newUsers7d')} value={stats.newUsersLast7Days} />
            <StatCard label={t('admin.dashboard.freeUsers')} value={stats.freeUsers} />
            <StatCard label={t('admin.dashboard.premiumUsers')} value={stats.premiumUsers} />
            <StatCard label={t('admin.dashboard.activeSubscriptions')} value={stats.activeSubscriptions} />
            <StatCard label={t('admin.dashboard.succeededPayments')} value={stats.succeededPayments} />
            <StatCard label={t('admin.dashboard.failedPayments')} value={stats.failedPayments} />
            <StatCard label={t('admin.dashboard.pendingPayments')} value={stats.pendingPayments} />
            <StatCard label={t('admin.dashboard.totalRevenue')} value={formatCurrency(stats.totalRevenueUsd, 'USD', locale)} />
            <StatCard label={t('admin.dashboard.totalAnalyses')} value={stats.totalAnalyses} />
            <StatCard label={t('admin.dashboard.analyses30d')} value={stats.analysesLast30Days} />
          </div>

          <section className={styles.section}>
            <h2>{t('admin.dashboard.recentPayments')}</h2>
            {stats.recentPayments.length === 0 ? (
              <p className={styles.empty}>{t('admin.payments.empty')}</p>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">{t('admin.payments.user')}</th>
                      <th scope="col">{t('admin.payments.status')}</th>
                      <th scope="col">{t('admin.payments.amount')}</th>
                      <th scope="col">{t('admin.payments.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentPayments.map((payment) => (
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
                        <td>{formatDate(payment.createdAt, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}

export default AdminDashboardPage

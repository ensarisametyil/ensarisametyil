import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cancelUserSubscription, getUserDetail, setUserActive, setUserRole } from '../api/adminService'
import { useTranslation } from '../hooks/useTranslation'
import { getErrorMessage } from '../utils/errorMessages'
import { formatCurrency, formatDate } from '../i18n/format'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import PaymentStatusBadge from '../components/PaymentStatusBadge'
import type { AdminUserDetail } from '../types/admin'
import styles from './AdminPages.module.css'

/**
 * One user's full admin-facing detail: account, subscription, usage, and their own payment
 * history — composed backend-side from the same services the user's own Account page reads (see
 * IAdminUserService.GetUserDetailAsync). Mutating actions here (active/role/cancel) all go
 * through IAdminUserService/IPaymentService, never a direct database write, and every one is
 * recorded in the Audit Logs screen — see AdminController's doc comments.
 */
function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t, locale } = useTranslation()
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function reload() {
    if (!id) return
    setDetail(null)
    setError(null)
    getUserDetail(id)
      .then(setDetail)
      .catch((err) => setError(getErrorMessage(err, t)))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function runAction(action: () => Promise<{ message: string }>) {
    setActionError(null)
    setActionMessage(null)
    setIsSubmitting(true)
    try {
      const result = await action()
      setActionMessage(result.message)
      reload()
    } catch (err) {
      setActionError(getErrorMessage(err, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (error) {
    return (
      <div className={styles.page}>
        <Link to="/admin/users" className={styles.backLink}>
          {t('admin.userDetail.backToUsers')}
        </Link>
        <ErrorBanner message={error} />
      </div>
    )
  }

  if (!detail || !id) {
    return (
      <div className={styles.loading}>
        <Spinner label={t('common.loading')} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Link to="/admin/users" className={styles.backLink}>
        {t('admin.userDetail.backToUsers')}
      </Link>
      <h1>{detail.email}</h1>

      {actionError && <ErrorBanner message={actionError} />}
      {actionMessage && <p className={styles.empty}>{actionMessage}</p>}

      <section className={styles.section}>
        <h2>{t('admin.userDetail.account')}</h2>
        <dl className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.userId')}</dt>
            <dd>{detail.id}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.email')}</dt>
            <dd>{detail.email}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.registered')}</dt>
            <dd>{formatDate(detail.createdAt, locale)}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.role')}</dt>
            <dd>{detail.role}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.status')}</dt>
            <dd>{detail.isActive ? t('admin.users.statusActive') : t('admin.users.statusInactive')}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.emailVerified')}</dt>
            <dd>{detail.emailVerifiedAt ? formatDate(detail.emailVerifiedAt, locale) : t('admin.userDetail.notVerified')}</dd>
          </div>
        </dl>

        <div className={styles.actionsRow}>
          <button
            type="button"
            className={detail.isActive ? styles.dangerButton : styles.actionButton}
            disabled={isSubmitting}
            onClick={() => runAction(() => setUserActive(id, !detail.isActive))}
          >
            {detail.isActive ? t('admin.userDetail.deactivate') : t('admin.userDetail.activate')}
          </button>
          <button
            type="button"
            className={styles.actionButton}
            disabled={isSubmitting}
            onClick={() => runAction(() => setUserRole(id, detail.role === 'Admin' ? 'User' : 'Admin'))}
          >
            {detail.role === 'Admin' ? t('admin.userDetail.demoteToUser') : t('admin.userDetail.promoteToAdmin')}
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2>{t('admin.userDetail.subscription')}</h2>
        <dl className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.plan')}</dt>
            <dd>{detail.plan}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.subscriptionStatus')}</dt>
            <dd>{detail.subscriptionStatus ?? t('common.dash')}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.startDate')}</dt>
            <dd>{detail.subscriptionStartDate ? formatDate(detail.subscriptionStartDate, locale) : t('common.dash')}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.endDate')}</dt>
            <dd>{detail.subscriptionEndDate ? formatDate(detail.subscriptionEndDate, locale) : t('common.dash')}</dd>
          </div>
        </dl>

        {detail.plan === 'Premium' && detail.subscriptionStatus === 'Active' && (
          <div className={styles.actionsRow}>
            <button type="button" className={styles.dangerButton} disabled={isSubmitting} onClick={() => runAction(() => cancelUserSubscription(id))}>
              {t('admin.userDetail.cancelSubscription')}
            </button>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2>{t('admin.userDetail.usage')}</h2>
        <dl className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.used')}</dt>
            <dd>{detail.usageUsed}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.limit')}</dt>
            <dd>{detail.usageLimit ?? t('admin.userDetail.unlimited')}</dd>
          </div>
          <div className={styles.detailItem}>
            <dt>{t('admin.userDetail.remaining')}</dt>
            <dd>{detail.usageRemaining ?? t('admin.userDetail.unlimited')}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.section}>
        <h2>{t('admin.userDetail.payments')}</h2>
        {detail.payments.length === 0 ? (
          <p className={styles.empty}>{t('admin.payments.empty')}</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{t('admin.payments.date')}</th>
                  <th scope="col">{t('admin.payments.status')}</th>
                  <th scope="col">{t('admin.payments.provider')}</th>
                  <th scope="col">{t('admin.payments.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {detail.payments.map((payment, index) => (
                  <tr key={`${payment.date}-${index}`}>
                    <td>{formatDate(payment.date, locale)}</td>
                    <td>
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                    <td>{payment.provider ?? t('common.dash')}</td>
                    <td>{payment.amount != null ? formatCurrency(payment.amount, payment.currency ?? 'USD', locale) : t('common.dash')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminUserDetailPage

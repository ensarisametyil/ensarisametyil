import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBilling } from '../hooks/useBilling'
import { useTranslation } from '../hooks/useTranslation'
import { changePassword, deactivateAccount } from '../api/authService'
import { cancelSubscription, getPaymentHistory, getSubscription } from '../api/billingService'
import { getErrorMessage } from '../utils/errorMessages'
import { getPasswordPolicyError } from '../utils/passwordPolicy'
import { formatCurrency, formatDate } from '../i18n/format'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import type { PaymentHistoryItem, SubscriptionDetails } from '../types/billing'
import styles from './AccountPage.module.css'

function ChangePasswordSection() {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setError(t('account.changePassword.passwordsDontMatch'))
      return
    }
    const policyError = getPasswordPolicyError(newPassword, t)
    if (policyError) {
      setError(policyError)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await changePassword(currentPassword, newPassword)
      setMessage(response.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.section} aria-labelledby="change-password-heading">
      <h2 id="change-password-heading">{t('account.changePassword.heading')}</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}
        {message && (
          <p className={styles.successMessage} role="status">
            {message}
          </p>
        )}

        <label className={styles.field}>
          <span>{t('account.changePassword.currentPassword')}</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <label className={styles.field}>
          <span>{t('account.changePassword.newPassword')}</span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <label className={styles.field}>
          <span>{t('account.changePassword.confirmPassword')}</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>

        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? <Spinner label={t('account.changePassword.submitting')} /> : t('account.changePassword.submit')}
        </button>
      </form>
    </section>
  )
}

function SubscriptionSection({ subscription, onCancelled }: { subscription: SubscriptionDetails; onCancelled: () => void }) {
  const { t, locale } = useTranslation()
  const [isCancelling, setIsCancelling] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCancel = async () => {
    setError(null)
    setIsCancelling(true)
    try {
      await cancelSubscription()
      setConfirmingCancel(false)
      onCancelled()
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <section className={styles.section} aria-labelledby="subscription-heading">
      <h2 id="subscription-heading">{t('account.subscription.heading')}</h2>
      {error && <ErrorBanner message={error} />}
      <dl className={styles.detailList}>
        <div>
          <dt>{t('account.subscription.plan')}</dt>
          <dd>{subscription.plan === 'PREMIUM' ? t('account.profile.planPremium') : t('account.profile.planFree')}</dd>
        </div>
        {subscription.status && (
          <div>
            <dt>{t('account.subscription.status')}</dt>
            <dd>{subscription.status}</dd>
          </div>
        )}
        {subscription.provider && (
          <div>
            <dt>{t('account.subscription.provider')}</dt>
            <dd>{subscription.provider}</dd>
          </div>
        )}
        {subscription.startDate && (
          <div>
            <dt>{t('account.subscription.startDate')}</dt>
            <dd>{formatDate(subscription.startDate, locale)}</dd>
          </div>
        )}
      </dl>

      {subscription.canCancel && !confirmingCancel && (
        <button type="button" className={styles.dangerButton} onClick={() => setConfirmingCancel(true)}>
          {t('account.subscription.cancelButton')}
        </button>
      )}

      {subscription.canCancel && confirmingCancel && (
        <div className={styles.confirmRow}>
          <p>{t('account.subscription.cancelConfirmQuestion')}</p>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.dangerButton} onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? <Spinner label={t('account.subscription.cancelling')} /> : t('account.subscription.cancelConfirmYes')}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setConfirmingCancel(false)} disabled={isCancelling}>
              {t('account.subscription.cancelDecline')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function PaymentHistorySection({ items }: { items: PaymentHistoryItem[] }) {
  const { t, locale } = useTranslation()

  const statusLabel = (status: string) => {
    switch (status) {
      case 'Succeeded':
        return t('account.paymentHistory.statusSucceeded')
      case 'Failed':
        return t('account.paymentHistory.statusFailed')
      case 'Initiated':
        return t('account.paymentHistory.statusInitiated')
      default:
        return status
    }
  }

  return (
    <section className={styles.section} aria-labelledby="payment-history-heading">
      <h2 id="payment-history-heading">{t('account.paymentHistory.heading')}</h2>
      {items.length === 0 ? (
        <p className={styles.empty}>{t('account.paymentHistory.empty')}</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('account.paymentHistory.date')}</th>
                <th scope="col">{t('account.paymentHistory.status')}</th>
                <th scope="col">{t('account.paymentHistory.provider')}</th>
                <th scope="col">{t('account.paymentHistory.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.date}-${index}`}>
                  <td>{formatDate(item.date, locale)}</td>
                  <td>{statusLabel(item.status)}</td>
                  <td>{item.provider ?? t('common.dash')}</td>
                  <td>{item.amount != null ? formatCurrency(item.amount, item.currency ?? 'USD', locale) : t('common.dash')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function DeactivateAccountSection() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await deactivateAccount(password)
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, t))
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.section} aria-labelledby="deactivate-heading">
      <h2 id="deactivate-heading">{t('account.deactivate.heading')}</h2>
      <p className={styles.hint}>{t('account.deactivate.hint')}</p>

      {!expanded && (
        <button type="button" className={styles.dangerButton} onClick={() => setExpanded(true)}>
          {t('account.deactivate.openButton')}
        </button>
      )}

      {expanded && (
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <ErrorBanner message={error} />}
          <label className={styles.field}>
            <span>{t('account.deactivate.confirmPassword')}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <div className={styles.confirmActions}>
            <button type="submit" className={styles.dangerButton} disabled={isSubmitting}>
              {isSubmitting ? <Spinner label={t('account.deactivate.confirming')} /> : t('account.deactivate.confirmButton')}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setExpanded(false)} disabled={isSubmitting}>
              {t('account.deactivate.decline')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function AccountPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { usage } = useBilling()
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null)
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadBillingDetails = () => {
    setLoadError(null)
    Promise.all([getSubscription(), getPaymentHistory()])
      .then(([subscriptionDetails, paymentHistory]) => {
        setSubscription(subscriptionDetails)
        setPayments(paymentHistory)
      })
      .catch((err) => setLoadError(getErrorMessage(err, t)))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadBillingDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!user) {
    return null
  }

  return (
    <main className={styles.page}>
      <h1>{t('account.title')}</h1>

      <section className={styles.section} aria-labelledby="profile-heading">
        <h2 id="profile-heading">{t('account.profile.heading')}</h2>
        <dl className={styles.detailList}>
          <div>
            <dt>{t('account.profile.email')}</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>{t('account.profile.accountStatus')}</dt>
            <dd>{t('account.profile.accountActive')}</dd>
          </div>
          <div>
            <dt>{t('account.profile.emailVerification')}</dt>
            <dd>{user.emailVerifiedAt ? t('account.profile.emailVerified') : t('account.profile.emailNotVerified')}</dd>
          </div>
          <div>
            <dt>{t('account.profile.plan')}</dt>
            <dd>{usage ? (usage.plan === 'PREMIUM' ? t('account.profile.planPremium') : t('account.profile.planFree')) : t('common.dash')}</dd>
          </div>
          {usage && usage.limit !== null && (
            <div>
              <dt>{t('account.profile.usage')}</dt>
              <dd>{t('billing.usageUsed', { used: usage.used, limit: usage.limit })}</dd>
            </div>
          )}
        </dl>
      </section>

      {isLoading && (
        <div className={styles.loading}>
          <Spinner label={t('common.loading')} />
        </div>
      )}

      {loadError && <ErrorBanner message={loadError} />}

      {!isLoading && subscription && <SubscriptionSection subscription={subscription} onCancelled={loadBillingDetails} />}

      {!isLoading && <PaymentHistorySection items={payments} />}

      <ChangePasswordSection />

      <DeactivateAccountSection />
    </main>
  )
}

export default AccountPage

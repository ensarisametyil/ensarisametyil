import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBilling } from '../hooks/useBilling'
import { changePassword, deactivateAccount } from '../api/authService'
import { cancelSubscription, getPaymentHistory, getSubscription } from '../api/billingService'
import { getErrorMessage } from '../utils/errorMessages'
import { getPasswordPolicyError } from '../utils/passwordPolicy'
import { formatDate } from '../utils/formatDate'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import type { PaymentHistoryItem, SubscriptionDetails } from '../types/billing'
import styles from './AccountPage.module.css'

const STATUS_LABELS: Record<string, string> = {
  Succeeded: 'Başarılı',
  Failed: 'Başarısız',
  Initiated: 'Başlatıldı',
}

function ChangePasswordSection() {
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
      setError('Yeni parolalar eşleşmiyor.')
      return
    }
    const policyError = getPasswordPolicyError(newPassword)
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
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.section} aria-labelledby="change-password-heading">
      <h2 id="change-password-heading">Şifre Değiştir</h2>
      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <ErrorBanner message={error} />}
        {message && (
          <p className={styles.successMessage} role="status">
            {message}
          </p>
        )}

        <label className={styles.field}>
          <span>Mevcut Şifre</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <label className={styles.field}>
          <span>Yeni Şifre</span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <label className={styles.field}>
          <span>Yeni Şifre (Tekrar)</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>

        <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
          {isSubmitting ? <Spinner label="Kaydediliyor..." /> : 'Şifreyi Güncelle'}
        </button>
      </form>
    </section>
  )
}

function SubscriptionSection({ subscription, onCancelled }: { subscription: SubscriptionDetails; onCancelled: () => void }) {
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
      setError(getErrorMessage(err))
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <section className={styles.section} aria-labelledby="subscription-heading">
      <h2 id="subscription-heading">Abonelik</h2>
      {error && <ErrorBanner message={error} />}
      <dl className={styles.detailList}>
        <div>
          <dt>Plan</dt>
          <dd>{subscription.plan === 'PREMIUM' ? 'Premium' : 'Free'}</dd>
        </div>
        {subscription.status && (
          <div>
            <dt>Durum</dt>
            <dd>{subscription.status}</dd>
          </div>
        )}
        {subscription.provider && (
          <div>
            <dt>Ödeme Sağlayıcı</dt>
            <dd>{subscription.provider}</dd>
          </div>
        )}
        {subscription.startDate && (
          <div>
            <dt>Başlangıç</dt>
            <dd>{formatDate(subscription.startDate)}</dd>
          </div>
        )}
      </dl>

      {subscription.canCancel && !confirmingCancel && (
        <button type="button" className={styles.dangerButton} onClick={() => setConfirmingCancel(true)}>
          Aboneliği İptal Et
        </button>
      )}

      {subscription.canCancel && confirmingCancel && (
        <div className={styles.confirmRow}>
          <p>Premium aboneliğinizi iptal etmek istediğinize emin misiniz?</p>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.dangerButton} onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? <Spinner label="İptal ediliyor..." /> : 'Evet, İptal Et'}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setConfirmingCancel(false)} disabled={isCancelling}>
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function PaymentHistorySection({ items }: { items: PaymentHistoryItem[] }) {
  return (
    <section className={styles.section} aria-labelledby="payment-history-heading">
      <h2 id="payment-history-heading">Ödeme Geçmişi</h2>
      {items.length === 0 ? (
        <p className={styles.empty}>Henüz bir ödeme işleminiz yok.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Tarih</th>
                <th scope="col">Durum</th>
                <th scope="col">Sağlayıcı</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.date}-${index}`}>
                  <td>{formatDate(item.date)}</td>
                  <td>{STATUS_LABELS[item.status] ?? item.status}</td>
                  <td>{item.provider ?? '—'}</td>
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
      setError(getErrorMessage(err))
      setIsSubmitting(false)
    }
  }

  return (
    <section className={styles.section} aria-labelledby="deactivate-heading">
      <h2 id="deactivate-heading">Hesabı Kapat</h2>
      <p className={styles.hint}>
        Hesabınızı kapattığınızda tekrar giriş yapamazsınız. CV, analiz ve ödeme kayıtlarınız veri bütünlüğü
        gereği saklanmaya devam eder, ancak hesabınız pasif hale gelir.
      </p>

      {!expanded && (
        <button type="button" className={styles.dangerButton} onClick={() => setExpanded(true)}>
          Hesabımı Kapat
        </button>
      )}

      {expanded && (
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <ErrorBanner message={error} />}
          <label className={styles.field}>
            <span>Şifrenizi onaylayın</span>
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
              {isSubmitting ? <Spinner label="Kapatılıyor..." /> : 'Onayla ve Hesabı Kapat'}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setExpanded(false)} disabled={isSubmitting}>
              Vazgeç
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function AccountPage() {
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
      .catch((err) => setLoadError(getErrorMessage(err)))
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
      <h1>Hesabım</h1>

      <section className={styles.section} aria-labelledby="profile-heading">
        <h2 id="profile-heading">Profil</h2>
        <dl className={styles.detailList}>
          <div>
            <dt>E-posta</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Hesap Durumu</dt>
            <dd>Aktif</dd>
          </div>
          <div>
            <dt>E-posta Doğrulaması</dt>
            <dd>
              {user.emailVerifiedAt
                ? 'Doğrulandı'
                : 'Doğrulanmadı (bu ortamda e-posta doğrulama akışı henüz aktif değil)'}
            </dd>
          </div>
          <div>
            <dt>Plan</dt>
            <dd>{usage ? (usage.plan === 'PREMIUM' ? 'Premium' : 'Free') : '—'}</dd>
          </div>
          {usage && usage.limit !== null && (
            <div>
              <dt>Kullanım</dt>
              <dd>
                {usage.used} / {usage.limit} analiz kullanıldı
              </dd>
            </div>
          )}
        </dl>
      </section>

      {isLoading && (
        <div className={styles.loading}>
          <Spinner label="Yükleniyor..." />
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

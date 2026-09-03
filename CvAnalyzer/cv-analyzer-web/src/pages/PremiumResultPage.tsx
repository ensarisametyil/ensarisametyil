import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useBilling } from '../hooks/useBilling'
import { useTranslation } from '../hooks/useTranslation'
import styles from './PremiumResultPage.module.css'

/**
 * Landed on after the backend has already processed Iyzico's checkout callback (see
 * BillingController.CheckoutCallback) — the ?status query param is purely a UX hint for which
 * message to show; it carries no authority of its own. The actual plan is re-fetched from
 * GET /api/billing/usage (via refresh()), which is the only thing this page ever trusts.
 */
function PremiumResultPage() {
  const [searchParams] = useSearchParams()
  const { refresh } = useBilling()
  const { t } = useTranslation()
  const isSuccess = searchParams.get('status') === 'success'

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={styles.icon} data-tone={isSuccess ? 'success' : 'danger'} aria-hidden="true">
          {isSuccess ? <CheckCircle2 size={28} strokeWidth={1.75} /> : <XCircle size={28} strokeWidth={1.75} />}
        </span>
        <h1>{isSuccess ? t('paymentResult.successTitle') : t('paymentResult.failTitle')}</h1>
        <p>{isSuccess ? t('paymentResult.successMessage') : t('paymentResult.failMessage')}</p>
        <Link to="/" className={styles.homeLink}>
          {t('paymentResult.backHome')}
        </Link>
      </div>
    </main>
  )
}

export default PremiumResultPage

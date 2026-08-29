import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useBilling } from '../hooks/useBilling'
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
  const isSuccess = searchParams.get('status') === 'success'

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={styles.icon} aria-hidden="true">
          {isSuccess ? '🎉' : '⚠️'}
        </span>
        <h1>{isSuccess ? "Premium'a Geçtiniz!" : 'Ödeme Tamamlanamadı'}</h1>
        <p>
          {isSuccess
            ? 'Artık sınırsız CV analizi yapabilirsiniz.'
            : 'Ödemeniz onaylanamadı. Lütfen tekrar deneyin veya farklı bir ödeme yöntemi kullanın.'}
        </p>
        <Link to="/" className={styles.homeLink}>
          Ana Sayfaya Dön
        </Link>
      </div>
    </main>
  )
}

export default PremiumResultPage

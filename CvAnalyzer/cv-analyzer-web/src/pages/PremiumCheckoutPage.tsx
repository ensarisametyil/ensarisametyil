import { useState, type ChangeEvent, type FormEvent } from 'react'
import { startCheckout } from '../api/billingService'
import { useTranslation } from '../hooks/useTranslation'
import { getErrorMessage } from '../utils/errorMessages'
import CheckoutFormRenderer from '../components/CheckoutFormRenderer'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import type { CheckoutBuyerInfo, CheckoutResponse } from '../types/billing'
import styles from './AuthPage.module.css'

const EMPTY_BUYER: CheckoutBuyerInfo = {
  name: '',
  surname: '',
  identityNumber: '',
  gsmNumber: '',
  city: '',
  addressLine: '',
}

/**
 * Collects the buyer info Iyzico's checkout form requires, then starts a checkout and renders
 * whatever it returns. This page never decides Premium itself — it only gets as far as showing
 * Iyzico's own payment form; the actual grant happens on the backend after Iyzico confirms
 * payment (see docs/iyzico-integration.md).
 */
function PremiumCheckoutPage() {
  const { t } = useTranslation()
  const [buyer, setBuyer] = useState<CheckoutBuyerInfo>(EMPTY_BUYER)
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: keyof CheckoutBuyerInfo) => (event: ChangeEvent<HTMLInputElement>) => {
    setBuyer((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await startCheckout(buyer)
      setCheckout(result)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (checkout) {
    return (
      <main className={styles.page}>
        <CheckoutFormRenderer html={checkout.checkoutFormContent} />
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>{t('checkout.title')}</h1>
        <p className={styles.hint}>{t('checkout.hint')}</p>

        {error && <ErrorBanner message={error} />}

        <label className={styles.field}>
          <span>{t('checkout.name')}</span>
          <input type="text" value={buyer.name} onChange={handleChange('name')} required autoComplete="given-name" />
        </label>

        <label className={styles.field}>
          <span>{t('checkout.surname')}</span>
          <input type="text" value={buyer.surname} onChange={handleChange('surname')} required autoComplete="family-name" />
        </label>

        <label className={styles.field}>
          <span>{t('checkout.identityNumber')}</span>
          <input
            type="text"
            value={buyer.identityNumber}
            onChange={handleChange('identityNumber')}
            required
            inputMode="numeric"
            maxLength={11}
          />
        </label>

        <label className={styles.field}>
          <span>{t('checkout.gsmNumber')}</span>
          <input type="tel" value={buyer.gsmNumber} onChange={handleChange('gsmNumber')} required autoComplete="tel" />
        </label>

        <label className={styles.field}>
          <span>{t('checkout.city')}</span>
          <input type="text" value={buyer.city} onChange={handleChange('city')} required autoComplete="address-level2" />
        </label>

        <label className={styles.field}>
          <span>{t('checkout.addressLine')}</span>
          <input type="text" value={buyer.addressLine} onChange={handleChange('addressLine')} required autoComplete="street-address" />
        </label>

        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? <Spinner label={t('checkout.submitting')} /> : t('checkout.submit')}
        </button>
      </form>
    </main>
  )
}

export default PremiumCheckoutPage

import { Link } from 'react-router-dom'
import { useTranslation } from '../hooks/useTranslation'
import cardStyles from './Card.module.css'
import styles from './PremiumFeatureNotice.module.css'

/**
 * Shown in place of a Career Assistant feature panel when the backend rejects the request with
 * PREMIUM_FEATURE_REQUIRED (403) — access control is enforced server-side
 * (IFeatureEntitlementService, see CareerAssistantController); this is purely the UI's honest
 * reflection of that decision, never the decision itself.
 */
function PremiumFeatureNotice() {
  const { t } = useTranslation()

  return (
    <section className={`${cardStyles.card} ${styles.notice}`}>
      <h3 className={cardStyles.title}>{t('careerAssistant.premiumRequired.title')}</h3>
      <p className={styles.description}>{t('careerAssistant.premiumRequired.description')}</p>
      <Link to="/premium/checkout" className={styles.ctaButton}>
        {t('billing.upgradeToPremium')}
      </Link>
    </section>
  )
}

export default PremiumFeatureNotice

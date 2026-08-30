import { Link } from 'react-router-dom'
import { useBilling } from '../hooks/useBilling'
import { useTranslation } from '../hooks/useTranslation'
import styles from './PlanBadge.module.css'

/**
 * Shows the signed-in user's plan and (for Free) remaining usage, plus a Premium CTA that links
 * to the real checkout flow (/premium/checkout — collects buyer info, then starts an Iyzico
 * checkout). No plan/usage value here is ever computed client-side; all of it comes straight from
 * GET /api/billing/usage, and clicking the CTA never grants Premium by itself — only a verified
 * payment result on the backend can (see docs/iyzico-integration.md).
 */
function PlanBadge() {
  const { usage } = useBilling()
  const { t } = useTranslation()

  if (!usage) {
    return null
  }

  const isFree = usage.plan === 'FREE'

  return (
    <div className={styles.wrapper}>
      <span className={styles.planTag} data-plan={usage.plan}>
        {isFree ? t('billing.freePlan') : t('billing.premiumPlan')}
      </span>

      {isFree && usage.limit !== null && (
        <span className={styles.usage}>{t('billing.usageUsed', { used: usage.used, limit: usage.limit })}</span>
      )}

      {isFree && (
        <Link to="/premium/checkout" className={styles.ctaButton}>
          {t('billing.upgradeToPremium')}
        </Link>
      )}
    </div>
  )
}

export default PlanBadge

import { useState } from 'react'
import { useBilling } from '../hooks/useBilling'
import styles from './PlanBadge.module.css'

/**
 * Shows the signed-in user's plan and (for Free) remaining usage, plus a Premium CTA. The CTA is
 * a placeholder only — clicking it never starts a checkout; real payment is Stage 9's Iyzico
 * integration. No plan/usage value here is ever computed client-side; all of it comes straight
 * from GET /api/billing/usage.
 */
function PlanBadge() {
  const { usage } = useBilling()
  const [showComingSoon, setShowComingSoon] = useState(false)

  if (!usage) {
    return null
  }

  const isFree = usage.plan === 'FREE'

  return (
    <div className={styles.wrapper}>
      <span className={styles.planTag} data-plan={usage.plan}>
        {isFree ? 'FREE PLAN' : 'PREMIUM'}
      </span>

      {isFree && usage.limit !== null && (
        <span className={styles.usage}>
          {usage.used} / {usage.limit} analiz kullanıldı
        </span>
      )}

      {isFree && (
        <span className={styles.ctaGroup}>
          <button type="button" className={styles.ctaButton} onClick={() => setShowComingSoon(true)}>
            Premium'a Geç
          </button>
          {showComingSoon && <span className={styles.comingSoon}>Premium yakında!</span>}
        </span>
      )}
    </div>
  )
}

export default PlanBadge

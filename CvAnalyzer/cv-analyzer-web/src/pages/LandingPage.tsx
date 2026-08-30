import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPlans } from '../api/billingService'
import { useAuth } from '../hooks/useAuth'
import { useBilling } from '../hooks/useBilling'
import { useTranslation } from '../hooks/useTranslation'
import { formatCurrency } from '../i18n/format'
import Footer from '../components/Footer'
import PublicHeader from '../components/PublicHeader'
import { withLink } from '../utils/withLink'
import type { PlanPricing } from '../types/billing'
import styles from './LandingPage.module.css'

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4'] as const

function LandingPage() {
  const { isAuthenticated } = useAuth()
  const { usage } = useBilling()
  const { t, locale } = useTranslation()
  const primaryCtaTarget = isAuthenticated ? '/app' : '/register'
  const primaryCtaLabel = isAuthenticated ? t('landing.hero.ctaAuthenticated') : t('landing.hero.ctaAnonymous')
  // An authenticated Free user's "Premium'a Geç" click should go straight to checkout, not just
  // to the app shell where they'd have to go find the upgrade CTA a second time. An authenticated
  // Premium user (or before usage has loaded) falls back to /app — there's nothing to check out.
  const premiumCtaTarget = !isAuthenticated ? '/register' : usage?.plan === 'FREE' ? '/premium/checkout' : '/app'

  // Premium's price is never invented on the frontend — it comes from the backend's own plan
  // catalog (GET /api/billing/plans, public/unauthenticated). If the fetch hasn't resolved yet or
  // fails, the card falls back to the existing feature-style note rather than showing a guessed
  // figure.
  const [premiumPricing, setPremiumPricing] = useState<PlanPricing | null>(null)
  useEffect(() => {
    let cancelled = false
    getPlans()
      .then((result) => {
        if (!cancelled) {
          setPremiumPricing(result.premium)
        }
      })
      .catch(() => {
        // Non-critical — the plan card just falls back to its static feature-note text.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className={styles.page}>
      <PublicHeader />

      <main>
        <section className={styles.hero}>
          <h1>{t('landing.hero.title')}</h1>
          <p className={styles.heroSubtitle}>{t('landing.hero.subtitle')}</p>
          <div className={styles.heroActions}>
            <Link to={primaryCtaTarget} className={styles.heroCta}>
              {primaryCtaLabel}
            </Link>
            <span className={styles.heroHint}>{t('landing.hero.hint')}</span>
          </div>
        </section>

        <section className={styles.howItWorks} aria-labelledby="how-it-works-heading">
          <h2 id="how-it-works-heading">{t('landing.howItWorks.heading')}</h2>
          <ol className={styles.steps}>
            <li>
              <span className={styles.stepNumber}>1</span>
              <div>
                <h3>{t('landing.howItWorks.step1Title')}</h3>
                <p>{t('landing.howItWorks.step1Body')}</p>
              </div>
            </li>
            <li>
              <span className={styles.stepNumber}>2</span>
              <div>
                <h3>{t('landing.howItWorks.step2Title')}</h3>
                <p>{t('landing.howItWorks.step2Body')}</p>
              </div>
            </li>
            <li>
              <span className={styles.stepNumber}>3</span>
              <div>
                <h3>{t('landing.howItWorks.step3Title')}</h3>
                <p>{t('landing.howItWorks.step3Body')}</p>
              </div>
            </li>
          </ol>
        </section>

        <section className={styles.benefits} aria-labelledby="benefits-heading">
          <h2 id="benefits-heading">{t('landing.benefits.heading')}</h2>
          <div className={styles.benefitGrid}>
            <div className={styles.benefitCard}>
              <h3>{t('landing.benefits.objective.title')}</h3>
              <p>{t('landing.benefits.objective.body')}</p>
            </div>
            <div className={styles.benefitCard}>
              <h3>{t('landing.benefits.concrete.title')}</h3>
              <p>{t('landing.benefits.concrete.body')}</p>
            </div>
            <div className={styles.benefitCard}>
              <h3>{t('landing.benefits.keywords.title')}</h3>
              <p>{t('landing.benefits.keywords.body')}</p>
            </div>
            <div className={styles.benefitCard}>
              <h3>{t('landing.benefits.history.title')}</h3>
              <p>{t('landing.benefits.history.body')}</p>
            </div>
          </div>
        </section>

        <section className={styles.plans} aria-labelledby="plans-heading">
          <h2 id="plans-heading">{t('landing.plans.heading')}</h2>
          <div className={styles.planGrid}>
            <div className={styles.planCard}>
              <h3>{t('landing.plans.free.title')}</h3>
              <p className={styles.planPriceNote}>{t('landing.plans.free.priceNote')}</p>
              <ul>
                <li>{t('landing.plans.free.feature1')}</li>
                <li>{t('landing.plans.free.feature2')}</li>
                <li>{t('landing.plans.free.feature3')}</li>
              </ul>
              <Link to={isAuthenticated ? '/app' : '/register'} className={styles.planCta}>
                {t('landing.plans.free.cta')}
              </Link>
            </div>
            <div className={`${styles.planCard} ${styles.planCardHighlight}`}>
              <span className={styles.planBadge}>{t('landing.plans.premium.badge')}</span>
              <h3>{t('landing.plans.premium.title')}</h3>
              {premiumPricing?.monthlyPriceUsd != null ? (
                <p className={styles.planPrice}>
                  <span className={styles.planPriceAmount}>
                    {formatCurrency(premiumPricing.monthlyPriceUsd, premiumPricing.currency ?? 'USD', locale)}
                  </span>
                  <span className={styles.planPricePeriod}>{t('landing.plans.premium.perMonth')}</span>
                </p>
              ) : (
                <p className={styles.planPriceNote}>{t('landing.plans.premium.priceNote')}</p>
              )}
              <ul>
                <li>{t('landing.plans.premium.feature1')}</li>
                <li>{t('landing.plans.premium.feature2')}</li>
                <li>{t('landing.plans.premium.feature3')}</li>
                <li>{t('landing.plans.premium.feature4')}</li>
              </ul>
              <Link to={premiumCtaTarget} className={styles.planCta}>
                {t('landing.plans.premium.cta')}
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.security} aria-labelledby="security-heading">
          <h2 id="security-heading">{t('landing.security.heading')}</h2>
          <p>
            {withLink(
              t('landing.security.body'),
              'privacyLink',
              <Link key="privacy-link" to="/privacy">
                {t('footer.privacy')}
              </Link>,
            )}
          </p>
        </section>

        <section className={styles.faq} aria-labelledby="faq-heading">
          <h2 id="faq-heading">{t('landing.faq.heading')}</h2>
          <dl>
            {FAQ_KEYS.map((key) => (
              <div key={key} className={styles.faqItem}>
                <dt>{t(`landing.faq.${key}.question`)}</dt>
                <dd>{t(`landing.faq.${key}.answer`)}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default LandingPage

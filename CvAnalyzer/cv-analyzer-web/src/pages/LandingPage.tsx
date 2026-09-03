import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck,
  CheckCircle2,
  FileSearch,
  Gauge,
  Lightbulb,
  ListChecks,
  Lock,
  Map,
  MessageSquareText,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
} from 'lucide-react'
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
          <div className={styles.heroCopy}>
            <h1>{t('landing.hero.title')}</h1>
            <p className={styles.heroSubtitle}>{t('landing.hero.subtitle')}</p>
            <div className={styles.heroActions}>
              <Link to={primaryCtaTarget} className={styles.heroCta}>
                {primaryCtaLabel}
              </Link>
              <a href="#showcase" className={styles.heroSecondaryCta}>
                {t('landing.hero.secondaryCta')}
              </a>
            </div>
            <span className={styles.heroHint}>{t('landing.hero.hint')}</span>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.heroCard}>
              <div className={styles.heroCardHeader}>
                <span className={styles.heroCardDot} />
                <span className={styles.heroCardDot} />
                <span className={styles.heroCardDot} />
              </div>
              <div className={styles.heroCardBody}>
                <div className={styles.heroScoreRing}>
                  <span className={styles.heroScoreValue}>87</span>
                </div>
                <div className={styles.heroCardBars}>
                  <div className={styles.heroCardBarRow}>
                    <span>{t('analysis.skills')}</span>
                    <div className={styles.heroCardBarTrack}>
                      <div className={styles.heroCardBarFill} style={{ width: '82%' }} />
                    </div>
                  </div>
                  <div className={styles.heroCardBarRow}>
                    <span>{t('analysis.experience')}</span>
                    <div className={styles.heroCardBarTrack}>
                      <div className={styles.heroCardBarFill} style={{ width: '90%' }} />
                    </div>
                  </div>
                  <div className={styles.heroCardBarRow}>
                    <span>{t('analysis.education')}</span>
                    <div className={styles.heroCardBarTrack}>
                      <div className={styles.heroCardBarFill} style={{ width: '76%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.trust} aria-labelledby="trust-heading">
          <h2 id="trust-heading">{t('landing.trust.heading')}</h2>
          <div className={styles.trustGrid}>
            <div className={styles.trustCard}>
              <Sparkles size={20} strokeWidth={1.75} className={styles.trustIcon} aria-hidden="true" />
              <h3>{t('landing.trust.point1.title')}</h3>
              <p>{t('landing.trust.point1.body')}</p>
            </div>
            <div className={styles.trustCard}>
              <Lock size={20} strokeWidth={1.75} className={styles.trustIcon} aria-hidden="true" />
              <h3>{t('landing.trust.point2.title')}</h3>
              <p>{t('landing.trust.point2.body')}</p>
            </div>
            <div className={styles.trustCard}>
              <TimerReset size={20} strokeWidth={1.75} className={styles.trustIcon} aria-hidden="true" />
              <h3>{t('landing.trust.point3.title')}</h3>
              <p>{t('landing.trust.point3.body')}</p>
            </div>
            <div className={styles.trustCard}>
              <TrendingUp size={20} strokeWidth={1.75} className={styles.trustIcon} aria-hidden="true" />
              <h3>{t('landing.trust.point4.title')}</h3>
              <p>{t('landing.trust.point4.body')}</p>
            </div>
          </div>
        </section>

        <section id="showcase" className={styles.howItWorks} aria-labelledby="how-it-works-heading">
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
              <Target size={20} strokeWidth={1.75} className={styles.benefitIcon} aria-hidden="true" />
              <h3>{t('landing.benefits.objective.title')}</h3>
              <p>{t('landing.benefits.objective.body')}</p>
            </div>
            <div className={styles.benefitCard}>
              <Lightbulb size={20} strokeWidth={1.75} className={styles.benefitIcon} aria-hidden="true" />
              <h3>{t('landing.benefits.concrete.title')}</h3>
              <p>{t('landing.benefits.concrete.body')}</p>
            </div>
            <div className={styles.benefitCard}>
              <FileSearch size={20} strokeWidth={1.75} className={styles.benefitIcon} aria-hidden="true" />
              <h3>{t('landing.benefits.keywords.title')}</h3>
              <p>{t('landing.benefits.keywords.body')}</p>
            </div>
            <div className={styles.benefitCard}>
              <ListChecks size={20} strokeWidth={1.75} className={styles.benefitIcon} aria-hidden="true" />
              <h3>{t('landing.benefits.history.title')}</h3>
              <p>{t('landing.benefits.history.body')}</p>
            </div>
          </div>
        </section>

        <section className={styles.split} aria-labelledby="career-insights-heading">
          <div className={styles.splitCopy}>
            <h2 id="career-insights-heading">{t('landing.careerInsights.heading')}</h2>
            <p className={styles.splitBody}>{t('landing.careerInsights.body')}</p>
            <ul className={styles.splitList}>
              <li>
                <MessageSquareText size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <strong>{t('landing.careerInsights.point1.title')}</strong>
                  <p>{t('landing.careerInsights.point1.body')}</p>
                </div>
              </li>
              <li>
                <Map size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <strong>{t('landing.careerInsights.point2.title')}</strong>
                  <p>{t('landing.careerInsights.point2.body')}</p>
                </div>
              </li>
              <li>
                <BadgeCheck size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <strong>{t('landing.careerInsights.point3.title')}</strong>
                  <p>{t('landing.careerInsights.point3.body')}</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className={`${styles.split} ${styles.splitReverse}`} aria-labelledby="scoring-heading">
          <div className={styles.splitCopy}>
            <h2 id="scoring-heading">{t('landing.scoring.heading')}</h2>
            <p className={styles.splitBody}>{t('landing.scoring.body')}</p>
            <ul className={styles.splitList}>
              <li>
                <Gauge size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <strong>{t('landing.scoring.point1.title')}</strong>
                  <p>{t('landing.scoring.point1.body')}</p>
                </div>
              </li>
              <li>
                <CheckCircle2 size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <strong>{t('landing.scoring.point2.title')}</strong>
                  <p>{t('landing.scoring.point2.body')}</p>
                </div>
              </li>
              <li>
                <ListChecks size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <strong>{t('landing.scoring.point3.title')}</strong>
                  <p>{t('landing.scoring.point3.body')}</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className={styles.split} aria-labelledby="job-matching-heading">
          <div className={styles.splitCopy}>
            <h2 id="job-matching-heading">{t('landing.jobMatching.heading')}</h2>
            <p className={styles.splitBody}>{t('landing.jobMatching.body')}</p>
            <ul className={styles.splitList}>
              <li>
                <Target size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <strong>{t('landing.jobMatching.point1.title')}</strong>
                  <p>{t('landing.jobMatching.point1.body')}</p>
                </div>
              </li>
              <li>
                <FileSearch size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <strong>{t('landing.jobMatching.point2.title')}</strong>
                  <p>{t('landing.jobMatching.point2.body')}</p>
                </div>
              </li>
            </ul>
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

        <section className={styles.finalCta} aria-labelledby="final-cta-heading">
          <h2 id="final-cta-heading">{t('landing.finalCta.heading')}</h2>
          <p>{t('landing.finalCta.body')}</p>
          <Link to={primaryCtaTarget} className={styles.heroCta}>
            {primaryCtaLabel}
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default LandingPage

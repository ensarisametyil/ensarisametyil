import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  FileSearch,
  Gauge,
  Lightbulb,
  ListChecks,
  Lock,
  Map,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  X,
} from 'lucide-react'
import { getPlans } from '../api/billingService'
import { useAuth } from '../hooks/useAuth'
import { useBilling } from '../hooks/useBilling'
import { useTranslation } from '../hooks/useTranslation'
import { formatCurrency } from '../i18n/format'
import Footer from '../components/Footer'
import PublicHeader from '../components/PublicHeader'
import ScoreBar from '../components/ScoreBar'
import { withLink } from '../utils/withLink'
import type { PlanPricing } from '../types/billing'
import styles from './LandingPage.module.css'

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4'] as const

/**
 * Browser-chrome frame shared by every illustrative product-preview mockup on this page (the hero
 * visual + the three feature-split visuals). Purely presentational — every number/label inside is
 * static, clearly-illustrative demo content, never real platform statistics (see docs/i18n.md and
 * the brief this redesign was built against: no fake claims, ever).
 */
function PreviewFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${styles.previewFrame} ${className ?? ''}`}>
      <div className={styles.previewFrameHeader}>
        <span className={styles.previewDot} />
        <span className={styles.previewDot} />
        <span className={styles.previewDot} />
      </div>
      <div className={styles.previewFrameBody}>{children}</div>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={styles.faqItem}>
      <button type="button" className={styles.faqTrigger} aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        <span>{question}</span>
        <ChevronDown size={18} strokeWidth={1.75} className={isOpen ? styles.faqChevronOpen : styles.faqChevron} aria-hidden="true" />
      </button>
      {isOpen && <p className={styles.faqAnswer}>{answer}</p>}
    </div>
  )
}

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

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
              {t('landing.hero.eyebrow')}
            </span>
            <h1>{t('landing.hero.title')}</h1>
            <p className={styles.heroSubtitle}>{t('landing.hero.subtitle')}</p>
            <div className={styles.heroActions}>
              <Link to={primaryCtaTarget} className={styles.heroCta}>
                {primaryCtaLabel}
                <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
              <a href="#how-it-works" className={styles.heroSecondaryCta}>
                {t('landing.hero.secondaryCta')}
              </a>
            </div>
            <span className={styles.heroHint}>{t('landing.hero.hint')}</span>
          </div>

          <div className={styles.heroVisual}>
            <PreviewFrame className={styles.heroPreview}>
              <div className={styles.previewTopRow}>
                <span className={styles.previewFileName}>{t('landing.hero.previewFileName')}</span>
                <span className={styles.previewBadge}>{t('landing.hero.previewBadge')}</span>
              </div>

              <div className={styles.previewScoreRow}>
                <div className={styles.heroScoreRing}>
                  <span className={styles.heroScoreValue}>87</span>
                </div>
                <div className={styles.previewScoreMeta}>
                  <span className={styles.previewScoreLabel}>{t('analysis.cvScore')}</span>
                  <span className={styles.previewScoreTier} data-tier="excellent">
                    {t('analysis.tier.excellent')}
                  </span>
                </div>
              </div>

              <div className={styles.previewBars}>
                <ScoreBar label={t('analysis.skills')} score={82} />
                <ScoreBar label={t('analysis.experience')} score={90} />
                <ScoreBar label={t('analysis.education')} score={76} />
              </div>

              <div className={styles.previewInsightRow}>
                <span className={styles.previewInsightPositive}>
                  <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                  {t('analysis.strengths')}
                </span>
                <span className={styles.previewInsightWarning}>
                  <X size={13} strokeWidth={2.5} aria-hidden="true" />
                  {t('analysis.weaknesses')}
                </span>
              </div>
            </PreviewFrame>
          </div>
        </section>

        <section id="features" className={styles.features} aria-labelledby="features-heading">
          <h2 id="features-heading">{t('landing.trust.heading')}</h2>
          <div className={styles.featuresLayout}>
            <div className={styles.featuredCard}>
              <Sparkles size={22} strokeWidth={1.75} className={styles.featuredIcon} aria-hidden="true" />
              <h3>{t('landing.trust.point1.title')}</h3>
              <p>{t('landing.trust.point1.body')}</p>
            </div>

            <div className={styles.featureGrid}>
              <div className={styles.featureRow}>
                <Lock size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <h3>{t('landing.trust.point2.title')}</h3>
                  <p>{t('landing.trust.point2.body')}</p>
                </div>
              </div>
              <div className={styles.featureRow}>
                <TimerReset size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <h3>{t('landing.trust.point3.title')}</h3>
                  <p>{t('landing.trust.point3.body')}</p>
                </div>
              </div>
              <div className={styles.featureRow}>
                <TrendingUp size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <h3>{t('landing.trust.point4.title')}</h3>
                  <p>{t('landing.trust.point4.body')}</p>
                </div>
              </div>
              <div className={styles.featureRow}>
                <Target size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <h3>{t('landing.benefits.objective.title')}</h3>
                  <p>{t('landing.benefits.objective.body')}</p>
                </div>
              </div>
              <div className={styles.featureRow}>
                <Lightbulb size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <h3>{t('landing.benefits.concrete.title')}</h3>
                  <p>{t('landing.benefits.concrete.body')}</p>
                </div>
              </div>
              <div className={styles.featureRow}>
                <FileSearch size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <h3>{t('landing.benefits.keywords.title')}</h3>
                  <p>{t('landing.benefits.keywords.body')}</p>
                </div>
              </div>
              <div className={styles.featureRow}>
                <ListChecks size={18} strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <h3>{t('landing.benefits.history.title')}</h3>
                  <p>{t('landing.benefits.history.body')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className={styles.howItWorks} aria-labelledby="how-it-works-heading">
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
          <div className={styles.splitVisual}>
            <PreviewFrame className={styles.splitPreview}>
              <span className={styles.rewriteLabel}>{t('careerAssistant.rewrite.original')}</span>
              <p className={styles.rewriteOriginal}>{t('landing.preview.rewriteOriginal')}</p>
              <span className={styles.rewriteLabel}>{t('careerAssistant.rewrite.improved')}</span>
              <p className={styles.rewriteImproved}>{t('landing.preview.rewriteImproved')}</p>
            </PreviewFrame>
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
          <div className={styles.splitVisual}>
            <PreviewFrame className={styles.splitPreview}>
              <div className={styles.previewBars}>
                <ScoreBar label={t('analysis.skills')} score={78} />
                <ScoreBar label={t('analysis.experience')} score={85} />
                <ScoreBar label={t('analysis.education')} score={70} />
              </div>
            </PreviewFrame>
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
          <div className={styles.splitVisual}>
            <PreviewFrame className={styles.splitPreview}>
              <div className={styles.matchScoreRow}>
                <span className={styles.matchPercent}>78%</span>
                <span className={styles.matchLabel}>{t('careerAssistant.jobMatch.overallScore')}</span>
              </div>
              <div className={styles.previewBars}>
                <ScoreBar label={t('careerAssistant.jobMatch.skillsScore')} score={80} />
                <ScoreBar label={t('careerAssistant.jobMatch.keywordsScore')} score={65} />
              </div>
            </PreviewFrame>
          </div>
        </section>

        <section id="pricing" className={styles.plans} aria-labelledby="plans-heading">
          <h2 id="plans-heading">{t('landing.plans.heading')}</h2>
          <div className={styles.planGrid}>
            <div className={styles.planCard}>
              <h3>{t('landing.plans.free.title')}</h3>
              <p className={styles.planPriceNote}>{t('landing.plans.free.priceNote')}</p>
              <ul>
                <li>
                  <Check size={16} strokeWidth={2.25} aria-hidden="true" />
                  {t('landing.plans.free.feature1')}
                </li>
                <li>
                  <Check size={16} strokeWidth={2.25} aria-hidden="true" />
                  {t('landing.plans.free.feature2')}
                </li>
                <li>
                  <Check size={16} strokeWidth={2.25} aria-hidden="true" />
                  {t('landing.plans.free.feature3')}
                </li>
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
                <li>
                  <Check size={16} strokeWidth={2.25} aria-hidden="true" />
                  {t('landing.plans.premium.feature1')}
                </li>
                <li>
                  <Check size={16} strokeWidth={2.25} aria-hidden="true" />
                  {t('landing.plans.premium.feature2')}
                </li>
                <li>
                  <Check size={16} strokeWidth={2.25} aria-hidden="true" />
                  {t('landing.plans.premium.feature3')}
                </li>
                <li>
                  <Check size={16} strokeWidth={2.25} aria-hidden="true" />
                  {t('landing.plans.premium.feature4')}
                </li>
              </ul>
              <Link to={premiumCtaTarget} className={styles.planCta}>
                {t('landing.plans.premium.cta')}
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.security} aria-labelledby="security-heading">
          <ShieldCheck size={22} strokeWidth={1.75} className={styles.securityIcon} aria-hidden="true" />
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
          <div className={styles.faqList}>
            {FAQ_KEYS.map((key) => (
              <FaqItem key={key} question={t(`landing.faq.${key}.question`)} answer={t(`landing.faq.${key}.answer`)} />
            ))}
          </div>
        </section>

        <section className={styles.finalCta} aria-labelledby="final-cta-heading">
          <div className={styles.finalCtaPanel}>
            <h2 id="final-cta-heading">{t('landing.finalCta.heading')}</h2>
            <p>{t('landing.finalCta.body')}</p>
            <Link to={primaryCtaTarget} className={styles.heroCta}>
              {primaryCtaLabel}
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default LandingPage

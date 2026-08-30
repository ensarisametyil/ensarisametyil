import { getScoreTier } from '../utils/scoreTier'
import { useTranslation } from '../hooks/useTranslation'
import ScoreRing from './ScoreRing'
import TextCard from './TextCard'
import ListCard from './ListCard'
import TagCard from './TagCard'
import cardStyles from './Card.module.css'
import styles from './AnalysisDashboard.module.css'
import type { CvAnalysisResult } from '../types/cv'

interface AnalysisDashboardProps {
  result: CvAnalysisResult
}

const TIER_KEY = {
  excellent: 'analysis.tier.excellent',
  good: 'analysis.tier.good',
  mid: 'analysis.tier.mid',
  low: 'analysis.tier.low',
} as const

/**
 * The CV analysis result screen. Section titles (below) are UI chrome and are translated; the
 * AI-generated content itself (result.summary/strengths/weaknesses/skills/experience/education/
 * missingKeywords/recommendations) is rendered exactly as the AI produced it, in whatever
 * language that was — see docs/i18n.md for why this is deliberate, not an oversight. Each
 * section is a self-contained card that hides itself when the AI returned no data for that field
 * (see ListCard/TagCard/TextCard) — there is no "No data" / undefined / empty-bullet placeholder
 * anywhere here.
 */
function AnalysisDashboard({ result }: AnalysisDashboardProps) {
  const { t } = useTranslation()
  const tier = getScoreTier(result.overallScore)

  return (
    <div className={styles.grid}>
      <section className={`${cardStyles.card} ${styles.scoreCard}`}>
        <h2 className={cardStyles.title}>{t('analysis.cvScore')}</h2>
        <ScoreRing score={result.overallScore} />
        <p className={styles.scoreTierLabel} data-tier={tier}>
          {t(TIER_KEY[tier])}
        </p>
      </section>

      <TextCard title={t('analysis.summary')} text={result.summary} className={styles.summarySlot} />

      <ListCard title={t('analysis.strengths')} items={result.strengths} tone="positive" className={styles.halfSlot} />
      <ListCard title={t('analysis.weaknesses')} items={result.weaknesses} tone="warning" className={styles.halfSlot} />

      <TagCard title={t('analysis.skills')} items={result.skills} className={styles.fullSlot} />

      <TextCard title={t('analysis.experience')} text={result.experience} className={styles.fullSlot} />
      <TextCard title={t('analysis.education')} text={result.education} className={styles.fullSlot} />

      <TagCard
        title={t('analysis.missingKeywords')}
        items={result.missingKeywords}
        tone="suggestion"
        note={t('analysis.missingKeywordsNote')}
        className={styles.fullSlot}
      />

      <ListCard title={t('analysis.recommendations')} items={result.recommendations} className={styles.fullSlot} />
    </div>
  )
}

export default AnalysisDashboard

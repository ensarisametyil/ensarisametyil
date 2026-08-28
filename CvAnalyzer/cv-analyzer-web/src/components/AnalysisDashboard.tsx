import { getScoreTier, getScoreTierLabel } from '../utils/scoreTier'
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

/**
 * The CV analysis result screen. Each section is a self-contained card that hides itself
 * when the AI returned no data for that field (see ListCard/TagCard/TextCard) — there is no
 * "No data" / undefined / empty-bullet placeholder anywhere here.
 */
function AnalysisDashboard({ result }: AnalysisDashboardProps) {
  const tier = getScoreTier(result.overallScore)

  return (
    <div className={styles.grid}>
      <section className={`${cardStyles.card} ${styles.scoreCard}`}>
        <h3 className={cardStyles.title}>CV Skoru</h3>
        <ScoreRing score={result.overallScore} />
        <p className={styles.scoreTierLabel} data-tier={tier}>
          {getScoreTierLabel(tier)}
        </p>
      </section>

      <TextCard title="Genel Değerlendirme" text={result.summary} className={styles.summarySlot} />

      <ListCard title="Güçlü Yönler" items={result.strengths} tone="positive" className={styles.halfSlot} />
      <ListCard title="Geliştirilmesi Gerekenler" items={result.weaknesses} tone="warning" className={styles.halfSlot} />

      <TagCard title="Yetenekler" items={result.skills} className={styles.fullSlot} />

      <TextCard title="Deneyim" text={result.experience} className={styles.fullSlot} />
      <TextCard title="Eğitim" text={result.education} className={styles.fullSlot} />

      <TagCard
        title="Eksik / Önerilen Anahtar Kelimeler"
        items={result.missingKeywords}
        tone="suggestion"
        note="Bu anahtar kelimeler yapay zekâ tarafından önerilmiştir; CV'nizde kesin olarak eksik olduğu anlamına gelmez, birer öneri olarak değerlendirin."
        className={styles.fullSlot}
      />

      <ListCard title="CV'ni Geliştirmek İçin Öneriler" items={result.recommendations} className={styles.fullSlot} />
    </div>
  )
}

export default AnalysisDashboard

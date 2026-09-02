import { getScoreTier } from '../utils/scoreTier'
import styles from './ScoreBar.module.css'

interface ScoreBarProps {
  label: string
  score: number
}

/** Labeled horizontal 0-100 score bar, colored by tier — used for CVora Score/Job Match/ATS component breakdowns. */
function ScoreBar({ label, score }: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, score))
  const tier = getScoreTier(clamped)

  return (
    <div className={styles.row}>
      <div className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{clamped}</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} data-tier={tier} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

export default ScoreBar

import { getScoreTier } from '../utils/scoreTier'
import styles from './ScoreRing.module.css'

interface ScoreRingProps {
  score: number
  size?: number
}

const TIER_COLOR_VAR: Record<ReturnType<typeof getScoreTier>, string> = {
  low: 'var(--score-low)',
  mid: 'var(--score-mid)',
  good: 'var(--score-good)',
  excellent: 'var(--score-excellent)',
}

/** Circular progress ring showing the overall CV score, colored by tier. */
function ScoreRing({ score, size = 140 }: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, score))
  const tier = getScoreTier(clamped)
  const strokeWidth = size * 0.09
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className={styles.wrapper} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`CV puanı ${clamped}/100`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TIER_COLOR_VAR[tier]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={styles.progress}
        />
      </svg>
      <div className={styles.label} aria-hidden="true">
        <span className={styles.value}>{clamped}</span>
        <span className={styles.max}>/100</span>
      </div>
    </div>
  )
}

export default ScoreRing

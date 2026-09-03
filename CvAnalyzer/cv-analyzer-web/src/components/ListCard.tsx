import { AlertTriangle, Check, Circle } from 'lucide-react'
import cardStyles from './Card.module.css'
import styles from './ListCard.module.css'

interface ListCardProps {
  title: string
  items: string[]
  tone?: 'neutral' | 'positive' | 'warning'
  className?: string
}

const TONE_ICON: Record<NonNullable<ListCardProps['tone']>, typeof Check> = {
  neutral: Circle,
  positive: Check,
  warning: AlertTriangle,
}

/** Bulleted list section. Renders nothing when the AI returned an empty list for this field. */
function ListCard({ title, items, tone = 'neutral', className }: ListCardProps) {
  if (items.length === 0) {
    return null
  }

  const ToneIcon = TONE_ICON[tone]

  return (
    <section className={`${cardStyles.card} ${className ?? ''}`}>
      <h2 className={cardStyles.title}>{title}</h2>
      <ul className={styles.list}>
        {items.map((item, index) => (
          <li key={index} className={`${styles.item} ${styles[tone]}`}>
            <span className={styles.marker} aria-hidden="true">
              <ToneIcon size={tone === 'neutral' ? 7 : 12} strokeWidth={tone === 'neutral' ? 0 : 2.5} fill={tone === 'neutral' ? 'currentColor' : 'none'} />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ListCard

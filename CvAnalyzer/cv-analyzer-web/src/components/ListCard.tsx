import cardStyles from './Card.module.css'
import styles from './ListCard.module.css'

interface ListCardProps {
  title: string
  items: string[]
  tone?: 'neutral' | 'positive' | 'warning'
  className?: string
}

const TONE_MARKER: Record<NonNullable<ListCardProps['tone']>, string> = {
  neutral: '•',
  positive: '✓',
  warning: '!',
}

/** Bulleted list section. Renders nothing when the AI returned an empty list for this field. */
function ListCard({ title, items, tone = 'neutral', className }: ListCardProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className={`${cardStyles.card} ${className ?? ''}`}>
      <h3 className={cardStyles.title}>{title}</h3>
      <ul className={styles.list}>
        {items.map((item, index) => (
          <li key={index} className={`${styles.item} ${styles[tone]}`}>
            <span className={styles.marker} aria-hidden="true">
              {TONE_MARKER[tone]}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ListCard

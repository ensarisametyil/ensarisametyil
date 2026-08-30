import cardStyles from './Card.module.css'
import styles from './TagCard.module.css'

interface TagCardProps {
  title: string
  items: string[]
  tone?: 'neutral' | 'suggestion'
  note?: string
  className?: string
}

/** Tag/badge list section (skills, missing keywords). Renders nothing when items is empty. */
function TagCard({ title, items, tone = 'neutral', note, className }: TagCardProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className={`${cardStyles.card} ${className ?? ''}`}>
      <h2 className={cardStyles.title}>{title}</h2>
      <div className={styles.tags}>
        {items.map((item, index) => (
          <span key={index} className={`${styles.tag} ${tone === 'suggestion' ? styles.suggestion : ''}`}>
            {item}
          </span>
        ))}
      </div>
      {note && <p className={styles.note}>{note}</p>}
    </section>
  )
}

export default TagCard

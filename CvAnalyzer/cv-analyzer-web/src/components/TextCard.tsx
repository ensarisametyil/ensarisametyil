import cardStyles from './Card.module.css'
import styles from './TextCard.module.css'

interface TextCardProps {
  title: string
  text: string
  className?: string
}

/** Prose section (summary, experience, education). Renders nothing when text is empty/blank. */
function TextCard({ title, text, className }: TextCardProps) {
  if (!text.trim()) {
    return null
  }

  return (
    <section className={`${cardStyles.card} ${className ?? ''}`}>
      <h2 className={cardStyles.title}>{title}</h2>
      <p className={styles.text}>{text}</p>
    </section>
  )
}

export default TextCard

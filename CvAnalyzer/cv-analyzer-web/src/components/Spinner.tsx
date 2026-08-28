import styles from './Spinner.module.css'

interface SpinnerProps {
  size?: number
  label?: string
}

/** Small indeterminate spinner — never a fake percentage/progress bar. */
function Spinner({ size = 18, label }: SpinnerProps) {
  return (
    <span className={styles.wrapper} role="status" aria-live="polite">
      <span className={styles.spinner} style={{ width: size, height: size }} aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  )
}

export default Spinner

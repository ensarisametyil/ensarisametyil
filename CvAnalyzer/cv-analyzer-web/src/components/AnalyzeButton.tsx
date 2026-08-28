import Spinner from './Spinner'
import styles from './AnalyzeButton.module.css'

interface AnalyzeButtonProps {
  isAnalyzing: boolean
  hasExistingResult: boolean
  onClick: () => void
  /** When set, the button is disabled and this reason (e.g. quota exhausted) is shown next to it. */
  disabledReason?: string
}

/** The primary "CV'yi Analiz Et" call to action. Disables itself while a request is in flight, or when disabledReason is set (e.g. monthly quota exhausted). */
function AnalyzeButton({ isAnalyzing, hasExistingResult, onClick, disabledReason }: AnalyzeButtonProps) {
  const isDisabled = isAnalyzing || Boolean(disabledReason)

  return (
    <div className={styles.wrapper}>
      <button type="button" className={styles.button} onClick={onClick} disabled={isDisabled}>
        {isAnalyzing ? (
          <Spinner label="CV analiz ediliyor..." />
        ) : hasExistingResult ? (
          'Tekrar Analiz Et'
        ) : (
          "CV'yi Analiz Et"
        )}
      </button>
      {disabledReason && !isAnalyzing && <p className={styles.disabledReason}>{disabledReason}</p>}
    </div>
  )
}

export default AnalyzeButton

import Spinner from './Spinner'
import styles from './AnalyzeButton.module.css'

interface AnalyzeButtonProps {
  isAnalyzing: boolean
  hasExistingResult: boolean
  onClick: () => void
}

/** The primary "CV'yi Analiz Et" call to action. Disables itself while a request is in flight. */
function AnalyzeButton({ isAnalyzing, hasExistingResult, onClick }: AnalyzeButtonProps) {
  return (
    <button type="button" className={styles.button} onClick={onClick} disabled={isAnalyzing}>
      {isAnalyzing ? (
        <Spinner label="CV analiz ediliyor..." />
      ) : hasExistingResult ? (
        'Tekrar Analiz Et'
      ) : (
        "CV'yi Analiz Et"
      )}
    </button>
  )
}

export default AnalyzeButton

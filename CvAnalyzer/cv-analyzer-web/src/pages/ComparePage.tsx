import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { listAnalyses } from '../api/analysisService'
import { compareAnalyses } from '../api/careerAssistantService'
import { useCareerAssistantAction } from '../hooks/useCareerAssistantAction'
import { useTranslation } from '../hooks/useTranslation'
import { getErrorMessage } from '../utils/errorMessages'
import PremiumFeatureNotice from '../components/PremiumFeatureNotice'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import cardStyles from '../components/Card.module.css'
import type { AnalysisSummary } from '../types/analysis'
import type { CvComparisonSide } from '../types/careerAssistant'
import styles from './ComparePage.module.css'

const ANALYSES_PAGE_SIZE = 100

function SideCard({ side, title }: { side: CvComparisonSide; title: string }) {
  const { t } = useTranslation()
  return (
    <section className={cardStyles.card}>
      <h2 className={cardStyles.title}>{title}</h2>
      <p className={styles.sideFileName}>{side.cvFileName}</p>
      <p className={styles.sideScore}>{side.overallScore}</p>

      {side.uniqueStrengths.length > 0 && (
        <>
          <p className={styles.sideListTitle}>{t('compare.uniqueStrengths')}</p>
          <ul className={styles.sideList}>
            {side.uniqueStrengths.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}

      {side.uniqueWeaknesses.length > 0 && (
        <>
          <p className={styles.sideListTitle}>{t('compare.uniqueWeaknesses')}</p>
          <ul className={styles.sideList}>
            {side.uniqueWeaknesses.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** CV A/B Comparison — a safe, non-AI MVP comparing two of the caller's own past base analyses. See docs/career-assistant.md. */
function ComparePage() {
  const { t } = useTranslation()
  const [analyses, setAnalyses] = useState<AnalysisSummary[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [idA, setIdA] = useState('')
  const [idB, setIdB] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const action = useCareerAssistantAction((a: string, b: string) => compareAnalyses(a, b))

  useEffect(() => {
    let cancelled = false

    listAnalyses(1, ANALYSES_PAGE_SIZE)
      .then((result) => {
        if (!cancelled) setAnalyses(result.items)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getErrorMessage(err, t))
      })

    return () => {
      cancelled = true
    }
  }, [t])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setValidationError(null)

    if (idA === idB) {
      setValidationError(t('compare.sameAnalysisError'))
      return
    }

    void action.run(idA, idB)
  }

  return (
    <main className={styles.page}>
      <Link to="/history" className={styles.backLink}>
        {t('compare.backToHistory')}
      </Link>

      <h1>{t('compare.title')}</h1>
      <p className={styles.description}>{t('compare.description')}</p>

      {loadError && <ErrorBanner message={loadError} />}

      {!analyses && !loadError && (
        <div className={styles.loading}>
          <Spinner label={t('common.loading')} />
        </div>
      )}

      {analyses && analyses.length < 2 && <p className={styles.hint}>{t('compare.needAtLeastTwo')}</p>}

      {analyses && analyses.length >= 2 && (
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>{t('compare.selectA')}</span>
            <select value={idA} onChange={(event) => setIdA(event.target.value)} required>
              <option value="" disabled>
                {t('compare.selectPlaceholder')}
              </option>
              {analyses.map((analysis) => (
                <option key={analysis.id} value={analysis.id}>
                  {analysis.cvFileName} — {analysis.overallScore}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>{t('compare.selectB')}</span>
            <select value={idB} onChange={(event) => setIdB(event.target.value)} required>
              <option value="" disabled>
                {t('compare.selectPlaceholder')}
              </option>
              {analyses.map((analysis) => (
                <option key={analysis.id} value={analysis.id}>
                  {analysis.cvFileName} — {analysis.overallScore}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className={styles.submitButton} disabled={action.isLoading || !idA || !idB}>
            {action.isLoading ? <Spinner label={t('compare.submitting')} /> : t('compare.submit')}
          </button>
        </form>
      )}

      {validationError && <ErrorBanner message={validationError} />}
      {action.isPremiumRequired && <PremiumFeatureNotice />}
      {action.errorMessage && <ErrorBanner message={action.errorMessage} />}

      {action.data && (
        <div className={styles.resultGrid}>
          <p className={styles.scoreDifference}>
            {t('compare.scoreDifference')}: {action.data.scoreDifference > 0 ? '+' : ''}
            {action.data.scoreDifference}
          </p>
          <div className={styles.sides}>
            <SideCard side={action.data.a} title={t('compare.selectA')} />
            <SideCard side={action.data.b} title={t('compare.selectB')} />
          </div>
        </div>
      )}
    </main>
  )
}

export default ComparePage

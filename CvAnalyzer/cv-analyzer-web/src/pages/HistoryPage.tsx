import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAnalyses } from '../api/analysisService'
import { getErrorMessage } from '../utils/errorMessages'
import { formatDate } from '../utils/formatDate'
import { getScoreTier } from '../utils/scoreTier'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import type { AnalysisSummary } from '../types/analysis'
import styles from './HistoryPage.module.css'

/** "Analiz Geçmişim" — every past analysis belonging to the signed-in user, newest first. */
function HistoryPage() {
  const [analyses, setAnalyses] = useState<AnalysisSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listAnalyses()
      .then((page) => {
        if (!cancelled) {
          setAnalyses(page.items)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err))
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className={styles.page}>
      <h1>Analiz Geçmişim</h1>

      {error && <ErrorBanner message={error} />}

      {!analyses && !error && (
        <div className={styles.loading}>
          <Spinner label="Yükleniyor..." />
        </div>
      )}

      {analyses && analyses.length === 0 && <p className={styles.empty}>Henüz bir analiz yapmadınız.</p>}

      {analyses && analyses.length > 0 && (
        <div className={styles.list}>
          {analyses.map((analysis) => (
            <Link key={analysis.id} to={`/history/${analysis.id}`} className={styles.row}>
              <div className={styles.rowMain}>
                <span className={styles.fileName}>{analysis.cvFileName}</span>
                <span className={styles.summary}>{analysis.summary}</span>
                <span className={styles.date}>{formatDate(analysis.createdAt)}</span>
              </div>
              <span className={styles.scoreBadge} data-tier={getScoreTier(analysis.overallScore)}>
                {analysis.overallScore}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}

export default HistoryPage

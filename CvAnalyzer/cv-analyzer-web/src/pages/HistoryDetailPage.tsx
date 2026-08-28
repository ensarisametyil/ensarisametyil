import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAnalysis } from '../api/analysisService'
import { getErrorMessage } from '../utils/errorMessages'
import { formatDate } from '../utils/formatDate'
import AnalysisDashboard from '../components/AnalysisDashboard'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import type { AnalysisDetail } from '../types/analysis'
import styles from './HistoryDetailPage.module.css'

/** Detail view of one past analysis, reached by clicking a row in "Analiz Geçmişim". */
function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<AnalysisDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      return
    }

    let cancelled = false

    getAnalysis(id)
      .then((result) => {
        if (!cancelled) {
          setDetail(result)
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
  }, [id])

  return (
    <main className={styles.page}>
      <Link to="/history" className={styles.backLink}>
        ← Analiz Geçmişime Dön
      </Link>

      {error && <ErrorBanner message={error} />}

      {!detail && !error && (
        <div className={styles.loading}>
          <Spinner label="Yükleniyor..." />
        </div>
      )}

      {detail && (
        <>
          <div className={styles.header}>
            <div className={styles.headerInfo}>
              <p className={styles.cvName}>{detail.cvFileName}</p>
              <p className={styles.date}>{formatDate(detail.createdAt)}</p>
            </div>
          </div>

          <AnalysisDashboard result={detail.result} />
        </>
      )}
    </main>
  )
}

export default HistoryDetailPage

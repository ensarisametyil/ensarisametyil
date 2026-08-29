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

const PAGE_SIZE = 20

/**
 * "Analiz Geçmişim" — every past analysis belonging to the signed-in user, newest first, paged
 * (never fetches more than PAGE_SIZE at once — a user with thousands of analyses would otherwise
 * force the browser to load and render all of them on this single page).
 */
function HistoryPage() {
  const [page, setPage] = useState(1)
  const [analyses, setAnalyses] = useState<AnalysisSummary[] | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listAnalyses(page, PAGE_SIZE)
      .then((result) => {
        if (!cancelled) {
          setAnalyses(result.items)
          setTotalCount(result.totalCount)
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
  }, [page])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function goToPage(nextPage: number) {
    setAnalyses(null)
    setError(null)
    setPage(nextPage)
  }

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
        <>
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

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Sayfalar">
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                Önceki
              </button>
              <span className={styles.pageIndicator}>
                Sayfa {page} / {totalPages}
              </span>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
              >
                Sonraki
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  )
}

export default HistoryPage

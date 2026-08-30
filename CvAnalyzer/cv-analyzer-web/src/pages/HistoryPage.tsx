import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAnalyses } from '../api/analysisService'
import { useTranslation } from '../hooks/useTranslation'
import { getErrorMessage } from '../utils/errorMessages'
import { formatDate } from '../i18n/format'
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
  const { t, locale } = useTranslation()
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
          setError(getErrorMessage(err, t))
        }
      })

    return () => {
      cancelled = true
    }
  }, [page, t])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  function goToPage(nextPage: number) {
    setAnalyses(null)
    setError(null)
    setPage(nextPage)
  }

  return (
    <main className={styles.page}>
      <h1>{t('history.title')}</h1>

      {error && <ErrorBanner message={error} />}

      {!analyses && !error && (
        <div className={styles.loading}>
          <Spinner label={t('common.loading')} />
        </div>
      )}

      {analyses && analyses.length === 0 && <p className={styles.empty}>{t('history.empty')}</p>}

      {analyses && analyses.length > 0 && (
        <>
          <div className={styles.list}>
            {analyses.map((analysis) => (
              <Link key={analysis.id} to={`/history/${analysis.id}`} className={styles.row}>
                <div className={styles.rowMain}>
                  <span className={styles.fileName}>{analysis.cvFileName}</span>
                  <span className={styles.summary}>{analysis.summary}</span>
                  <span className={styles.date}>{formatDate(analysis.createdAt, locale)}</span>
                </div>
                <span className={styles.scoreBadge} data-tier={getScoreTier(analysis.overallScore)}>
                  {analysis.overallScore}
                </span>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label={t('history.paginationLabel')}>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                {t('history.previous')}
              </button>
              <span className={styles.pageIndicator}>{t('history.pageIndicator', { page, totalPages })}</span>
              <button
                type="button"
                className={styles.pageButton}
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
              >
                {t('history.next')}
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  )
}

export default HistoryPage

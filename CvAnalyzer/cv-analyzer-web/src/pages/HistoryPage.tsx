import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAnalyses } from '../api/analysisService'
import { deleteCv } from '../api/cvService'
import { useTranslation } from '../hooks/useTranslation'
import { getErrorMessage } from '../utils/errorMessages'
import { formatDate } from '../i18n/format'
import { getScoreTier } from '../utils/scoreTier'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import type { AnalysisSummary } from '../types/analysis'
import type { Locale } from '../i18n/locales'
import type { I18nContextValue } from '../context/i18nContextObject'
import styles from './HistoryPage.module.css'

const PAGE_SIZE = 20

interface HistoryRowProps {
  analysis: AnalysisSummary
  locale: Locale
  t: I18nContextValue['t']
  onDeleted: (analysisId: string) => void
}

/** One history row: the analysis itself (a link to its detail page) plus a delete affordance
 * with an inline Evet/Hayır confirmation step, matching the pattern already used for account
 * deactivation and subscription cancellation. Deletion removes the underlying CV — and every
 * analysis derived from it — permanently, which is what docs/legal §4 (Privacy) promises. */
function HistoryRow({ analysis, locale, t, onDeleted }: HistoryRowProps) {
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleConfirmDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteCv(analysis.cvId)
      onDeleted(analysis.id)
    } catch (err) {
      setDeleteError(getErrorMessage(err, t))
      setIsDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div className={styles.rowWrapper}>
      <div className={styles.row}>
        <Link to={`/history/${analysis.id}`} className={styles.rowLink}>
          <div className={styles.rowMain}>
            <span className={styles.fileName}>{analysis.cvFileName}</span>
            <span className={styles.summary}>{analysis.summary}</span>
            <span className={styles.date}>{formatDate(analysis.createdAt, locale)}</span>
          </div>
          <span className={styles.scoreBadge} data-tier={getScoreTier(analysis.overallScore)}>
            {analysis.overallScore}
          </span>
        </Link>

        {!confirming && (
          <button
            type="button"
            className={styles.deleteButton}
            aria-label={t('history.deleteAriaLabel', { fileName: analysis.cvFileName })}
            onClick={() => setConfirming(true)}
          >
            {t('history.delete')}
          </button>
        )}
      </div>

      {confirming && (
        <div className={styles.confirmRow}>
          <p>{t('history.deleteConfirmQuestion')}</p>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.dangerButton} onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? <Spinner label={t('history.deleting')} /> : t('history.deleteConfirmYes')}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setConfirming(false)} disabled={isDeleting}>
              {t('history.deleteConfirmNo')}
            </button>
          </div>
        </div>
      )}

      {deleteError && <ErrorBanner message={deleteError} />}
    </div>
  )
}

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

  function handleDeleted(analysisId: string) {
    setAnalyses((current) => {
      const next = current?.filter((analysis) => analysis.id !== analysisId) ?? current
      // The last row on a page beyond the first just got deleted — go back a page instead of
      // showing an empty list with working "Previous"/"Next" controls pointing nowhere useful.
      if (next && next.length === 0 && page > 1) {
        goToPage(page - 1)
        return current
      }
      return next
    })
    setTotalCount((current) => Math.max(0, current - 1))
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
              <HistoryRow key={analysis.id} analysis={analysis} locale={locale} t={t} onDeleted={handleDeleted} />
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

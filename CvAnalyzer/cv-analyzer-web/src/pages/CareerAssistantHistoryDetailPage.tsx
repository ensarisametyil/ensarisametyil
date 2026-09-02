import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCareerAssistantResult } from '../api/careerAssistantService'
import { useTranslation } from '../hooks/useTranslation'
import { getErrorMessage } from '../utils/errorMessages'
import { formatDate } from '../i18n/format'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import ScoreBar from '../components/ScoreBar'
import ListCard from '../components/ListCard'
import TagCard from '../components/TagCard'
import TextCard from '../components/TextCard'
import cardStyles from '../components/Card.module.css'
import type {
  AtsAnalysisResult,
  CareerAssistantResultDetail,
  CareerRecommendationsResult,
  CoverLetterResult,
  CvRewriteResult,
  JobMatchResult,
} from '../types/careerAssistant'
import styles from './CareerAssistantPage.module.css'

function JobMatchView({ result }: { result: JobMatchResult }) {
  const { t } = useTranslation()
  return (
    <div className={styles.resultGrid}>
      <div className={styles.scoreBars}>
        <ScoreBar label={t('careerAssistant.jobMatch.overallScore')} score={result.overallScore} />
        <ScoreBar label={t('careerAssistant.jobMatch.skillsScore')} score={result.skillsScore} />
        <ScoreBar label={t('careerAssistant.jobMatch.experienceScore')} score={result.experienceScore} />
        <ScoreBar label={t('careerAssistant.jobMatch.keywordsScore')} score={result.keywordsScore} />
        <ScoreBar label={t('careerAssistant.jobMatch.educationScore')} score={result.educationScore} />
      </div>
      <TextCard title={t('careerAssistant.jobMatch.summary')} text={result.summary} />
      <TagCard title={t('careerAssistant.jobMatch.requiredSkills')} items={result.requiredSkills} />
      <TagCard title={t('careerAssistant.jobMatch.preferredSkills')} items={result.preferredSkills} />
      <TagCard title={t('careerAssistant.jobMatch.matchedSkills')} items={result.matchedSkills} />
      <TagCard title={t('careerAssistant.jobMatch.missingSkills')} items={result.missingSkills} tone="suggestion" />
      <ListCard title={t('careerAssistant.jobMatch.strengths')} items={result.strengths} tone="positive" />
      <ListCard title={t('careerAssistant.jobMatch.gaps')} items={result.gaps} tone="warning" />
      <ListCard title={t('careerAssistant.jobMatch.suggestedCvChanges')} items={result.suggestedCvChanges} />
    </div>
  )
}

function AtsAnalysisView({ result }: { result: AtsAnalysisResult }) {
  const { t } = useTranslation()
  return (
    <div className={styles.resultGrid}>
      <p className={styles.disclaimer}>{t('careerAssistant.ats.estimateDisclaimer')}</p>
      <div className={styles.scoreBars}>
        <ScoreBar label={t('careerAssistant.ats.atsScore')} score={result.atsScore} />
        <ScoreBar label={t('careerAssistant.ats.structureScore')} score={result.structureScore} />
        <ScoreBar label={t('careerAssistant.ats.keywordUsageScore')} score={result.keywordUsageScore} />
        <ScoreBar label={t('careerAssistant.ats.formattingScore')} score={result.formattingScore} />
        <ScoreBar label={t('careerAssistant.ats.readabilityScore')} score={result.readabilityScore} />
      </div>
      <TextCard title={t('careerAssistant.ats.summary')} text={result.summary} />
      <ListCard title={t('careerAssistant.ats.strengths')} items={result.strengths} tone="positive" />
      <ListCard title={t('careerAssistant.ats.risks')} items={result.risks} tone="warning" />
      <ListCard title={t('careerAssistant.ats.recommendations')} items={result.recommendations} />
    </div>
  )
}

function CvRewriteView({ result }: { result: CvRewriteResult }) {
  const { t } = useTranslation()
  return (
    <div className={styles.resultGrid}>
      <TextCard title={t('careerAssistant.rewrite.summary')} text={result.summary} />
      {result.suggestions.length > 0 && (
        <div className={styles.suggestionList}>
          {result.suggestions.map((suggestion, index) => (
            <div key={index} className={styles.suggestionCard}>
              <span className={styles.suggestionSection}>{suggestion.section}</span>
              <p className={styles.suggestionLabel}>{t('careerAssistant.rewrite.original')}</p>
              <p className={styles.suggestionOriginal}>{suggestion.original}</p>
              <p className={styles.suggestionLabel}>{t('careerAssistant.rewrite.improved')}</p>
              <p className={styles.suggestionImproved}>{suggestion.improved}</p>
              <p className={styles.suggestionReason}>{suggestion.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CareerRecommendationsView({ result }: { result: CareerRecommendationsResult }) {
  const { t } = useTranslation()
  return (
    <div className={styles.resultGrid}>
      <TextCard title={t('careerAssistant.recommendations.summary')} text={result.summary} />
      {result.recommendations.length > 0 && (
        <div className={styles.recommendationList}>
          {result.recommendations.map((recommendation, index) => (
            <div key={index} className={styles.recommendationCard}>
              <div className={styles.recommendationHeader}>
                <span className={styles.recommendationRole}>{recommendation.role}</span>
                <span className={styles.recommendationMatch}>
                  {t('careerAssistant.recommendations.matchLabel', { percent: recommendation.matchPercentage })}
                </span>
              </div>
              <p className={styles.recommendationReasoning}>{recommendation.reasoning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CoverLetterView({ result }: { result: CoverLetterResult }) {
  const { t } = useTranslation()
  return (
    <div className={styles.resultGrid}>
      <section className={cardStyles.card}>
        <h2 className={cardStyles.title}>{t('careerAssistant.coverLetter.resultTitle')}</h2>
        <p className={styles.coverLetterText}>{result.coverLetterText}</p>
      </section>
    </div>
  )
}

/** Detail view of one past Career Assistant result, reached from the per-CV history list. */
function CareerAssistantHistoryDetailPage() {
  const { t, locale } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<CareerAssistantResultDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    getCareerAssistantResult(id)
      .then((result) => {
        if (!cancelled) setDetail(result)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, t))
      })

    return () => {
      cancelled = true
    }
  }, [id, t])

  return (
    <main className={styles.page}>
      <Link to={detail ? `/assistant/${detail.cvId}` : '/app'} className={styles.inlineLink}>
        {t('careerAssistant.historyDetail.backToHistory')}
      </Link>

      {error && <ErrorBanner message={error} />}

      {!detail && !error && (
        <div className={styles.loading}>
          <Spinner label={t('common.loading')} />
        </div>
      )}

      {detail && (
        <>
          <header className={styles.header}>
            <h1>{t(`careerAssistant.history.types.${detail.type}`)}</h1>
            <p className={styles.cvName}>{detail.cvFileName}</p>
            <p className={styles.subtitle}>{formatDate(detail.createdAt, locale)}</p>
          </header>

          {detail.type === 'JobMatch' && <JobMatchView result={detail.result as JobMatchResult} />}
          {detail.type === 'AtsAnalysis' && <AtsAnalysisView result={detail.result as AtsAnalysisResult} />}
          {detail.type === 'CvRewrite' && <CvRewriteView result={detail.result as CvRewriteResult} />}
          {detail.type === 'CareerRecommendations' && <CareerRecommendationsView result={detail.result as CareerRecommendationsResult} />}
          {detail.type === 'CoverLetter' && <CoverLetterView result={detail.result as CoverLetterResult} />}
        </>
      )}
    </main>
  )
}

export default CareerAssistantHistoryDetailPage

import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getCv } from '../api/cvService'
import {
  analyzeAts,
  analyzeJobMatch,
  generateCoverLetter,
  getCvoraScore,
  listCareerAssistantHistory,
  recommendCareers,
  rewriteCv,
} from '../api/careerAssistantService'
import { useCareerAssistantAction } from '../hooks/useCareerAssistantAction'
import { useTranslation } from '../hooks/useTranslation'
import { getErrorMessage } from '../utils/errorMessages'
import { ApiError } from '../api/ApiError'
import { formatDate } from '../i18n/format'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import ScoreBar from '../components/ScoreBar'
import PremiumFeatureNotice from '../components/PremiumFeatureNotice'
import ListCard from '../components/ListCard'
import TagCard from '../components/TagCard'
import TextCard from '../components/TextCard'
import cardStyles from '../components/Card.module.css'
import type { CvDetail } from '../types/cv'
import type {
  CareerAssistantResultSummary,
  CoverLetterLocale,
  CvRewriteSuggestion,
  CareerRecommendation,
  CvoraScoreResult,
} from '../types/careerAssistant'
import styles from './CareerAssistantPage.module.css'

type TabId = 'overview' | 'jobMatch' | 'ats' | 'rewrite' | 'recommendations' | 'coverLetter' | 'history'
const TABS: TabId[] = ['overview', 'jobMatch', 'ats', 'rewrite', 'recommendations', 'coverLetter', 'history']

// ---------- Overview / CVora Score ----------

function OverviewPanel({ cvId }: { cvId: string }) {
  const { t } = useTranslation()
  const [score, setScore] = useState<CvoraScoreResult | null>(null)
  const [needsAnalysis, setNeedsAnalysis] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getCvoraScore(cvId)
      .then((result) => {
        if (!cancelled) setScore(result)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.code === 'ANALYSIS_NOT_FOUND') {
          setNeedsAnalysis(true)
        } else {
          setError(getErrorMessage(err, t))
        }
      })

    return () => {
      cancelled = true
    }
  }, [cvId, t])

  if (error) {
    return <ErrorBanner message={error} />
  }

  if (needsAnalysis) {
    return (
      <section className={cardStyles.card}>
        <h2 className={cardStyles.title}>{t('careerAssistant.cvoraScore.needsAnalysisTitle')}</h2>
        <p className={styles.description}>{t('careerAssistant.cvoraScore.needsAnalysisDescription')}</p>
        <Link to="/app" className={styles.inlineLink}>
          {t('careerAssistant.cvoraScore.goToAnalyze')}
        </Link>
      </section>
    )
  }

  if (!score) {
    return (
      <div className={styles.loading}>
        <Spinner label={t('common.loading')} />
      </div>
    )
  }

  return (
    <section className={cardStyles.card}>
      <div className={styles.scoreHeader}>
        <h2 className={cardStyles.title}>{t('careerAssistant.cvoraScore.title')}</h2>
        <span className={styles.bigScore}>{score.cvoraScore}</span>
      </div>
      <p className={styles.description}>{t('careerAssistant.cvoraScore.description')}</p>
      <div className={styles.scoreBars}>
        <ScoreBar label={t('careerAssistant.cvoraScore.components.contentQuality')} score={score.components.contentQuality} />
        <ScoreBar label={t('careerAssistant.cvoraScore.components.skills')} score={score.components.skills} />
        <ScoreBar label={t('careerAssistant.cvoraScore.components.experience')} score={score.components.experience} />
        <ScoreBar label={t('careerAssistant.cvoraScore.components.structure')} score={score.components.structure} />
        <ScoreBar label={t('careerAssistant.cvoraScore.components.readability')} score={score.components.readability} />
        {score.components.atsCompatibility !== null ? (
          <ScoreBar label={t('careerAssistant.cvoraScore.components.atsCompatibility')} score={score.components.atsCompatibility} />
        ) : (
          <p className={styles.hint}>{t('careerAssistant.cvoraScore.atsNotRun')}</p>
        )}
      </div>
    </section>
  )
}

// ---------- Job Match ----------

function JobMatchPanel({ cvId }: { cvId: string }) {
  const { t } = useTranslation()
  const [jobDescription, setJobDescription] = useState('')
  const action = useCareerAssistantAction((description: string) => analyzeJobMatch(cvId, description))

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void action.run(jobDescription)
  }

  if (action.isPremiumRequired) {
    return <PremiumFeatureNotice />
  }

  return (
    <section className={styles.panel}>
      <p className={styles.description}>{t('careerAssistant.jobMatch.description')}</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>{t('careerAssistant.jobMatch.jobDescriptionLabel')}</span>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder={t('careerAssistant.jobMatch.jobDescriptionPlaceholder')}
            rows={8}
            required
          />
        </label>
        <button type="submit" className={styles.submitButton} disabled={action.isLoading || !jobDescription.trim()}>
          {action.isLoading ? <Spinner label={t('careerAssistant.jobMatch.submitting')} /> : t('careerAssistant.jobMatch.submit')}
        </button>
      </form>

      {action.errorMessage && <ErrorBanner message={action.errorMessage} />}

      {action.data && (
        <div className={styles.resultGrid}>
          <div className={styles.scoreBars}>
            <ScoreBar label={t('careerAssistant.jobMatch.overallScore')} score={action.data.overallScore} />
            <ScoreBar label={t('careerAssistant.jobMatch.skillsScore')} score={action.data.skillsScore} />
            <ScoreBar label={t('careerAssistant.jobMatch.experienceScore')} score={action.data.experienceScore} />
            <ScoreBar label={t('careerAssistant.jobMatch.keywordsScore')} score={action.data.keywordsScore} />
            <ScoreBar label={t('careerAssistant.jobMatch.educationScore')} score={action.data.educationScore} />
          </div>
          <TextCard title={t('careerAssistant.jobMatch.summary')} text={action.data.summary} />
          <TagCard title={t('careerAssistant.jobMatch.requiredSkills')} items={action.data.requiredSkills} />
          <TagCard title={t('careerAssistant.jobMatch.preferredSkills')} items={action.data.preferredSkills} />
          <TagCard title={t('careerAssistant.jobMatch.matchedSkills')} items={action.data.matchedSkills} tone="neutral" />
          <TagCard title={t('careerAssistant.jobMatch.missingSkills')} items={action.data.missingSkills} tone="suggestion" />
          <ListCard title={t('careerAssistant.jobMatch.strengths')} items={action.data.strengths} tone="positive" />
          <ListCard title={t('careerAssistant.jobMatch.gaps')} items={action.data.gaps} tone="warning" />
          <ListCard title={t('careerAssistant.jobMatch.suggestedCvChanges')} items={action.data.suggestedCvChanges} />
        </div>
      )}
    </section>
  )
}

// ---------- ATS Analysis ----------

function AtsAnalysisPanel({ cvId }: { cvId: string }) {
  const { t } = useTranslation()
  const action = useCareerAssistantAction((id: string) => analyzeAts(id))

  if (action.isPremiumRequired) {
    return <PremiumFeatureNotice />
  }

  return (
    <section className={styles.panel}>
      <p className={styles.description}>{t('careerAssistant.ats.description')}</p>
      <p className={styles.disclaimer}>{t('careerAssistant.ats.estimateDisclaimer')}</p>

      <button type="button" className={styles.submitButton} onClick={() => action.run(cvId)} disabled={action.isLoading}>
        {action.isLoading ? <Spinner label={t('careerAssistant.ats.submitting')} /> : t('careerAssistant.ats.submit')}
      </button>

      {action.errorMessage && <ErrorBanner message={action.errorMessage} />}

      {action.data && (
        <div className={styles.resultGrid}>
          <div className={styles.scoreBars}>
            <ScoreBar label={t('careerAssistant.ats.atsScore')} score={action.data.atsScore} />
            <ScoreBar label={t('careerAssistant.ats.structureScore')} score={action.data.structureScore} />
            <ScoreBar label={t('careerAssistant.ats.keywordUsageScore')} score={action.data.keywordUsageScore} />
            <ScoreBar label={t('careerAssistant.ats.formattingScore')} score={action.data.formattingScore} />
            <ScoreBar label={t('careerAssistant.ats.readabilityScore')} score={action.data.readabilityScore} />
          </div>
          <TextCard title={t('careerAssistant.ats.summary')} text={action.data.summary} />
          <ListCard title={t('careerAssistant.ats.strengths')} items={action.data.strengths} tone="positive" />
          <ListCard title={t('careerAssistant.ats.risks')} items={action.data.risks} tone="warning" />
          <ListCard title={t('careerAssistant.ats.recommendations')} items={action.data.recommendations} />
        </div>
      )}
    </section>
  )
}

// ---------- CV Rewriter ----------

function SuggestionRow({ suggestion }: { suggestion: CvRewriteSuggestion }) {
  const { t } = useTranslation()
  return (
    <div className={styles.suggestionCard}>
      <span className={styles.suggestionSection}>{suggestion.section}</span>
      <p className={styles.suggestionLabel}>{t('careerAssistant.rewrite.original')}</p>
      <p className={styles.suggestionOriginal}>{suggestion.original}</p>
      <p className={styles.suggestionLabel}>{t('careerAssistant.rewrite.improved')}</p>
      <p className={styles.suggestionImproved}>{suggestion.improved}</p>
      <p className={styles.suggestionReason}>{suggestion.reason}</p>
    </div>
  )
}

function CvRewritePanel({ cvId }: { cvId: string }) {
  const { t } = useTranslation()
  const action = useCareerAssistantAction((id: string) => rewriteCv(id))

  if (action.isPremiumRequired) {
    return <PremiumFeatureNotice />
  }

  return (
    <section className={styles.panel}>
      <p className={styles.description}>{t('careerAssistant.rewrite.description')}</p>

      <button type="button" className={styles.submitButton} onClick={() => action.run(cvId)} disabled={action.isLoading}>
        {action.isLoading ? <Spinner label={t('careerAssistant.rewrite.submitting')} /> : t('careerAssistant.rewrite.submit')}
      </button>

      {action.errorMessage && <ErrorBanner message={action.errorMessage} />}

      {action.data && (
        <div className={styles.resultGrid}>
          <TextCard title={t('careerAssistant.rewrite.summary')} text={action.data.summary} />
          {action.data.suggestions.length > 0 && (
            <div className={styles.suggestionList}>
              {action.data.suggestions.map((suggestion, index) => (
                <SuggestionRow key={index} suggestion={suggestion} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ---------- Career Recommendations ----------

function RecommendationRow({ recommendation }: { recommendation: CareerRecommendation }) {
  const { t } = useTranslation()
  return (
    <div className={styles.recommendationCard}>
      <div className={styles.recommendationHeader}>
        <span className={styles.recommendationRole}>{recommendation.role}</span>
        <span className={styles.recommendationMatch}>{t('careerAssistant.recommendations.matchLabel', { percent: recommendation.matchPercentage })}</span>
      </div>
      <p className={styles.recommendationReasoning}>{recommendation.reasoning}</p>
    </div>
  )
}

function CareerRecommendationsPanel({ cvId }: { cvId: string }) {
  const { t } = useTranslation()
  const action = useCareerAssistantAction((id: string) => recommendCareers(id))

  if (action.isPremiumRequired) {
    return <PremiumFeatureNotice />
  }

  return (
    <section className={styles.panel}>
      <p className={styles.description}>{t('careerAssistant.recommendations.description')}</p>

      <button type="button" className={styles.submitButton} onClick={() => action.run(cvId)} disabled={action.isLoading}>
        {action.isLoading ? <Spinner label={t('careerAssistant.recommendations.submitting')} /> : t('careerAssistant.recommendations.submit')}
      </button>

      {action.errorMessage && <ErrorBanner message={action.errorMessage} />}

      {action.data && (
        <div className={styles.resultGrid}>
          <TextCard title={t('careerAssistant.recommendations.summary')} text={action.data.summary} />
          {action.data.recommendations.length > 0 && (
            <div className={styles.recommendationList}>
              {action.data.recommendations.map((recommendation, index) => (
                <RecommendationRow key={index} recommendation={recommendation} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ---------- Cover Letter ----------

const COVER_LETTER_LOCALES: CoverLetterLocale[] = ['tr', 'en', 'de']

function CoverLetterPanel({ cvId }: { cvId: string }) {
  const { t } = useTranslation()
  const [jobDescription, setJobDescription] = useState('')
  const [locale, setLocale] = useState<CoverLetterLocale>('tr')
  const [copied, setCopied] = useState(false)
  const action = useCareerAssistantAction((description: string, targetLocale: CoverLetterLocale) => generateCoverLetter(cvId, description, targetLocale))

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setCopied(false)
    void action.run(jobDescription, locale)
  }

  async function handleCopy() {
    if (!action.data) return
    try {
      await navigator.clipboard.writeText(action.data.coverLetterText)
      setCopied(true)
    } catch {
      // Clipboard access can be denied by the browser — the text is still visible and selectable, so this is never fatal.
    }
  }

  if (action.isPremiumRequired) {
    return <PremiumFeatureNotice />
  }

  return (
    <section className={styles.panel}>
      <p className={styles.description}>{t('careerAssistant.coverLetter.description')}</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>{t('careerAssistant.coverLetter.jobDescriptionLabel')}</span>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder={t('careerAssistant.coverLetter.jobDescriptionPlaceholder')}
            rows={8}
            required
          />
        </label>
        <label className={styles.field}>
          <span>{t('careerAssistant.coverLetter.languageLabel')}</span>
          <select value={locale} onChange={(event) => setLocale(event.target.value as CoverLetterLocale)}>
            {COVER_LETTER_LOCALES.map((option) => (
              <option key={option} value={option}>
                {t(`careerAssistant.coverLetter.language${option === 'tr' ? 'Tr' : option === 'en' ? 'En' : 'De'}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={styles.submitButton} disabled={action.isLoading || !jobDescription.trim()}>
          {action.isLoading ? <Spinner label={t('careerAssistant.coverLetter.submitting')} /> : t('careerAssistant.coverLetter.submit')}
        </button>
      </form>

      {action.errorMessage && <ErrorBanner message={action.errorMessage} />}

      {action.data && (
        <div className={styles.resultGrid}>
          <section className={cardStyles.card}>
            <div className={styles.scoreHeader}>
              <h2 className={cardStyles.title}>{t('careerAssistant.coverLetter.resultTitle')}</h2>
              <button type="button" className={styles.copyButton} onClick={handleCopy}>
                {copied ? t('careerAssistant.coverLetter.copied') : t('careerAssistant.coverLetter.copy')}
              </button>
            </div>
            <p className={styles.coverLetterText}>{action.data.coverLetterText}</p>
          </section>
        </div>
      )}
    </section>
  )
}

// ---------- History ----------

const HISTORY_TYPE_KEY: Record<string, string> = {
  JobMatch: 'careerAssistant.history.types.JobMatch',
  AtsAnalysis: 'careerAssistant.history.types.AtsAnalysis',
  CvRewrite: 'careerAssistant.history.types.CvRewrite',
  CareerRecommendations: 'careerAssistant.history.types.CareerRecommendations',
  CoverLetter: 'careerAssistant.history.types.CoverLetter',
}

function HistoryPanel({ cvId }: { cvId: string }) {
  const { t, locale } = useTranslation()
  const [items, setItems] = useState<CareerAssistantResultSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listCareerAssistantHistory(cvId, 1, 20)
      .then((result) => {
        if (!cancelled) setItems(result.items)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, t))
      })

    return () => {
      cancelled = true
    }
  }, [cvId, t])

  if (error) {
    return <ErrorBanner message={error} />
  }

  if (!items) {
    return (
      <div className={styles.loading}>
        <Spinner label={t('common.loading')} />
      </div>
    )
  }

  if (items.length === 0) {
    return <p className={styles.hint}>{t('careerAssistant.history.empty')}</p>
  }

  return (
    <div className={styles.historyList}>
      {items.map((item) => (
        <Link key={item.id} to={`/assistant/history/${item.id}`} className={styles.historyRow}>
          <span className={styles.historyType}>{t(HISTORY_TYPE_KEY[item.type] ?? item.type)}</span>
          <span className={styles.historyDate}>{formatDate(item.createdAt, locale)}</span>
        </Link>
      ))}
    </div>
  )
}

// ---------- Page ----------

/** CVora AI's Career Assistant — Job Match, ATS Analyzer, CV Rewriter, Career Recommendations, Cover Letter, plus the always-available CVora Score and a scoped history list, all for one CV. See docs/career-assistant.md. */
function CareerAssistantPage() {
  const { t } = useTranslation()
  const { cvId } = useParams<{ cvId: string }>()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [cv, setCv] = useState<CvDetail | null>(null)
  const [cvError, setCvError] = useState<string | null>(null)

  useEffect(() => {
    if (!cvId) return
    let cancelled = false

    getCv(cvId)
      .then((result) => {
        if (!cancelled) setCv(result)
      })
      .catch((err) => {
        if (!cancelled) setCvError(getErrorMessage(err, t))
      })

    return () => {
      cancelled = true
    }
  }, [cvId, t])

  if (!cvId) {
    return null
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>{t('careerAssistant.title')}</h1>
        <p className={styles.subtitle}>{t('careerAssistant.subtitle')}</p>
        {cv && (
          <p className={styles.cvName}>
            {t('careerAssistant.cvLabel')}: {cv.fileName}
          </p>
        )}
      </header>

      {cvError && <ErrorBanner message={cvError} />}

      <nav className={styles.tabs} role="tablist" aria-label={t('careerAssistant.title')}>
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={activeTab === tab ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab)}
          >
            {t(`careerAssistant.tabs.${tab}`)}
          </button>
        ))}
      </nav>

      <div className={styles.tabPanel}>
        {activeTab === 'overview' && <OverviewPanel cvId={cvId} />}
        {activeTab === 'jobMatch' && <JobMatchPanel cvId={cvId} />}
        {activeTab === 'ats' && <AtsAnalysisPanel cvId={cvId} />}
        {activeTab === 'rewrite' && <CvRewritePanel cvId={cvId} />}
        {activeTab === 'recommendations' && <CareerRecommendationsPanel cvId={cvId} />}
        {activeTab === 'coverLetter' && <CoverLetterPanel cvId={cvId} />}
        {activeTab === 'history' && <HistoryPanel cvId={cvId} />}
      </div>
    </main>
  )
}

export default CareerAssistantPage

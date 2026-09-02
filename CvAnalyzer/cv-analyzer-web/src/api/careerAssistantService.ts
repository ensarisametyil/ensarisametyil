import { API_BASE_URL } from './config'
import { requestJson } from './httpClient'
import type { PagedResult } from '../types/analysis'
import type {
  AtsAnalysisResult,
  CareerAssistantResultDetail,
  CareerAssistantResultSummary,
  CareerRecommendationsResult,
  CoverLetterLocale,
  CoverLetterResult,
  CvComparisonResult,
  CvRewriteResult,
  CvoraScoreResult,
  JobMatchResult,
} from '../types/careerAssistant'

function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Matches the job description against the CV and scores the fit (Premium: JobDescriptionAnalysis). */
export function analyzeJobMatch(cvId: string, jobDescription: string): Promise<JobMatchResult> {
  return postJson<JobMatchResult>('/api/career-assistant/job-match', { cvId, jobDescription })
}

/** Estimates ATS (Applicant Tracking System) compatibility (Premium: AtsAnalysis). */
export function analyzeAts(cvId: string): Promise<AtsAnalysisResult> {
  return postJson<AtsAnalysisResult>('/api/career-assistant/ats-analysis', { cvId })
}

/** Suggests more professional phrasing for existing CV content — never invents new experience (Premium: CvRewrite). */
export function rewriteCv(cvId: string): Promise<CvRewriteResult> {
  return postJson<CvRewriteResult>('/api/career-assistant/rewrite', { cvId })
}

/** Suggests suitable job titles based purely on what the CV demonstrates (Premium: AdvancedRecommendations). */
export function recommendCareers(cvId: string): Promise<CareerRecommendationsResult> {
  return postJson<CareerRecommendationsResult>('/api/career-assistant/career-recommendations', { cvId })
}

/** Generates a cover letter for the given job description in the requested language (Premium: CoverLetterGeneration). */
export function generateCoverLetter(cvId: string, jobDescription: string, locale: CoverLetterLocale): Promise<CoverLetterResult> {
  return postJson<CoverLetterResult>('/api/career-assistant/cover-letter', { cvId, jobDescription, locale })
}

/** Fetches CVora AI's own deterministic CV score — never feature-gated, available to Free users too. */
export function getCvoraScore(cvId: string): Promise<CvoraScoreResult> {
  return requestJson<CvoraScoreResult>(`${API_BASE_URL}/api/career-assistant/cvora-score/${cvId}`)
}

/** Lists the authenticated user's past Career Assistant results, newest first. Pass cvId to scope to one CV. */
export function listCareerAssistantHistory(cvId?: string, page = 1, pageSize = 20): Promise<PagedResult<CareerAssistantResultSummary>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (cvId) {
    params.set('cvId', cvId)
  }
  return requestJson<PagedResult<CareerAssistantResultSummary>>(`${API_BASE_URL}/api/career-assistant/history?${params.toString()}`)
}

/** Fetches one past Career Assistant result's full detail. */
export function getCareerAssistantResult(id: string): Promise<CareerAssistantResultDetail> {
  return requestJson<CareerAssistantResultDetail>(`${API_BASE_URL}/api/career-assistant/history/${id}`)
}

/** Compares two of the caller's own past base analyses — a safe, non-AI MVP (Premium: CvComparison). */
export function compareAnalyses(analysisIdA: string, analysisIdB: string): Promise<CvComparisonResult> {
  const params = new URLSearchParams({ analysisIdA, analysisIdB })
  return requestJson<CvComparisonResult>(`${API_BASE_URL}/api/career-assistant/compare?${params.toString()}`)
}

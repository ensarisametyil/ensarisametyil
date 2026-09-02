/**
 * TS mirrors of CvAnalyzer.Api/Models/Dtos/CareerAssistant/*.cs — every shape here matches the
 * backend record exactly (field names, nullability). See docs/career-assistant.md.
 */

/** Response of POST /api/career-assistant/job-match (JobMatchResult). */
export interface JobMatchResult {
  overallScore: number
  skillsScore: number
  experienceScore: number
  keywordsScore: number
  educationScore: number
  summary: string
  requiredSkills: string[]
  preferredSkills: string[]
  matchedSkills: string[]
  missingSkills: string[]
  strengths: string[]
  gaps: string[]
  suggestedCvChanges: string[]
}

/**
 * Response of POST /api/career-assistant/ats-analysis (AtsAnalysisResult). This is CVora AI's own
 * heuristic ESTIMATE of ATS compatibility — never a guarantee of how any real ATS product will
 * behave. Always render it labeled as an estimate (see analysis copy in the locale files).
 */
export interface AtsAnalysisResult {
  atsScore: number
  structureScore: number
  keywordUsageScore: number
  formattingScore: number
  readabilityScore: number
  summary: string
  strengths: string[]
  risks: string[]
  recommendations: string[]
}

/** One weak-to-improved rewrite pair (CvRewriteSuggestion). */
export interface CvRewriteSuggestion {
  section: string
  original: string
  improved: string
  reason: string
}

/** Response of POST /api/career-assistant/rewrite (CvRewriteResult). */
export interface CvRewriteResult {
  summary: string
  suggestions: CvRewriteSuggestion[]
}

/** One candidate job title suggestion (CareerRecommendation). */
export interface CareerRecommendation {
  role: string
  matchPercentage: number
  reasoning: string
}

/** Response of POST /api/career-assistant/career-recommendations (CareerRecommendationsResult). */
export interface CareerRecommendationsResult {
  summary: string
  recommendations: CareerRecommendation[]
}

/** Response of POST /api/career-assistant/cover-letter (CoverLetterResult). */
export interface CoverLetterResult {
  coverLetterText: string
}

/** CvoraScoreResult.components — every field a named, testable derivation, never a magic number. */
export interface CvoraScoreComponents {
  contentQuality: number
  skills: number
  experience: number
  structure: number
  readability: number
  /** Null until the user has run an ATS Analysis for this CV. */
  atsCompatibility: number | null
}

/** Response of GET /api/career-assistant/cvora-score/{cvId} — not feature-gated (available to Free users too). */
export interface CvoraScoreResult {
  cvoraScore: number
  components: CvoraScoreComponents
  basedOnAnalysisId: string
  basedOnAtsAnalysisId: string | null
}

export type CareerAssistantResultType = 'JobMatch' | 'AtsAnalysis' | 'CvRewrite' | 'CareerRecommendations' | 'CoverLetter'

/** One row of GET /api/career-assistant/history (CareerAssistantResultSummaryDto). */
export interface CareerAssistantResultSummary {
  id: string
  cvId: string
  cvFileName: string
  type: CareerAssistantResultType
  createdAt: string
}

/**
 * Response of GET /api/career-assistant/history/{id} (CareerAssistantResultDetailDto). `result`'s
 * actual shape depends on `type` — narrow it with the CareerAssistantResultByType map below before
 * rendering.
 */
export interface CareerAssistantResultDetail {
  id: string
  cvId: string
  cvFileName: string
  type: CareerAssistantResultType
  createdAt: string
  result: unknown
}

/** Narrows CareerAssistantResultDetail.result by its `type` discriminant. */
export interface CareerAssistantResultByType {
  JobMatch: JobMatchResult
  AtsAnalysis: AtsAnalysisResult
  CvRewrite: CvRewriteResult
  CareerRecommendations: CareerRecommendationsResult
  CoverLetter: CoverLetterResult
}

/** One side of GET /api/career-assistant/compare (CvComparisonSide). */
export interface CvComparisonSide {
  analysisId: string
  cvId: string
  cvFileName: string
  overallScore: number
  createdAt: string
  uniqueStrengths: string[]
  uniqueWeaknesses: string[]
}

/** Response of GET /api/career-assistant/compare (CvComparisonResultDto). */
export interface CvComparisonResult {
  a: CvComparisonSide
  b: CvComparisonSide
  scoreDifference: number
}

/** One of CVora AI's three supported cover-letter languages — matches EmailCopyCatalog's convention. */
export type CoverLetterLocale = 'tr' | 'en' | 'de'

import { API_BASE_URL } from './config'
import { requestJson } from './httpClient'
import type { AnalysisDetail, AnalysisSummary, PagedResult } from '../types/analysis'

/** Lists the authenticated user's past analyses, newest first. */
export function listAnalyses(page = 1, pageSize = 20): Promise<PagedResult<AnalysisSummary>> {
  return requestJson<PagedResult<AnalysisSummary>>(
    `${API_BASE_URL}/api/analyses?page=${page}&pageSize=${pageSize}`,
  )
}

/** Fetches the full detail (including the original CvAnalysisResult) of one past analysis. */
export function getAnalysis(id: string): Promise<AnalysisDetail> {
  return requestJson<AnalysisDetail>(`${API_BASE_URL}/api/analyses/${id}`)
}

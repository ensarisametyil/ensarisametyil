import type { CvAnalysisResult } from './cv';

/** Generic page wrapper — mirrors CvAnalyzer.Api's PagedResultDto<T>. */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/** One row of GET /api/analyses (AnalysisSummaryDto). */
export interface AnalysisSummary {
  id: string;
  cvId: string;
  cvFileName: string;
  overallScore: number;
  summary: string;
  createdAt: string;
}

/** Response of GET /api/analyses/{id} (AnalysisDetailDto). */
export interface AnalysisDetail {
  id: string;
  cvId: string;
  cvFileName: string;
  createdAt: string;
  result: CvAnalysisResult;
}

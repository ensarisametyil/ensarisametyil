/** Response of POST /api/cv/upload. */
export interface CvUploadResponse {
  cvId: string;
  fileName: string;
}

/**
 * Response of POST /api/cv/{id}/analyze — mirrors CvAnalyzer.Api's CvAnalysisResult record
 * exactly (see CvAnalyzer.Api/Models/Dtos/CvAnalysisResult.cs). Note that `experience` and
 * `education` are prose summaries (string), not structured lists — verified against the real
 * backend model rather than assumed.
 */
export interface CvAnalysisResult {
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  skills: string[];
  experience: string;
  education: string;
  missingKeywords: string[];
  recommendations: string[];
}

/** Shape of every 4xx/5xx JSON body returned by the API (ErrorResponseDto). */
export interface ApiErrorResponse {
  code: string;
  message: string;
}

/** Response of GET /api/cv/{id} (CvDetailDto). */
export interface CvDetail {
  id: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

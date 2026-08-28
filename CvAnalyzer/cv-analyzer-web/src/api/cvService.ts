import { API_BASE_URL } from './config'
import { requestJson } from './httpClient'
import type { CvAnalysisResult, CvUploadResponse } from '../types/cv'

/** Uploads a CV file and returns its assigned id + stored file name. */
export function uploadCv(file: File): Promise<CvUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

  return requestJson<CvUploadResponse>(`${API_BASE_URL}/api/cv/upload`, {
    method: 'POST',
    body: formData,
  })
}

/** Requests an AI analysis for a previously uploaded CV. */
export function analyzeCv(cvId: string): Promise<CvAnalysisResult> {
  return requestJson<CvAnalysisResult>(`${API_BASE_URL}/api/cv/${cvId}/analyze`, {
    method: 'POST',
  })
}

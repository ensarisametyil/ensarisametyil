import { API_BASE_URL } from './config'
import { requestJson, requestVoid } from './httpClient'
import type { CvAnalysisResult, CvDetail, CvUploadResponse } from '../types/cv'

/** Fetches one of the authenticated user's own CVs by id (ownership-scoped, same 404 for someone else's CV as for a nonexistent one). */
export function getCv(cvId: string): Promise<CvDetail> {
  return requestJson<CvDetail>(`${API_BASE_URL}/api/cv/${cvId}`)
}

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

/** Permanently deletes a CV and every analysis derived from it (backend cascade-deletes). */
export function deleteCv(cvId: string): Promise<void> {
  return requestVoid(`${API_BASE_URL}/api/cv/${cvId}`, {
    method: 'DELETE',
  })
}

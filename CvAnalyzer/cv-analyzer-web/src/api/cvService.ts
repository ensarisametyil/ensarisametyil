import { API_BASE_URL } from './config'
import { ApiError } from './ApiError'
import type { ApiErrorResponse, CvAnalysisResult, CvUploadResponse } from '../types/cv'

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ApiErrorResponse>
    return new ApiError(response.status, body.message ?? `İstek başarısız oldu (${response.status}).`, body.code)
  } catch {
    // Body wasn't JSON (or was empty) — fall back to a generic, still-safe message.
    return new ApiError(response.status, `İstek başarısız oldu (${response.status}).`)
  }
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(input, init)
  } catch {
    // fetch() only throws for network-level failures (DNS, connection refused, CORS, offline) —
    // there was never an HTTP response to inspect.
    throw new ApiError(0, 'Sunucuya bağlanılamadı.')
  }

  if (!response.ok) {
    throw await parseErrorResponse(response)
  }

  return (await response.json()) as T
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

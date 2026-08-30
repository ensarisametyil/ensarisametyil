import { useCallback, useState } from 'react'
import { analyzeCv, uploadCv } from '../api/cvService'
import { getErrorMessage } from '../utils/errorMessages'
import { useTranslation } from './useTranslation'
import type { CvAnalysisResult, CvUploadResponse } from '../types/cv'

export type CvFlowStatus = 'idle' | 'uploading' | 'uploaded' | 'analyzing' | 'analyzed'

export interface UseCvAnalysis {
  status: CvFlowStatus
  cv: CvUploadResponse | null
  analysis: CvAnalysisResult | null
  uploadError: string | null
  analyzeError: string | null
  uploadFile: (file: File) => Promise<void>
  analyze: () => Promise<void>
  reset: () => void
}

/**
 * Drives the upload -> analyze -> dashboard flow as a small state machine, so components stay
 * presentational and every API call lives in one place (cvService).
 */
export function useCvAnalysis(): UseCvAnalysis {
  const { t } = useTranslation()
  const [status, setStatus] = useState<CvFlowStatus>('idle')
  const [cv, setCv] = useState<CvUploadResponse | null>(null)
  const [analysis, setAnalysis] = useState<CvAnalysisResult | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const uploadFile = useCallback(async (file: File) => {
    setStatus('uploading')
    setUploadError(null)
    setAnalyzeError(null)
    setAnalysis(null)

    try {
      const result = await uploadCv(file)
      setCv(result)
      setStatus('uploaded')
    } catch (error) {
      setCv(null)
      setUploadError(getErrorMessage(error, t))
      setStatus('idle')
    }
  }, [t])

  const analyze = useCallback(async () => {
    // Guards against a spammed button click starting a second (billable) request while one
    // is already in flight, on top of the button being disabled in the UI.
    if (!cv || status === 'analyzing') {
      return
    }

    setStatus('analyzing')
    setAnalyzeError(null)

    try {
      const result = await analyzeCv(cv.cvId)
      setAnalysis(result)
      setStatus('analyzed')
    } catch (error) {
      setAnalyzeError(getErrorMessage(error, t))
      setStatus('uploaded')
    }
  }, [cv, status, t])

  const reset = useCallback(() => {
    setStatus('idle')
    setCv(null)
    setAnalysis(null)
    setUploadError(null)
    setAnalyzeError(null)
  }, [])

  return { status, cv, analysis, uploadError, analyzeError, uploadFile, analyze, reset }
}

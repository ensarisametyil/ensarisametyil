import { useState } from 'react'
import { ApiError } from '../api/ApiError'
import { getErrorMessage } from '../utils/errorMessages'
import { useTranslation } from './useTranslation'

type Status = 'idle' | 'loading' | 'success' | 'error'

/**
 * Generic async-action state machine shared by every Career Assistant feature panel (Job Match,
 * ATS Analysis, CV Rewrite, Career Recommendations, Cover Letter) — same shape as useCvAnalysis's
 * status handling, but reusable across five different result types instead of one. A 403 with
 * code PREMIUM_FEATURE_REQUIRED is surfaced separately (isPremiumRequired) so panels can render
 * PremiumFeatureNotice instead of a generic error banner; access control itself is still enforced
 * entirely server-side (IFeatureEntitlementService) — this flag only reflects that decision.
 */
export function useCareerAssistantAction<TArgs extends unknown[], TResult>(action: (...args: TArgs) => Promise<TResult>) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('idle')
  const [data, setData] = useState<TResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPremiumRequired, setIsPremiumRequired] = useState(false)

  async function run(...args: TArgs) {
    setStatus('loading')
    setErrorMessage(null)
    setIsPremiumRequired(false)

    try {
      const result = await action(...args)
      setData(result)
      setStatus('success')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PREMIUM_FEATURE_REQUIRED') {
        setIsPremiumRequired(true)
      } else {
        setErrorMessage(getErrorMessage(err, t))
      }
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setData(null)
    setErrorMessage(null)
    setIsPremiumRequired(false)
  }

  return { status, data, errorMessage, isPremiumRequired, isLoading: status === 'loading', run, reset }
}

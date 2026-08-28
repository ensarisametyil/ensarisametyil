import { useCallback, useEffect, useState, type ReactNode } from 'react'
import * as billingService from '../api/billingService'
import { useAuth } from '../hooks/useAuth'
import { BillingContext, type BillingContextValue } from './billingContextObject'
import type { Usage } from '../types/billing'

/**
 * Owns the authenticated user's plan/usage summary. Fetches it once the user is authenticated
 * (never before — /api/billing/usage requires a token) and clears it immediately on logout, so a
 * stale plan/usage from a previous session can never be shown as if it belonged to whoever is
 * currently signed in.
 */
export function BillingProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [usage, setUsage] = useState<Usage | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      return
    }

    setIsLoading(true)
    try {
      const result = await billingService.getUsage()
      setUsage(result)
    } catch {
      // Non-critical — the plan/usage badge just won't render; the core upload/analyze flow
      // doesn't depend on this succeeding.
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    async function sync() {
      if (isAuthenticated) {
        await refresh()
      } else {
        setUsage(null)
      }
    }

    void sync()
  }, [isAuthenticated, refresh])

  const value: BillingContextValue = { usage, isLoading, refresh }

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
}

import { createContext } from 'react'
import type { Usage } from '../types/billing'

export interface BillingContextValue {
  usage: Usage | null
  isLoading: boolean
  /** Re-fetches usage from the backend — call after a successful analyze so the counter updates immediately. */
  refresh: () => Promise<void>
}

export const BillingContext = createContext<BillingContextValue | undefined>(undefined)

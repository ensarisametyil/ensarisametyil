import { API_BASE_URL } from './config'
import { requestJson } from './httpClient'
import type { Usage } from '../types/billing'

/** Fetches the authenticated user's current plan and this period's analysis usage. */
export function getUsage(): Promise<Usage> {
  return requestJson<Usage>(`${API_BASE_URL}/api/billing/usage`)
}

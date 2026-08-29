import { API_BASE_URL } from './config'
import { requestJson } from './httpClient'
import type { CheckoutBuyerInfo, CheckoutResponse, Usage } from '../types/billing'

/** Fetches the authenticated user's current plan and this period's analysis usage. */
export function getUsage(): Promise<Usage> {
  return requestJson<Usage>(`${API_BASE_URL}/api/billing/usage`)
}

/** Starts a Premium subscription checkout. Returns a form to render — never a plan change by itself; only a verified Iyzico result (server-side) can ever grant Premium. */
export function startCheckout(buyer: CheckoutBuyerInfo): Promise<CheckoutResponse> {
  return requestJson<CheckoutResponse>(`${API_BASE_URL}/api/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buyer),
  })
}

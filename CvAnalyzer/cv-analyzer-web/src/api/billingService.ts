import { API_BASE_URL } from './config'
import { requestJson } from './httpClient'
import type { CheckoutBuyerInfo, CheckoutResponse, PaymentHistoryItem, PlanCatalogResponse, SubscriptionDetails, Usage } from '../types/billing'

/** Fetches the public plan catalog (limits + Premium's price). No auth required — the public Landing page needs this before anyone signs in. */
export function getPlans(): Promise<PlanCatalogResponse> {
  return requestJson<PlanCatalogResponse>(`${API_BASE_URL}/api/billing/plans`, { skipAuth: true })
}

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

/** Fetches richer subscription detail (status/provider/dates) for the account/billing page. */
export function getSubscription(): Promise<SubscriptionDetails> {
  return requestJson<SubscriptionDetails>(`${API_BASE_URL}/api/billing/subscription`)
}

/** Cancels the authenticated user's active Premium subscription via Iyzico. */
export function cancelSubscription(): Promise<{ message: string }> {
  return requestJson(`${API_BASE_URL}/api/billing/subscription/cancel`, { method: 'POST' })
}

/** Fetches the authenticated user's own past checkout attempts, newest first. */
export function getPaymentHistory(): Promise<PaymentHistoryItem[]> {
  return requestJson<PaymentHistoryItem[]>(`${API_BASE_URL}/api/billing/payments`)
}

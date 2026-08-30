/** Response of GET /api/billing/usage. limit/remaining are null for an unlimited plan — never a magic number like -1. */
export interface Usage {
  plan: 'FREE' | 'PREMIUM'
  used: number
  limit: number | null
  remaining: number | null
  periodStart: string
  periodEnd: string
}

/**
 * Buyer info Iyzico's checkout form requires (KYC/fraud-prevention). This is the ONLY thing this
 * app ever sends toward starting a payment — never a plan, a "paid" flag, or anything about the
 * outcome, since the outcome can only ever be decided by a verified provider result on the
 * backend (see docs/iyzico-integration.md).
 */
export interface CheckoutBuyerInfo {
  name: string
  surname: string
  identityNumber: string
  gsmNumber: string
  city: string
  addressLine: string
}

/** Response of POST /api/billing/checkout — a form to render, never a Premium grant by itself. */
export interface CheckoutResponse {
  token: string
  checkoutFormContent: string
}

/** Response of GET /api/billing/subscription. Status/Provider/dates are null for a Free user who has never checked out — not an error. */
export interface SubscriptionDetails {
  plan: 'FREE' | 'PREMIUM'
  status: string | null
  provider: string | null
  startDate: string | null
  endDate: string | null
  canCancel: boolean
}

/**
 * One row of GET /api/billing/payments. amount/currency (Stage 15) are the backend's own catalog
 * price recorded at checkout time — never a raw provider payload, and never anything computed
 * client-side.
 */
export interface PaymentHistoryItem {
  date: string
  status: string
  provider: string | null
  subscriptionReference: string | null
  amount: number | null
  currency: string | null
}

/** One plan's public catalog info — what it grants and what it costs. Never user-specific. */
export interface PlanPricing {
  monthlyAnalysisLimit: number | null
  monthlyPriceUsd: number | null
  currency: string | null
}

/**
 * Response of GET /api/billing/plans — the single backend-owned source of truth for Premium's
 * price. The frontend never invents or hard-codes this figure; every price shown anywhere in the
 * app (Landing, checkout, account) is read from here.
 */
export interface PlanCatalogResponse {
  free: PlanPricing
  premium: PlanPricing
}

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

/** One row of GET /api/billing/payments — deliberately no amount (this app never defined a plan price) and no raw provider payload. */
export interface PaymentHistoryItem {
  date: string
  status: string
  provider: string | null
  subscriptionReference: string | null
}

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

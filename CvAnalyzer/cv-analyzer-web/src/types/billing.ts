/** Response of GET /api/billing/usage. limit/remaining are null for an unlimited plan — never a magic number like -1. */
export interface Usage {
  plan: 'FREE' | 'PREMIUM'
  used: number
  limit: number | null
  remaining: number | null
  periodStart: string
  periodEnd: string
}

import type { PaymentHistoryItem } from './billing'

/** Generic page wrapper — mirrors CvAnalyzer.Api's PagedResultDto<T>. */
export interface AdminPagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

/** One row of GET /api/admin/users. */
export interface AdminUserListItem {
  id: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  plan: 'Free' | 'Premium'
}

/** Response of GET /api/admin/users/{id} — account + subscription + usage + this user's own payment history, composed from the same services the user's own account page reads. */
export interface AdminUserDetail {
  id: string
  email: string
  createdAt: string
  role: string
  isActive: boolean
  emailVerifiedAt: string | null
  plan: 'Free' | 'Premium'
  subscriptionStatus: string | null
  subscriptionStartDate: string | null
  subscriptionEndDate: string | null
  usageUsed: number
  usageLimit: number | null
  usageRemaining: number | null
  payments: PaymentHistoryItem[]
}

/** One row of GET /api/admin/payments — across all users. */
export interface AdminPaymentListItem {
  id: string
  userId: string
  userEmail: string
  status: string
  amount: number | null
  currency: string | null
  subscriptionReference: string | null
  createdAt: string
  processedAt: string | null
}

/** Response of GET /api/admin/dashboard. */
export interface AdminDashboardStats {
  totalUsers: number
  activeUsers: number
  newUsersLast7Days: number
  freeUsers: number
  premiumUsers: number
  activeSubscriptions: number
  succeededPayments: number
  failedPayments: number
  pendingPayments: number
  totalRevenueUsd: number
  totalAnalyses: number
  analysesLast30Days: number
  recentPayments: AdminPaymentListItem[]
}

/** One row of GET /api/admin/audit-logs. */
export interface AdminAuditLogEntry {
  id: string
  adminEmail: string
  action: string
  targetEmail: string | null
  details: string | null
  success: boolean
  createdAt: string
}

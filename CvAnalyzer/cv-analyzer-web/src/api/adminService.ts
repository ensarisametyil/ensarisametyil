import { API_BASE_URL } from './config'
import { requestJson } from './httpClient'
import type {
  AdminAuditLogEntry,
  AdminDashboardStats,
  AdminPagedResult,
  AdminPaymentListItem,
  AdminUserDetail,
  AdminUserListItem,
} from '../types/admin'

/**
 * Every call here hits an [Authorize(Roles = "Admin")]-gated endpoint — the backend rejects a
 * non-admin caller with 403 regardless of what this frontend does or doesn't show, so nothing in
 * this file (or the pages that call it) is itself a security boundary; see AdminRoute.
 */

export function getDashboardStats(): Promise<AdminDashboardStats> {
  return requestJson<AdminDashboardStats>(`${API_BASE_URL}/api/admin/dashboard`)
}

export function listUsers(page = 1, pageSize = 20, search?: string): Promise<AdminPagedResult<AdminUserListItem>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (search) {
    params.set('search', search)
  }
  return requestJson<AdminPagedResult<AdminUserListItem>>(`${API_BASE_URL}/api/admin/users?${params.toString()}`)
}

export function getUserDetail(userId: string): Promise<AdminUserDetail> {
  return requestJson<AdminUserDetail>(`${API_BASE_URL}/api/admin/users/${userId}`)
}

export function setUserActive(userId: string, isActive: boolean): Promise<{ message: string }> {
  return requestJson(`${API_BASE_URL}/api/admin/users/${userId}/active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  })
}

export function setUserRole(userId: string, role: string): Promise<{ message: string }> {
  return requestJson(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  })
}

/** Cancels a user's active Premium subscription — the same Iyzico-backed cancel path the user's own account page uses, just admin-initiated. Never grants Premium; only ever downgrades. */
export function cancelUserSubscription(userId: string): Promise<{ message: string }> {
  return requestJson(`${API_BASE_URL}/api/admin/users/${userId}/subscription/cancel`, { method: 'POST' })
}

export function listPayments(
  page = 1,
  pageSize = 20,
  filters: { status?: string; search?: string; fromDate?: string; toDate?: string } = {},
): Promise<AdminPagedResult<AdminPaymentListItem>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  if (filters.fromDate) params.set('fromDate', filters.fromDate)
  if (filters.toDate) params.set('toDate', filters.toDate)
  return requestJson<AdminPagedResult<AdminPaymentListItem>>(`${API_BASE_URL}/api/admin/payments?${params.toString()}`)
}

export function listAuditLogs(page = 1, pageSize = 20): Promise<AdminPagedResult<AdminAuditLogEntry>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return requestJson<AdminPagedResult<AdminAuditLogEntry>>(`${API_BASE_URL}/api/admin/audit-logs?${params.toString()}`)
}

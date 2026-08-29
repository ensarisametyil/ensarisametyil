import { API_BASE_URL } from './config'
import { requestJson } from './httpClient'
import type { AuthResponse, User } from '../types/auth'

/** Registers a new account and returns an access token + the created user. */
export function register(email: string, password: string): Promise<AuthResponse> {
  return requestJson<AuthResponse>(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  })
}

/** Logs in with an existing account and returns an access token + the user. */
export function login(email: string, password: string): Promise<AuthResponse> {
  return requestJson<AuthResponse>(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  })
}

/** Fetches the currently authenticated user (validates the stored token against the server). */
export function me(): Promise<User> {
  return requestJson<User>(`${API_BASE_URL}/api/auth/me`)
}

/** Changes the authenticated user's password. Requires the current password (never just the token). */
export function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return requestJson(`${API_BASE_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

/**
 * Always resolves with the same message regardless of whether the email is registered — the
 * backend is deliberately enumeration-safe here. Never assume a real email was sent (this
 * environment has no email provider wired up — see docs/authentication.md); show the backend's
 * own honest message as-is.
 */
export function forgotPassword(email: string): Promise<{ message: string }> {
  return requestJson(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
    skipAuth: true,
  })
}

/** Completes a password reset using the token from the reset link. */
export function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return requestJson(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
    skipAuth: true,
  })
}

/** Soft-closes the authenticated user's account (requires password confirmation). CVs/analyses/subscriptions/payment records are preserved server-side. */
export function deactivateAccount(password: string): Promise<{ message: string }> {
  return requestJson(`${API_BASE_URL}/api/auth/deactivate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
}

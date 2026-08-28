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

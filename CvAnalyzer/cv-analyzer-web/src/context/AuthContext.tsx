import { useCallback, useEffect, useState, type ReactNode } from 'react'
import * as authService from '../api/authService'
import { onUnauthorized } from '../api/authEvents'
import { clearToken, getToken, setToken } from '../api/tokenStorage'
import { AuthContext, type AuthContextValue } from './authContextObject'
import type { User } from '../types/auth'

/**
 * Owns the authenticated user's session for the whole app: restores it from a stored token on
 * load, exposes login/register/logout, and reacts to a 401 from anywhere in the app (see
 * httpClient + authEvents) by logging out — so an expired/invalidated token can never leave the
 * UI silently "authenticated" while every request actually fails.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  useEffect(() => onUnauthorized(logout), [logout])

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      if (!getToken()) {
        setIsLoading(false)
        return
      }

      try {
        const restoredUser = await authService.me()
        if (!cancelled) {
          setUser(restoredUser)
        }
      } catch {
        // Token invalid/expired — httpClient's 401 handling already cleared it via emitUnauthorized.
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password)
    setToken(response.accessToken)
    setUser(response.user)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const response = await authService.register(email, password)
    setToken(response.accessToken)
    setUser(response.user)
  }, [])

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

import { useContext } from 'react'
import { AuthContext } from '../context/authContextObject'

/** Reads the current auth session (user, login/register/logout). Must be used inside <AuthProvider>. */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

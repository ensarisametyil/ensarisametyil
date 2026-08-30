type Translate = (key: string) => string

/**
 * Mirrors the backend's password policy (Services/Auth/PasswordPolicy.cs) so weak passwords are
 * caught client-side before a round trip — the backend remains the source of truth and validates
 * again regardless, this is purely a UX shortcut.
 */
export function getPasswordPolicyError(password: string, t: Translate): string | null {
  if (password.length < 8) {
    return t('validation.passwordMinLength')
  }
  if (!/[A-Za-z]/.test(password)) {
    return t('validation.passwordNeedsLetter')
  }
  if (!/[0-9]/.test(password)) {
    return t('validation.passwordNeedsDigit')
  }
  return null
}

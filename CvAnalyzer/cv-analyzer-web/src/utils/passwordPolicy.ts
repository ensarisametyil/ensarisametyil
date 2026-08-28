/**
 * Mirrors the backend's password policy (Services/Auth/PasswordPolicy.cs) so weak passwords are
 * caught client-side before a round trip — the backend remains the source of truth and validates
 * again regardless, this is purely a UX shortcut.
 */
export function getPasswordPolicyError(password: string): string | null {
  if (password.length < 8) {
    return 'Parola en az 8 karakter olmalıdır.'
  }
  if (!/[A-Za-z]/.test(password)) {
    return 'Parola en az bir harf içermelidir.'
  }
  if (!/[0-9]/.test(password)) {
    return 'Parola en az bir rakam içermelidir.'
  }
  return null
}

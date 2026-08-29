import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/authService'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/errorMessages'
import { getPasswordPolicyError } from '../utils/passwordPolicy'
import styles from './AuthPage.module.css'

/** Reads the reset token from the URL (?token=...) and lets the user set a new password. */
function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('Parolalar eşleşmiyor.')
      return
    }

    const policyError = getPasswordPolicyError(newPassword)
    if (policyError) {
      setError(policyError)
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword(token, newPassword)
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <h1>Geçersiz Bağlantı</h1>
          <ErrorBanner message="Şifre sıfırlama bağlantısı eksik veya geçersiz." />
          <p className={styles.switchText}>
            <Link to="/forgot-password">Yeniden şifre sıfırlama isteği gönder</Link>
          </p>
        </div>
      </main>
    )
  }

  if (success) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <h1>Şifreniz Güncellendi</h1>
          <p className={styles.hint} role="status">
            Yeni şifrenizle giriş yapabilirsiniz.
          </p>
          <p className={styles.switchText}>
            <Link to="/login">Giriş yap</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>Yeni Şifre Belirle</h1>

        {error && <ErrorBanner message={error} />}

        <label className={styles.field}>
          <span>Yeni Parola</span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>

        <label className={styles.field}>
          <span>Yeni Parola (Tekrar)</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <p className={styles.hint}>En az 8 karakter, en az bir harf ve bir rakam içermelidir.</p>

        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? <Spinner label="Kaydediliyor..." /> : 'Şifreyi Güncelle'}
        </button>
      </form>
    </main>
  )
}

export default ResetPasswordPage

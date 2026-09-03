import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/authService'
import { useTranslation } from '../hooks/useTranslation'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/errorMessages'
import { getPasswordPolicyError } from '../utils/passwordPolicy'
import styles from './AuthPage.module.css'

/** Reads the reset token from the URL (?token=...) and lets the user set a new password. */
function ResetPasswordPage() {
  const { t } = useTranslation()
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
      setError(t('validation.passwordsDontMatch'))
      return
    }

    const policyError = getPasswordPolicyError(newPassword, t)
    if (policyError) {
      setError(policyError)
      return
    }

    setIsSubmitting(true)
    try {
      await resetPassword(token, newPassword)
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <Link to="/" className={styles.brand}>
            {t('app.name')}
          </Link>
          <h1>{t('auth.resetPassword.invalidLinkTitle')}</h1>
          <ErrorBanner message={t('auth.resetPassword.invalidLinkMessage')} />
          <p className={styles.switchText}>
            <Link to="/forgot-password">{t('auth.resetPassword.requestNewLink')}</Link>
          </p>
        </div>
      </main>
    )
  }

  if (success) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <Link to="/" className={styles.brand}>
            {t('app.name')}
          </Link>
          <h1>{t('auth.resetPassword.successTitle')}</h1>
          <p className={styles.hint} role="status">
            {t('auth.resetPassword.successMessage')}
          </p>
          <p className={styles.switchText}>
            <Link to="/login">{t('auth.resetPassword.loginLink')}</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <Link to="/" className={styles.brand}>
          {t('app.name')}
        </Link>
        <h1>{t('auth.resetPassword.title')}</h1>

        {error && <ErrorBanner message={error} />}

        <label className={styles.field}>
          <span>{t('auth.resetPassword.newPassword')}</span>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>

        <label className={styles.field}>
          <span>{t('auth.resetPassword.confirmPassword')}</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <p className={styles.hint}>{t('auth.resetPassword.passwordHint')}</p>

        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? <Spinner label={t('auth.resetPassword.submitting')} /> : t('auth.resetPassword.submit')}
        </button>
      </form>
    </main>
  )
}

export default ResetPasswordPage

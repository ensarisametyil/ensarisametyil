import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/authService'
import { useTranslation } from '../hooks/useTranslation'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/errorMessages'
import styles from './AuthPage.module.css'

/**
 * Collects an email and calls the enumeration-safe forgot-password endpoint, which always
 * responds with the same message whether or not the email is registered. This environment has no
 * real email provider wired up (see docs/authentication.md) — the message shown is the backend's
 * own honest one, never a fabricated "email sent" claim. That backend message is always Turkish
 * (see docs/i18n.md — it isn't a mapped error `code`, so it can't be localized without changing
 * the API contract), so it is shown as-is regardless of the active UI language.
 */
function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await forgotPassword(email)
      setMessage(response.message)
    } catch (err) {
      setError(getErrorMessage(err, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <Link to="/" className={styles.brand}>
          {t('app.name')}
        </Link>
        <h1>{t('auth.forgotPassword.title')}</h1>

        {error && <ErrorBanner message={error} />}
        {message && (
          <p className={styles.hint} role="status">
            {message}
          </p>
        )}

        {!message && (
          <>
            <label className={styles.field}>
              <span>{t('auth.forgotPassword.email')}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? <Spinner label={t('auth.forgotPassword.submitting')} /> : t('auth.forgotPassword.submit')}
            </button>
          </>
        )}

        <p className={styles.switchText}>
          <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
        </p>
      </form>
    </main>
  )
}

export default ForgotPasswordPage

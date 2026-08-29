import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/authService'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/errorMessages'
import styles from './AuthPage.module.css'

/**
 * Collects an email and calls the enumeration-safe forgot-password endpoint, which always
 * responds with the same message whether or not the email is registered. This environment has no
 * real email provider wired up (see docs/authentication.md) — the message shown is the backend's
 * own honest one, never a fabricated "e-posta gönderildi" claim.
 */
function ForgotPasswordPage() {
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
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>Şifremi Unuttum</h1>

        {error && <ErrorBanner message={error} />}
        {message && (
          <p className={styles.hint} role="status">
            {message}
          </p>
        )}

        {!message && (
          <>
            <label className={styles.field}>
              <span>E-posta</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? <Spinner label="Gönderiliyor..." /> : 'Gönder'}
            </button>
          </>
        )}

        <p className={styles.switchText}>
          <Link to="/login">Giriş sayfasına dön</Link>
        </p>
      </form>
    </main>
  )
}

export default ForgotPasswordPage

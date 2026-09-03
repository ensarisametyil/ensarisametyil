import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from '../hooks/useTranslation'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/errorMessages'
import styles from './AuthPage.module.css'

interface LocationState {
  from?: Location
}

function LoginPage() {
  const { login } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/app'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(email, password)
      navigate(redirectTo, { replace: true })
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
        <h1>{t('auth.login.title')}</h1>

        {error && <ErrorBanner message={error} />}

        <label className={styles.field}>
          <span>{t('auth.login.email')}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className={styles.field}>
          <span>{t('auth.login.password')}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? <Spinner label={t('auth.login.submitting')} /> : t('auth.login.submit')}
        </button>

        <p className={styles.switchText}>
          <Link to="/forgot-password">{t('auth.login.forgotPassword')}</Link>
        </p>
        <p className={styles.switchText}>
          {t('auth.login.noAccount')} <Link to="/register">{t('auth.login.registerLink')}</Link>
        </p>
      </form>
    </main>
  )
}

export default LoginPage

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import { getErrorMessage } from '../utils/errorMessages'
import { getPasswordPolicyError } from '../utils/passwordPolicy'
import styles from './AuthPage.module.css'

function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    const policyError = getPasswordPolicyError(password)
    if (policyError) {
      setError(policyError)
      return
    }

    setIsSubmitting(true)
    try {
      await register(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1>Kayıt Ol</h1>

        {error && <ErrorBanner message={error} />}

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

        <label className={styles.field}>
          <span>Parola</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <p className={styles.hint}>En az 8 karakter, en az bir harf ve bir rakam içermelidir.</p>

        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? <Spinner label="Kayıt olunuyor..." /> : 'Kayıt Ol'}
        </button>

        <p className={styles.switchText}>
          Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
        </p>
      </form>
    </main>
  )
}

export default RegisterPage

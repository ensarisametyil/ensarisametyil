import { useState, type FormEvent } from 'react'
import PublicHeader from '../components/PublicHeader'
import Footer from '../components/Footer'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import { submitContact } from '../api/contactService'
import { getErrorMessage } from '../utils/errorMessages'
import styles from './ContactPage.module.css'

/**
 * The success message here only ever appears after the backend has genuinely persisted the
 * message (POST /api/contact returning 200) — never shown optimistically or on a request that
 * failed. See docs/stage-10.md for why there is no simulated email-delivery confirmation.
 */
function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await submitContact({ name, email, subject, message })
      setSubmitted(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <PublicHeader />
      <main className={styles.content}>
        <h1>İletişim</h1>
        <p className={styles.intro}>Sorularınız veya geri bildirimleriniz için aşağıdaki formu kullanabilirsiniz.</p>

        {submitted ? (
          <p className={styles.successMessage} role="status">
            Mesajınız alındı. Teşekkür ederiz.
          </p>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            {error && <ErrorBanner message={error} />}

            <label className={styles.field}>
              <span>Ad Soyad</span>
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label className={styles.field}>
              <span>E-posta</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className={styles.field}>
              <span>Konu</span>
              <input type="text" value={subject} onChange={(event) => setSubject(event.target.value)} required />
            </label>
            <label className={styles.field}>
              <span>Mesaj</span>
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} required />
            </label>

            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? <Spinner label="Gönderiliyor..." /> : 'Gönder'}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default ContactPage

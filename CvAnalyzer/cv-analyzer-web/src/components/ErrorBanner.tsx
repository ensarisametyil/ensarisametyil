import { AlertCircle } from 'lucide-react'
import styles from './ErrorBanner.module.css'

interface ErrorBannerProps {
  message: string
}

/** Safe, user-facing error display — the message must already be sanitized (see utils/errorMessages). */
function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className={styles.banner} role="alert">
      <AlertCircle size={18} className={styles.icon} aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}

export default ErrorBanner

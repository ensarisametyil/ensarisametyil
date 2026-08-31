import { useTranslation } from '../hooks/useTranslation'
import styles from '../pages/AdminPages.module.css'

/** Colored badge for a PaymentTransactionStatus string ("Succeeded" | "Failed" | "Initiated") — shared by the Admin dashboard, payments list, and user detail page so status coloring stays consistent. */
function PaymentStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()

  const variant = status === 'Succeeded' ? styles.badgeSuccess : status === 'Failed' ? styles.badgeDanger : styles.badgeWarning
  const label =
    status === 'Succeeded'
      ? t('admin.payments.statusSucceeded')
      : status === 'Failed'
        ? t('admin.payments.statusFailed')
        : t('admin.payments.statusInitiated')

  return <span className={`${styles.badge} ${variant}`}>{label}</span>
}

export default PaymentStatusBadge

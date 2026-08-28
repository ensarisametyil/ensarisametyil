import { useContext } from 'react'
import { BillingContext } from '../context/billingContextObject'

/** Reads the current user's plan/usage summary. Must be used inside <BillingProvider>. */
export function useBilling() {
  const context = useContext(BillingContext)
  if (!context) {
    throw new Error('useBilling must be used within a BillingProvider')
  }
  return context
}

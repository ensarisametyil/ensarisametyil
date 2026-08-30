import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Keeps <link rel="canonical"> in sync with the current path on every route change. Built from
 * window.location.origin (never a hardcoded domain — unknown at build time) and the pathname
 * only, deliberately dropping any query string/hash so e.g. "/reset-password?token=..." always
 * canonicalizes to the same clean URL.
 */
export function useCanonicalUrl() {
  const location = useLocation()

  useEffect(() => {
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${window.location.origin}${location.pathname}`)
  }, [location.pathname])
}

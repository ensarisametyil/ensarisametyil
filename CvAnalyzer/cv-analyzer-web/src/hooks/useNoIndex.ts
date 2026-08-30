import { useEffect } from 'react'

/**
 * Marks the current page as non-indexable for as long as the calling component is mounted —
 * belt-and-suspenders on top of robots.txt's path-based Disallow rules (a JS-injected meta tag
 * is respected by crawlers that execute JavaScript, robots.txt covers the rest). Restores the
 * previous content on unmount so navigating back to a public page doesn't leak a stale noindex.
 */
export function useNoIndex() {
  useEffect(() => {
    const tag = document.querySelector('meta[name="robots"]')
    const previous = tag?.getAttribute('content') ?? null
    tag?.setAttribute('content', 'noindex, nofollow')
    return () => {
      if (previous !== null) {
        tag?.setAttribute('content', previous)
      }
    }
  }, [])
}

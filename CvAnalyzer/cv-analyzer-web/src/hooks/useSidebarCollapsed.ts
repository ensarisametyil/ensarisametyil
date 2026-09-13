import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'cvorai.sidebarCollapsed'

function detectInitial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/** Desktop-only sidebar collapse-to-rail state, persisted per browser (see Sidebar.tsx). Shared by AppLayout and AdminLayout so the preference carries across both shells. */
export function useSidebarCollapsed() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(detectInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isCollapsed))
    } catch {
      // Best-effort persistence only — a private/disabled localStorage must never crash the app.
    }
  }, [isCollapsed])

  const toggle = useCallback(() => {
    setIsCollapsed((current) => !current)
  }, [])

  return { isCollapsed, toggle }
}

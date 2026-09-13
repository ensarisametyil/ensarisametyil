import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type Theme, type ThemeContextValue } from './themeContextObject'

const THEME_STORAGE_KEY = 'cvorai.theme'

/** Mirrors index.css's --bg for each theme — kept in sync here since <meta name="theme-color">
 * can only ever hold a static value, not a CSS custom property. */
const THEME_COLOR: Record<Theme, string> = {
  dark: '#0a0a0d',
  light: '#fbfbfc',
}

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'dark' || value === 'light'
}

/**
 * Stored preference wins. With no stored preference, CVora AI defaults to dark — its primary,
 * designed-for identity — rather than following the visitor's OS setting (same
 * no-auto-detection philosophy as I18nContext's locale default, for the same reason: predictable,
 * environment-independent first render).
 */
function detectInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(stored)) {
      return stored
    }
  } catch {
    // localStorage unavailable (private mode, disabled by policy) — fall through.
  }

  return 'dark'
}

/** Wraps the whole app (see App.tsx) — every page/component reaches this through useTheme(). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(detectInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Best-effort persistence only — a private/disabled localStorage must never crash the app.
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

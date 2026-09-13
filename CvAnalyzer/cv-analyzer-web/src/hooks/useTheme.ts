import { useContext } from 'react'
import { ThemeContext } from '../context/themeContextObject'

/** Reads { theme, setTheme, toggleTheme }. Must be used inside <ThemeProvider> (wraps the whole app in App.tsx). */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

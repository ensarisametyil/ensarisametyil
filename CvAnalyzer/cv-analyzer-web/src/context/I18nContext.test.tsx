import { afterEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from './I18nContext'
import { useTranslation } from '../hooks/useTranslation'
import LanguageSelector from '../components/LanguageSelector'

const STORAGE_KEY = 'cvorai.locale'

/** A minimal consumer that exercises t() (including a deliberately missing key) — enough to
 * test the provider's behavior without depending on any real page. */
function Probe() {
  const { t } = useTranslation()
  return (
    <div>
      <p data-testid="login-label">{t('publicHeader.login')}</p>
      <p data-testid="missing-key">{t('this.key.does.not.exist')}</p>
    </div>
  )
}

function renderProbe() {
  return render(
    <I18nProvider>
      <LanguageSelector />
      <Probe />
    </I18nProvider>,
  )
}

describe('I18nProvider / useTranslation', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('defaults to Turkish when there is no stored preference', () => {
    renderProbe()

    expect(screen.getByTestId('login-label')).toHaveTextContent('Giriş Yap')
    expect(document.documentElement.lang).toBe('tr')
  })

  it('switches the whole UI to English without a page reload when EN is selected', async () => {
    const user = userEvent.setup()
    renderProbe()

    await user.click(screen.getByRole('button', { name: 'English' }))

    expect(screen.getByTestId('login-label')).toHaveTextContent('Log In')
    expect(document.documentElement.lang).toBe('en')
  })

  it('switches the whole UI to German when DE is selected', async () => {
    const user = userEvent.setup()
    renderProbe()

    await user.click(screen.getByRole('button', { name: 'Deutsch' }))

    expect(screen.getByTestId('login-label')).toHaveTextContent('Anmelden')
    expect(document.documentElement.lang).toBe('de')
  })

  it('persists the language choice to localStorage on switch', async () => {
    const user = userEvent.setup()
    renderProbe()

    await user.click(screen.getByRole('button', { name: 'English' }))

    expect(localStorage.getItem(STORAGE_KEY)).toBe('en')
  })

  it('restores the persisted language after a remount (simulated reload)', async () => {
    const user = userEvent.setup()
    const { unmount } = renderProbe()

    await user.click(screen.getByRole('button', { name: 'Deutsch' }))
    expect(localStorage.getItem(STORAGE_KEY)).toBe('de')
    unmount()

    renderProbe()

    expect(screen.getByTestId('login-label')).toHaveTextContent('Anmelden')
    expect(document.documentElement.lang).toBe('de')
  })

  it('never crashes on a missing translation key — falls back to the raw key string', () => {
    renderProbe()

    expect(screen.getByTestId('missing-key')).toHaveTextContent('this.key.does.not.exist')
  })

  it('renders a labelled, keyboard-focusable group with aria-pressed marking the active language', () => {
    renderProbe()

    const group = screen.getByRole('group', { name: 'Dil seçin' })
    const trButton = within(group).getByRole('button', { name: 'Türkçe' })
    const enButton = within(group).getByRole('button', { name: 'English' })

    expect(trButton).toHaveAttribute('aria-pressed', 'true')
    expect(enButton).toHaveAttribute('aria-pressed', 'false')
    // Native <button>s are focusable/activatable via keyboard with no custom key handling.
    expect(trButton.tagName).toBe('BUTTON')
  })
})

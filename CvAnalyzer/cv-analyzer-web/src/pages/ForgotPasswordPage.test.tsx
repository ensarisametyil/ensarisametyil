import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ForgotPasswordPage from './ForgotPasswordPage'
import { I18nProvider } from '../context/I18nContext'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

describe('ForgotPasswordPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the backend generic message after submitting — never claims an email was sent', async () => {
    const genericMessage =
      'İsteğiniz alındı. Bu ortamda e-posta gönderim altyapısı henüz aktif değildir; şifre sıfırlama bağlantıları production ortamında e-posta ile iletilecektir.'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, { message: genericMessage })))
    const user = userEvent.setup()

    renderPage()
    await user.type(screen.getByLabelText('E-posta'), 'someone@example.com')
    await user.click(screen.getByRole('button', { name: 'Gönder' }))

    expect(await screen.findByText(genericMessage)).toBeInTheDocument()
    expect(screen.queryByText(/gönderildi/i)).not.toBeInTheDocument()
  })

  it('shows the same message regardless of whether the email is registered (frontend never distinguishes)', async () => {
    const genericMessage = 'İsteğiniz alındı.'
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, { message: genericMessage }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderPage()
    await user.type(screen.getByLabelText('E-posta'), 'unknown@example.com')
    await user.click(screen.getByRole('button', { name: 'Gönder' }))

    expect(await screen.findByText(genericMessage)).toBeInTheDocument()
    // Exactly one call, no follow-up "check if registered" call — the UI never probes further.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

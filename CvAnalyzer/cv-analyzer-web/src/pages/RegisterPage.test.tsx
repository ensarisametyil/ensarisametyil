import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { I18nProvider } from '../context/I18nContext'
import RegisterPage from './RegisterPage'

function renderRegisterPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </MemoryRouter>
    </I18nProvider>,
  )
}

describe('RegisterPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows a client-side validation error for a weak password without ever calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderRegisterPage()
    await user.type(screen.getByLabelText('E-posta'), 'user@example.com')
    await user.type(screen.getByLabelText('Parola'), 'short')
    await user.click(screen.getByRole('button', { name: 'Kayıt Ol' }))

    expect(await screen.findByText('Parola en az 8 karakter olmalıdır.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the server error for an already-registered email', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'EMAIL_ALREADY_REGISTERED', message: 'Bu e-posta adresi zaten kayıtlı.' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    const user = userEvent.setup()

    renderRegisterPage()
    await user.type(screen.getByLabelText('E-posta'), 'dup@example.com')
    await user.type(screen.getByLabelText('Parola'), 'Password123')
    await user.click(screen.getByRole('button', { name: 'Kayıt Ol' }))

    expect(await screen.findByText('Bu e-posta adresi zaten kayıtlı.')).toBeInTheDocument()
  })
})

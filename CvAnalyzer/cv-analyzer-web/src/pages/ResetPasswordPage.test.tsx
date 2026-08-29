import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ResetPasswordPage from './ResetPasswordPage'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderPage(path = '/reset-password?token=abc123') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  )
}

describe('ResetPasswordPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows an error and no form when the token is missing from the URL', () => {
    renderPage('/reset-password')

    expect(screen.getByText('Şifre sıfırlama bağlantısı eksik veya geçersiz.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Yeni Parola')).not.toBeInTheDocument()
  })

  it('rejects mismatched password confirmation without calling the backend', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderPage()
    await user.type(screen.getByLabelText('Yeni Parola'), 'NewPassword2')
    await user.type(screen.getByLabelText('Yeni Parola (Tekrar)'), 'DifferentPassword3')
    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }))

    expect(await screen.findByText('Parolalar eşleşmiyor.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits the token and new password, then shows success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, { message: 'ok' })))
    const user = userEvent.setup()

    renderPage()
    await user.type(screen.getByLabelText('Yeni Parola'), 'NewPassword2')
    await user.type(screen.getByLabelText('Yeni Parola (Tekrar)'), 'NewPassword2')
    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }))

    expect(await screen.findByText('Şifreniz Güncellendi')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Giriş yap' })).toHaveAttribute('href', '/login')
  })

  it('shows the backend error for an invalid/expired token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse(400, { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Bağlantının süresi dolmuş veya geçersiz.' })),
    )
    const user = userEvent.setup()

    renderPage()
    await user.type(screen.getByLabelText('Yeni Parola'), 'NewPassword2')
    await user.type(screen.getByLabelText('Yeni Parola (Tekrar)'), 'NewPassword2')
    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }))

    expect(await screen.findByText('Bağlantının süresi dolmuş veya geçersiz.')).toBeInTheDocument()
  })
})

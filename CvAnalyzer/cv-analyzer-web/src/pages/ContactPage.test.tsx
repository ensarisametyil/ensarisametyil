import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ContactPage from './ContactPage'
import { AuthProvider } from '../context/AuthContext'
import { BillingProvider } from '../context/BillingContext'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <BillingProvider>
          <ContactPage />
        </BillingProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Ad Soyad'), 'Ada Lovelace')
  await user.type(screen.getByLabelText('E-posta'), 'ada@example.com')
  await user.type(screen.getByLabelText('Konu'), 'Soru')
  await user.type(screen.getByLabelText('Mesaj'), 'Merhaba, bir sorum var.')
}

describe('ContactPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a success message only after the backend genuinely confirms the message was received', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, { message: 'Mesajınız alındı.' }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderPage()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Gönder' }))

    expect(await screen.findByText('Mesajınız alındı. Teşekkür ederiz.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never shows a success message when the submission fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(400, { code: 'INVALID_REQUEST', message: 'Geçerli bir e-posta adresi giriniz.' })))
    const user = userEvent.setup()

    renderPage()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: 'Gönder' }))

    expect(await screen.findByText('Geçerli bir e-posta adresi giriniz.')).toBeInTheDocument()
    expect(screen.queryByText('Mesajınız alındı. Teşekkür ederiz.')).not.toBeInTheDocument()
  })
})

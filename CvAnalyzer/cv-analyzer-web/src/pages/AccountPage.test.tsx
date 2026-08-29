import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AccountPage from './AccountPage'
import { AuthProvider } from '../context/AuthContext'
import { BillingProvider } from '../context/BillingContext'
import { setToken } from '../api/tokenStorage'
import type { User } from '../types/auth'
import type { Usage } from '../types/billing'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const ME_RESPONSE: User = { id: 'user-1', email: 'user@example.com', createdAt: '2026-01-01T00:00:00Z', emailVerifiedAt: null }

const FREE_USAGE: Usage = {
  plan: 'FREE',
  used: 1,
  limit: 2,
  remaining: 1,
  periodStart: '2026-08-01T00:00:00Z',
  periodEnd: '2026-09-01T00:00:00Z',
}

const FREE_SUBSCRIPTION = { plan: 'FREE', status: null, provider: null, startDate: null, endDate: null, canCancel: false }
const PREMIUM_SUBSCRIPTION = {
  plan: 'PREMIUM',
  status: 'ACTIVE',
  provider: 'Iyzico',
  startDate: '2026-08-01T00:00:00Z',
  endDate: null,
  canCancel: true,
}

function routeFetch(routes: Record<string, (init?: RequestInit) => Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const match = Object.entries(routes).find(([pattern]) => url.includes(pattern))
    if (!match) {
      throw new Error(`No mocked route for ${url}`)
    }
    return Promise.resolve(match[1](init))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderAccountPage() {
  setToken('existing-token')
  return render(
    <MemoryRouter>
      <AuthProvider>
        <BillingProvider>
          <AccountPage />
        </BillingProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('AccountPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows profile info, plan/usage, and payment history for a Free user', async () => {
    routeFetch({
      '/api/auth/me': () => jsonResponse(200, ME_RESPONSE),
      '/api/billing/usage': () => jsonResponse(200, FREE_USAGE),
      '/api/billing/subscription': () => jsonResponse(200, FREE_SUBSCRIPTION),
      '/api/billing/payments': () => jsonResponse(200, []),
    })

    renderAccountPage()

    expect(await screen.findByText('user@example.com')).toBeInTheDocument()
    expect(await screen.findByText('1 / 2 analiz kullanıldı')).toBeInTheDocument()
    expect(await screen.findByText('Henüz bir ödeme işleminiz yok.')).toBeInTheDocument()
    expect(screen.queryByText('Aboneliği İptal Et')).not.toBeInTheDocument()
  })

  it('shows subscription cancel action for an active Premium subscription and cancels on confirm', async () => {
    const fetchMock = routeFetch({
      '/api/auth/me': () => jsonResponse(200, ME_RESPONSE),
      '/api/billing/usage': () => jsonResponse(200, { ...FREE_USAGE, plan: 'PREMIUM', limit: null, remaining: null }),
      '/api/billing/subscription': () => jsonResponse(200, PREMIUM_SUBSCRIPTION),
      '/api/billing/payments': () => jsonResponse(200, [{ date: '2026-08-01T00:00:00Z', status: 'Succeeded', provider: 'Iyzico', subscriptionReference: 'sub-1' }]),
      '/api/billing/subscription/cancel': () => jsonResponse(200, { message: 'ok' }),
    })

    renderAccountPage()
    const user = userEvent.setup()

    expect(await screen.findByRole('button', { name: 'Aboneliği İptal Et' })).toBeInTheDocument()
    expect(screen.getAllByText('Iyzico').length).toBeGreaterThanOrEqual(2) // subscription detail + payment history row

    await user.click(screen.getByRole('button', { name: 'Aboneliği İptal Et' }))
    await user.click(screen.getByRole('button', { name: 'Evet, İptal Et' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => (typeof input === 'string' ? input : input.toString()).includes('/api/billing/subscription/cancel'))).toBe(true)
    })
  })

  it('changes password successfully and shows a confirmation message', async () => {
    routeFetch({
      '/api/auth/me': () => jsonResponse(200, ME_RESPONSE),
      '/api/billing/usage': () => jsonResponse(200, FREE_USAGE),
      '/api/billing/subscription': () => jsonResponse(200, FREE_SUBSCRIPTION),
      '/api/billing/payments': () => jsonResponse(200, []),
      '/api/auth/change-password': () => jsonResponse(200, { message: 'Parolanız güncellendi.' }),
    })

    renderAccountPage()
    const user = userEvent.setup()
    await screen.findByText('user@example.com')

    await user.type(screen.getByLabelText('Mevcut Şifre'), 'OldPassword1')
    await user.type(screen.getByLabelText('Yeni Şifre'), 'NewPassword2')
    await user.type(screen.getByLabelText('Yeni Şifre (Tekrar)'), 'NewPassword2')
    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }))

    expect(await screen.findByText('Parolanız güncellendi.')).toBeInTheDocument()
  })

  it('shows the backend error when the current password is wrong', async () => {
    routeFetch({
      '/api/auth/me': () => jsonResponse(200, ME_RESPONSE),
      '/api/billing/usage': () => jsonResponse(200, FREE_USAGE),
      '/api/billing/subscription': () => jsonResponse(200, FREE_SUBSCRIPTION),
      '/api/billing/payments': () => jsonResponse(200, []),
      '/api/auth/change-password': () => jsonResponse(400, { code: 'INCORRECT_CURRENT_PASSWORD', message: 'Mevcut parola hatalı.' }),
    })

    renderAccountPage()
    const user = userEvent.setup()
    await screen.findByText('user@example.com')

    await user.type(screen.getByLabelText('Mevcut Şifre'), 'WrongPassword9')
    await user.type(screen.getByLabelText('Yeni Şifre'), 'NewPassword2')
    await user.type(screen.getByLabelText('Yeni Şifre (Tekrar)'), 'NewPassword2')
    await user.click(screen.getByRole('button', { name: 'Şifreyi Güncelle' }))

    expect(await screen.findByText('Mevcut parola hatalı.')).toBeInTheDocument()
  })

  it('deactivates the account and requires a password confirmation first', async () => {
    const fetchMock = routeFetch({
      '/api/auth/me': () => jsonResponse(200, ME_RESPONSE),
      '/api/billing/usage': () => jsonResponse(200, FREE_USAGE),
      '/api/billing/subscription': () => jsonResponse(200, FREE_SUBSCRIPTION),
      '/api/billing/payments': () => jsonResponse(200, []),
      '/api/auth/deactivate': () => jsonResponse(200, { message: 'Hesabınız kapatıldı.' }),
    })

    renderAccountPage()
    const user = userEvent.setup()
    await screen.findByText('user@example.com')

    // The deactivate action is not immediately submittable — it must be expanded first.
    expect(screen.queryByLabelText('Şifrenizi onaylayın')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hesabımı Kapat' }))
    await user.type(screen.getByLabelText('Şifrenizi onaylayın'), 'Password123')
    await user.click(screen.getByRole('button', { name: 'Onayla ve Hesabı Kapat' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => (typeof input === 'string' ? input : input.toString()).includes('/api/auth/deactivate'))).toBe(true)
    })
  })
})

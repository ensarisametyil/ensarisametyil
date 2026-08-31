import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PremiumResultPage from './PremiumResultPage'
import { I18nProvider } from '../context/I18nContext'
import { AuthProvider } from '../context/AuthContext'
import { BillingProvider } from '../context/BillingContext'
import { setToken } from '../api/tokenStorage'
import type { User } from '../types/auth'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const ME_RESPONSE: User = { id: 'user-1', email: 'user@example.com', createdAt: '2026-01-01T00:00:00Z', emailVerifiedAt: null, role: 'User' }

function renderResultPage(path: string) {
  setToken('existing-token')
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/api/auth/me')) return Promise.resolve(jsonResponse(200, ME_RESPONSE))
    if (url.includes('/api/billing/usage')) {
      return Promise.resolve(jsonResponse(200, { plan: 'PREMIUM', used: 0, limit: null, remaining: null, periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-09-01T00:00:00Z' }))
    }
    throw new Error(`unexpected fetch to ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)

  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <BillingProvider>
            <PremiumResultPage />
          </BillingProvider>
        </AuthProvider>
      </MemoryRouter>
    </I18nProvider>,
  )

  return fetchMock
}

describe('PremiumResultPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows a success message for ?status=success and refreshes the billing usage', async () => {
    const fetchMock = renderResultPage('/premium/result?status=success')

    expect(await screen.findByText("Premium'a Geçtiniz!")).toBeInTheDocument()
    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.some(([input]) => (typeof input === 'string' ? input : input.toString()).includes('/api/billing/usage'))).toBe(true)
    })
  })

  it('shows a failure message for ?status=failed', async () => {
    renderResultPage('/premium/result?status=failed')

    expect(await screen.findByText('Ödeme Tamamlanamadı')).toBeInTheDocument()
  })

  it('treats a missing status param as a failure (never assumes success)', async () => {
    renderResultPage('/premium/result')

    expect(await screen.findByText('Ödeme Tamamlanamadı')).toBeInTheDocument()
  })
})

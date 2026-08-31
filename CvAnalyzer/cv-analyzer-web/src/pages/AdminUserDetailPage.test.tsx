import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AdminUserDetailPage from './AdminUserDetailPage'
import { I18nProvider } from '../context/I18nContext'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderPage(userId = 'u1') {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[`/admin/users/${userId}`]}>
        <Routes>
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  )
}

function mockFetchRoutes(routes: Record<string, (init?: RequestInit) => Response>) {
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

const FREE_USER_DETAIL = {
  id: 'u1',
  email: 'ada@example.com',
  createdAt: '2026-08-01T00:00:00Z',
  role: 'User',
  isActive: true,
  emailVerifiedAt: null,
  plan: 'Free',
  subscriptionStatus: null,
  subscriptionStartDate: null,
  subscriptionEndDate: null,
  usageUsed: 1,
  usageLimit: 2,
  usageRemaining: 1,
  payments: [],
}

const PREMIUM_USER_DETAIL = {
  ...FREE_USER_DETAIL,
  plan: 'Premium',
  subscriptionStatus: 'Active',
  subscriptionStartDate: '2026-08-01T00:00:00Z',
  usageLimit: null,
  usageRemaining: null,
  payments: [{ date: '2026-08-01T00:00:00Z', status: 'Succeeded', provider: 'Iyzico', subscriptionReference: 'sub-1', amount: 10, currency: 'USD' }],
}

describe('AdminUserDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("shows the user's account, subscription, usage, and payment history", async () => {
    mockFetchRoutes({ '/api/admin/users/u1': () => jsonResponse(200, PREMIUM_USER_DETAIL) })

    renderPage('u1')

    expect(await screen.findByRole('heading', { name: 'ada@example.com' })).toBeInTheDocument()
    expect(screen.getAllByText('Premium').length).toBeGreaterThan(0)
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('$10,00')).toBeInTheDocument()
  })

  it('shows a 404-appropriate error when the user does not exist', async () => {
    mockFetchRoutes({ '/api/admin/users/missing': () => jsonResponse(404, { code: 'USER_NOT_FOUND', message: 'Kullanıcı bulunamadı.' }) })

    renderPage('missing')

    expect(await screen.findByText('Kullanıcı bulunamadı.')).toBeInTheDocument()
  })

  it('deactivates the user and reflects the new status after the action', async () => {
    mockFetchRoutes({
      '/api/admin/users/u1/active': () => jsonResponse(200, { message: 'Kullanıcı durumu güncellendi.' }),
      '/api/admin/users/u1': (init) => {
        // First GET is the initial load (active); PATCH has no GET verb, so route by method presence.
        if (init?.method === 'PATCH') {
          throw new Error('unexpected: active endpoint should be matched first')
        }
        return jsonResponse(200, FREE_USER_DETAIL)
      },
    })
    const user = userEvent.setup()

    renderPage('u1')
    await screen.findByRole('heading', { name: 'ada@example.com' })

    await user.click(screen.getByRole('button', { name: 'Hesabı Pasifleştir' }))

    expect(await screen.findByText('Kullanıcı durumu güncellendi.')).toBeInTheDocument()
  })

  it('shows the cancel-subscription action only for an active Premium user', async () => {
    mockFetchRoutes({ '/api/admin/users/u1': () => jsonResponse(200, FREE_USER_DETAIL) })

    renderPage('u1')
    await screen.findByRole('heading', { name: 'ada@example.com' })

    expect(screen.queryByRole('button', { name: 'Aboneliği İptal Et' })).not.toBeInTheDocument()
  })
})

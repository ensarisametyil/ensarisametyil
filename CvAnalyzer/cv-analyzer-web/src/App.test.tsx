import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { setToken } from './api/tokenStorage'
import type { AuthResponse, User } from './types/auth'
import type { Usage } from './types/billing'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const AUTH_RESPONSE: AuthResponse = {
  accessToken: 'test-access-token',
  tokenType: 'Bearer',
  expiresInSeconds: 3600,
  user: { id: 'user-1', email: 'user@example.com', createdAt: '2026-01-01T00:00:00Z', emailVerifiedAt: null, role: 'User' },
}

const ADMIN_AUTH_RESPONSE: AuthResponse = {
  accessToken: 'test-admin-access-token',
  tokenType: 'Bearer',
  expiresInSeconds: 3600,
  user: { id: 'admin-1', email: 'admin@example.com', createdAt: '2026-01-01T00:00:00Z', emailVerifiedAt: null, role: 'Admin' },
}

const EMPTY_DASHBOARD_STATS = {
  totalUsers: 1,
  activeUsers: 1,
  newUsersLast7Days: 0,
  freeUsers: 1,
  premiumUsers: 0,
  activeSubscriptions: 0,
  succeededPayments: 0,
  failedPayments: 0,
  pendingPayments: 0,
  totalRevenueUsd: 0,
  totalAnalyses: 0,
  analysesLast30Days: 0,
  recentPayments: [],
}

const DEFAULT_USAGE: Usage = {
  plan: 'FREE',
  used: 0,
  limit: 2,
  remaining: 2,
  periodStart: '2026-08-01T00:00:00Z',
  periodEnd: '2026-09-01T00:00:00Z',
}

/**
 * BillingProvider fetches GET /api/billing/usage as soon as a login/register succeeds, which
 * means the exact ordering of fetch calls after login is no longer predictable relative to
 * whatever the test does next (e.g. clicking into History). Route by URL instead of by call
 * index so these tests don't depend on that ordering.
 */
function mockFetchRoutes(routes: Record<string, () => Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const match = Object.entries(routes).find(([pattern]) => url.includes(pattern))
    if (!match) {
      throw new Error(`No mocked route for ${url}`)
    }
    return Promise.resolve(match[1]())
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function findCall(fetchMock: ReturnType<typeof mockFetchRoutes>, urlPattern: string) {
  const call = fetchMock.mock.calls.find(([input]) => (typeof input === 'string' ? input : input.toString()).includes(urlPattern))
  if (!call) {
    throw new Error(`fetch was never called for ${urlPattern}`)
  }
  return call
}

function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )
}

async function loginAs(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('E-posta'), 'user@example.com')
  await user.type(screen.getByLabelText('Parola'), 'Password123')
  await user.click(screen.getByRole('button', { name: 'Giriş Yap' }))
  await screen.findByText('user@example.com')
}

async function loginAsAdmin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('E-posta'), 'admin@example.com')
  await user.type(screen.getByLabelText('Parola'), 'Password123')
  await user.click(screen.getByRole('button', { name: 'Giriş Yap' }))
  await screen.findByText('admin@example.com')
}

describe('Authentication flow', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows the public landing page at / for an unauthenticated visitor (no forced redirect)', async () => {
    mockFetchRoutes({})

    renderApp('/')

    expect(await screen.findByRole('heading', { name: /CV'nizi Yapay Zekâ ile/ })).toBeInTheDocument()
  })

  it('redirects an unauthenticated visitor away from a protected route (/app) to /login', async () => {
    mockFetchRoutes({})

    renderApp('/app')

    expect(await screen.findByRole('heading', { name: 'Giriş Yap' })).toBeInTheDocument()
  })

  it('logs in successfully, stores the session, and shows the authenticated app shell', async () => {
    mockFetchRoutes({
      '/api/auth/login': () => jsonResponse(200, AUTH_RESPONSE),
      '/api/billing/usage': () => jsonResponse(200, DEFAULT_USAGE),
    })
    const user = userEvent.setup()

    renderApp('/login')
    await loginAs(user)

    expect(screen.getByRole('heading', { name: 'CVora AI' })).toBeInTheDocument()
    expect(localStorage.getItem('cvAnalyzer.accessToken')).toBe('test-access-token')
  })

  it('shows an error and stays on the login page for wrong credentials', async () => {
    mockFetchRoutes({
      '/api/auth/login': () => jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: 'E-posta veya parola hatalı.' }),
    })
    const user = userEvent.setup()

    renderApp('/login')
    await user.type(screen.getByLabelText('E-posta'), 'user@example.com')
    await user.type(screen.getByLabelText('Parola'), 'WrongPassword1')
    await user.click(screen.getByRole('button', { name: 'Giriş Yap' }))

    expect(await screen.findByText('E-posta veya parola hatalı.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Giriş Yap' })).toBeInTheDocument()
    expect(localStorage.getItem('cvAnalyzer.accessToken')).toBeNull()
  })

  it('logs out, clears the stored session, and redirects to /login', async () => {
    mockFetchRoutes({
      '/api/auth/login': () => jsonResponse(200, AUTH_RESPONSE),
      '/api/billing/usage': () => jsonResponse(200, DEFAULT_USAGE),
    })
    const user = userEvent.setup()

    renderApp('/login')
    await loginAs(user)

    await user.click(screen.getByRole('button', { name: 'Çıkış Yap' }))

    expect(await screen.findByRole('heading', { name: 'Giriş Yap' })).toBeInTheDocument()
    expect(localStorage.getItem('cvAnalyzer.accessToken')).toBeNull()
  })

  it('sends the Authorization header on a protected API call and renders the returned history', async () => {
    const fetchMock = mockFetchRoutes({
      '/api/auth/login': () => jsonResponse(200, AUTH_RESPONSE),
      '/api/billing/usage': () => jsonResponse(200, DEFAULT_USAGE),
      '/api/analyses': () =>
        jsonResponse(200, {
          items: [
            {
              id: 'analysis-1',
              cvId: 'cv-1',
              cvFileName: 'cv.pdf',
              overallScore: 82,
              summary: 'Strong technical CV.',
              createdAt: '2026-01-01T00:00:00Z',
            },
          ],
          page: 1,
          pageSize: 20,
          totalCount: 1,
        }),
    })
    const user = userEvent.setup()

    renderApp('/login')
    await loginAs(user)
    await user.click(screen.getByRole('link', { name: 'Analiz Geçmişim', exact: true }))

    expect(await screen.findByText('cv.pdf')).toBeInTheDocument()

    const [, historyInit] = findCall(fetchMock, '/api/analyses')
    const headers = new Headers(historyInit?.headers)
    expect(headers.get('Authorization')).toBe('Bearer test-access-token')
  })

  it('logs the user out automatically when a protected call comes back 401 (expired/invalid token)', async () => {
    mockFetchRoutes({
      '/api/auth/login': () => jsonResponse(200, AUTH_RESPONSE),
      '/api/billing/usage': () => jsonResponse(200, DEFAULT_USAGE),
      '/api/analyses': () => jsonResponse(401, { code: 'UNAUTHORIZED', message: 'Yetkisiz.' }),
    })
    const user = userEvent.setup()

    renderApp('/login')
    await loginAs(user)
    await user.click(screen.getByRole('link', { name: 'Analiz Geçmişim', exact: true }))

    expect(await screen.findByRole('heading', { name: 'Giriş Yap' })).toBeInTheDocument()
    expect(localStorage.getItem('cvAnalyzer.accessToken')).toBeNull()
  })

  it('clears the plan/usage badge after logout', async () => {
    mockFetchRoutes({
      '/api/auth/login': () => jsonResponse(200, AUTH_RESPONSE),
      '/api/billing/usage': () => jsonResponse(200, DEFAULT_USAGE),
    })
    const user = userEvent.setup()

    renderApp('/login')
    await loginAs(user)
    expect(await screen.findByText('FREE PLAN')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Çıkış Yap' }))

    await screen.findByRole('heading', { name: 'Giriş Yap' })
    expect(screen.queryByText('FREE PLAN')).not.toBeInTheDocument()
  })
})

describe('Admin panel access control', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('never shows the Admin nav link to a normal user', async () => {
    mockFetchRoutes({
      '/api/auth/login': () => jsonResponse(200, AUTH_RESPONSE),
      '/api/billing/usage': () => jsonResponse(200, DEFAULT_USAGE),
    })
    const user = userEvent.setup()

    renderApp('/login')
    await loginAs(user)

    expect(screen.queryByRole('link', { name: 'Admin Paneli' })).not.toBeInTheDocument()
  })

  it('redirects an authenticated normal user away from /admin to /app, never rendering the admin dashboard', async () => {
    const normalUser: User = { id: 'user-1', email: 'user@example.com', createdAt: '2026-01-01T00:00:00Z', emailVerifiedAt: null, role: 'User' }
    setToken('existing-token')
    mockFetchRoutes({
      '/api/auth/me': () => jsonResponse(200, normalUser),
      '/api/billing/usage': () => jsonResponse(200, DEFAULT_USAGE),
    })

    renderApp('/admin')

    expect(await screen.findByRole('heading', { name: 'CVora AI' })).toBeInTheDocument()
    expect(screen.queryByText('Yönetim Paneli')).not.toBeInTheDocument()
  })

  it('shows the Admin nav link for an admin user and lets them reach the dashboard', async () => {
    mockFetchRoutes({
      '/api/auth/login': () => jsonResponse(200, ADMIN_AUTH_RESPONSE),
      '/api/billing/usage': () => jsonResponse(200, DEFAULT_USAGE),
      '/api/admin/dashboard': () => jsonResponse(200, EMPTY_DASHBOARD_STATS),
    })
    const user = userEvent.setup()

    renderApp('/login')
    await loginAsAdmin(user)

    const adminLink = await screen.findByRole('link', { name: 'Admin Paneli' })
    await user.click(adminLink)

    expect(await screen.findByRole('heading', { name: 'Yönetim Paneli' })).toBeInTheDocument()
  })
})

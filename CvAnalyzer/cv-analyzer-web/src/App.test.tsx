import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import type { AuthResponse } from './types/auth'

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
  user: { id: 'user-1', email: 'user@example.com', createdAt: '2026-01-01T00:00:00Z' },
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

describe('Authentication flow', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('redirects an unauthenticated visitor away from a protected route to /login', async () => {
    vi.stubGlobal('fetch', vi.fn())

    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Giriş Yap' })).toBeInTheDocument()
  })

  it('logs in successfully, stores the session, and shows the authenticated app shell', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, AUTH_RESPONSE)))
    const user = userEvent.setup()

    renderApp('/login')
    await loginAs(user)

    expect(screen.getByRole('heading', { name: 'CV Analyzer' })).toBeInTheDocument()
    expect(localStorage.getItem('cvAnalyzer.accessToken')).toBe('test-access-token')
  })

  it('shows an error and stays on the login page for wrong credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse(401, { code: 'INVALID_CREDENTIALS', message: 'E-posta veya parola hatalı.' })),
    )
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(200, AUTH_RESPONSE)))
    const user = userEvent.setup()

    renderApp('/login')
    await loginAs(user)

    await user.click(screen.getByRole('button', { name: 'Çıkış Yap' }))

    expect(await screen.findByRole('heading', { name: 'Giriş Yap' })).toBeInTheDocument()
    expect(localStorage.getItem('cvAnalyzer.accessToken')).toBeNull()
  })

  it('sends the Authorization header on a protected API call and renders the returned history', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, AUTH_RESPONSE)) // login
      .mockResolvedValueOnce(
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
      )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderApp('/login')
    await loginAs(user)
    await user.click(screen.getByRole('link', { name: 'Analiz Geçmişim' }))

    expect(await screen.findByText('cv.pdf')).toBeInTheDocument()

    const [, historyInit] = fetchMock.mock.calls[1]
    const headers = new Headers(historyInit.headers)
    expect(headers.get('Authorization')).toBe('Bearer test-access-token')
  })

  it('logs the user out automatically when a protected call comes back 401 (expired/invalid token)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, AUTH_RESPONSE)) // login
      .mockResolvedValueOnce(jsonResponse(401, { code: 'UNAUTHORIZED', message: 'Yetkisiz.' })) // history call
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderApp('/login')
    await loginAs(user)
    await user.click(screen.getByRole('link', { name: 'Analiz Geçmişim' }))

    expect(await screen.findByRole('heading', { name: 'Giriş Yap' })).toBeInTheDocument()
    expect(localStorage.getItem('cvAnalyzer.accessToken')).toBeNull()
  })
})

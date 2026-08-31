import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminUsersPage from './AdminUsersPage'
import { I18nProvider } from '../context/I18nContext'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

function mockFetchRoutes(routes: Record<string, (url: string) => Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const match = Object.entries(routes).find(([pattern]) => url.includes(pattern))
    if (!match) {
      throw new Error(`No mocked route for ${url}`)
    }
    return Promise.resolve(match[1](url))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const USERS_PAGE_1 = {
  items: [
    { id: 'u1', email: 'ada@example.com', role: 'User', isActive: true, createdAt: '2026-08-01T00:00:00Z', plan: 'Free' },
    { id: 'u2', email: 'grace@example.com', role: 'Admin', isActive: true, createdAt: '2026-08-02T00:00:00Z', plan: 'Premium' },
  ],
  page: 1,
  pageSize: 20,
  totalCount: 2,
}

describe('AdminUsersPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists users returned by the backend', async () => {
    mockFetchRoutes({ '/api/admin/users': () => jsonResponse(200, USERS_PAGE_1) })

    renderPage()

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('grace@example.com')).toBeInTheDocument()
    expect(screen.getByText('Premium')).toBeInTheDocument()
  })

  it('sends the search term to the backend, never filtering client-side', async () => {
    const fetchMock = mockFetchRoutes({
      '/api/admin/users': (url) =>
        url.includes('search=ada') ? jsonResponse(200, { items: [USERS_PAGE_1.items[0]], page: 1, pageSize: 20, totalCount: 1 }) : jsonResponse(200, USERS_PAGE_1),
    })
    const user = userEvent.setup()

    renderPage()
    await screen.findByText('ada@example.com')

    await user.type(screen.getByRole('searchbox'), 'ada')
    await user.click(screen.getByRole('button', { name: 'Ara' }))

    await screen.findByText('ada@example.com')
    expect(screen.queryByText('grace@example.com')).not.toBeInTheDocument()

    const searchCall = fetchMock.mock.calls.find(([input]) => (typeof input === 'string' ? input : input.toString()).includes('search=ada'))
    expect(searchCall).toBeDefined()
  })

  it('shows an empty state when there are no users matching the query', async () => {
    mockFetchRoutes({ '/api/admin/users': () => jsonResponse(200, { items: [], page: 1, pageSize: 20, totalCount: 0 }) })

    renderPage()

    expect(await screen.findByText('Kullanıcı bulunamadı.')).toBeInTheDocument()
  })

  it('shows pagination controls and requests the next page on click', async () => {
    const manyItems = Array.from({ length: 25 }, (_, i) => ({
      id: `u${i}`,
      email: `user${i}@example.com`,
      role: 'User',
      isActive: true,
      createdAt: '2026-08-01T00:00:00Z',
      plan: 'Free' as const,
    }))
    const fetchMock = mockFetchRoutes({
      '/api/admin/users': (url) =>
        url.includes('page=2')
          ? jsonResponse(200, { items: manyItems.slice(20, 25), page: 2, pageSize: 20, totalCount: 25 })
          : jsonResponse(200, { items: manyItems.slice(0, 20), page: 1, pageSize: 20, totalCount: 25 }),
    })
    const user = userEvent.setup()

    renderPage()
    await screen.findByText('user0@example.com')

    await user.click(screen.getByRole('button', { name: 'Sonraki' }))

    await screen.findByText('user20@example.com')
    const page2Call = fetchMock.mock.calls.find(([input]) => (typeof input === 'string' ? input : input.toString()).includes('page=2'))
    expect(page2Call).toBeDefined()
  })
})

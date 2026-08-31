import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminPaymentsPage from './AdminPaymentsPage'
import { I18nProvider } from '../context/I18nContext'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <AdminPaymentsPage />
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

const PAYMENTS_PAGE = {
  items: [
    {
      id: 'p1',
      userId: 'u1',
      userEmail: 'ada@example.com',
      status: 'Succeeded',
      amount: 10,
      currency: 'USD',
      subscriptionReference: 'sub-1',
      createdAt: '2026-08-01T00:00:00Z',
      processedAt: '2026-08-01T00:05:00Z',
    },
  ],
  page: 1,
  pageSize: 20,
  totalCount: 1,
}

describe('AdminPaymentsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists payments across all users, with amount and status', async () => {
    mockFetchRoutes({ '/api/admin/payments': () => jsonResponse(200, PAYMENTS_PAGE) })

    renderPage()

    expect(await screen.findByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('$10,00')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Başarılı' })).toBeInTheDocument()
  })

  it('sends the status filter to the backend', async () => {
    const fetchMock = mockFetchRoutes({
      '/api/admin/payments': (url) => (url.includes('status=Failed') ? jsonResponse(200, { items: [], page: 1, pageSize: 20, totalCount: 0 }) : jsonResponse(200, PAYMENTS_PAGE)),
    })
    const user = userEvent.setup()

    renderPage()
    await screen.findByText('ada@example.com')

    await user.selectOptions(screen.getByLabelText('Duruma göre filtrele'), 'Failed')

    await screen.findByText('Ödeme kaydı bulunamadı.')
    const filterCall = fetchMock.mock.calls.find(([input]) => (typeof input === 'string' ? input : input.toString()).includes('status=Failed'))
    expect(filterCall).toBeDefined()
  })

  it('shows an empty state when there are no matching payments', async () => {
    mockFetchRoutes({ '/api/admin/payments': () => jsonResponse(200, { items: [], page: 1, pageSize: 20, totalCount: 0 }) })

    renderPage()

    expect(await screen.findByText('Ödeme kaydı bulunamadı.')).toBeInTheDocument()
  })
})

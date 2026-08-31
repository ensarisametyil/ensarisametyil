import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminDashboardPage from './AdminDashboardPage'
import { I18nProvider } from '../context/I18nContext'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

const STATS = {
  totalUsers: 42,
  activeUsers: 40,
  newUsersLast7Days: 3,
  freeUsers: 35,
  premiumUsers: 7,
  activeSubscriptions: 7,
  succeededPayments: 8,
  failedPayments: 1,
  pendingPayments: 0,
  totalRevenueUsd: 70,
  totalAnalyses: 120,
  analysesLast30Days: 30,
  recentPayments: [
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
}

describe('AdminDashboardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders backend-computed user/subscription/payment/revenue/analysis statistics', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(200, STATS))))

    renderPage()

    expect(await screen.findByText('42')).toBeInTheDocument()
    expect(screen.getByText('$70,00')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
  })

  it('lists recent payments with a link to the paying user', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(200, STATS))))

    renderPage()

    const link = await screen.findByRole('link', { name: 'ada@example.com' })
    expect(link).toHaveAttribute('href', '/admin/users/u1')
  })

  it('shows an error banner if the stats fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(500, { code: 'INTERNAL_SERVER_ERROR', message: 'Beklenmeyen bir sunucu hatası oluştu.' }))))

    renderPage()

    expect(await screen.findByText('Beklenmeyen bir sunucu hatası oluştu.')).toBeInTheDocument()
  })
})

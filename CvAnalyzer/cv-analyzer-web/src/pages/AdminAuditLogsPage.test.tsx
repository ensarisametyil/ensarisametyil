import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AdminAuditLogsPage from './AdminAuditLogsPage'
import { I18nProvider } from '../context/I18nContext'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function renderPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <AdminAuditLogsPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

describe('AdminAuditLogsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists recorded admin actions with admin, target, and result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(200, {
            items: [
              {
                id: 'log-1',
                adminEmail: 'admin@example.com',
                action: 'UserDeactivated',
                targetEmail: 'ada@example.com',
                details: 'IsActive -> False',
                success: true,
                createdAt: '2026-08-01T00:00:00Z',
              },
            ],
            page: 1,
            pageSize: 20,
            totalCount: 1,
          }),
        ),
      ),
    )

    renderPage()

    expect(await screen.findByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('UserDeactivated')).toBeInTheDocument()
    expect(screen.getByText('Başarılı')).toBeInTheDocument()
  })

  it('never renders a secret/password-shaped value from the Details column', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonResponse(200, {
            items: [
              {
                id: 'log-1',
                adminEmail: 'admin@example.com',
                action: 'SubscriptionCancelled',
                targetEmail: 'ada@example.com',
                details: 'Premium subscription cancelled',
                success: true,
                createdAt: '2026-08-01T00:00:00Z',
              },
            ],
            page: 1,
            pageSize: 20,
            totalCount: 1,
          }),
        ),
      ),
    )

    renderPage()

    expect(await screen.findByText('Premium subscription cancelled')).toBeInTheDocument()
    expect(screen.queryByText(/SecretKey/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument()
  })

  it('shows an empty state when no actions have been recorded', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse(200, { items: [], page: 1, pageSize: 20, totalCount: 0 }))))

    renderPage()

    expect(await screen.findByText('Henüz bir işlem kaydı yok.')).toBeInTheDocument()
  })
})

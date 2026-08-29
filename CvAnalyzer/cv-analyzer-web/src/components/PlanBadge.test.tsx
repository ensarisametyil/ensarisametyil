import { afterEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { BillingProvider } from '../context/BillingContext'
import { setToken } from '../api/tokenStorage'
import PlanBadge from './PlanBadge'
import type { User } from '../types/auth'
import type { Usage } from '../types/billing'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const ME_RESPONSE: User = { id: 'user-1', email: 'user@example.com', createdAt: '2026-01-01T00:00:00Z' }

function renderWithSession(usage: Usage) {
  setToken('existing-token')
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/auth/me')) return Promise.resolve(jsonResponse(200, ME_RESPONSE))
      if (url.includes('/api/billing/usage')) return Promise.resolve(jsonResponse(200, usage))
      throw new Error(`unexpected fetch to ${url}`)
    }),
  )

  return render(
    <MemoryRouter>
      <AuthProvider>
        <BillingProvider>
          <PlanBadge />
        </BillingProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('PlanBadge', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows FREE PLAN and the correct usage counter for a free user', async () => {
    renderWithSession({ plan: 'FREE', used: 1, limit: 2, remaining: 1, periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-09-01T00:00:00Z' })

    expect(await screen.findByText('FREE PLAN')).toBeInTheDocument()
    expect(screen.getByText('1 / 2 analiz kullanıldı')).toBeInTheDocument()
  })

  it('shows PREMIUM with no usage counter or CTA for a premium user', async () => {
    renderWithSession({ plan: 'PREMIUM', used: 15, limit: null, remaining: null, periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-09-01T00:00:00Z' })

    expect(await screen.findByText('PREMIUM')).toBeInTheDocument()
    expect(screen.queryByText(/analiz kullanıldı/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: "Premium'a Geç" })).not.toBeInTheDocument()
  })

  it('shows a Premium CTA for free users that links to the real checkout page (never grants Premium itself)', async () => {
    renderWithSession({ plan: 'FREE', used: 0, limit: 2, remaining: 2, periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-09-01T00:00:00Z' })

    const ctaLink = await screen.findByRole('link', { name: "Premium'a Geç" })
    expect(ctaLink).toHaveAttribute('href', '/premium/checkout')
  })
})

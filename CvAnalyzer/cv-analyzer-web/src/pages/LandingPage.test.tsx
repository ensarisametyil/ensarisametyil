import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LandingPage from './LandingPage'
import { I18nProvider } from '../context/I18nContext'
import { AuthProvider } from '../context/AuthContext'
import { BillingProvider } from '../context/BillingContext'
import { setToken } from '../api/tokenStorage'
import type { User } from '../types/auth'

function renderLanding() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <AuthProvider>
          <BillingProvider>
            <LandingPage />
          </BillingProvider>
        </AuthProvider>
      </MemoryRouter>
    </I18nProvider>,
  )
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const ME_RESPONSE: User = { id: 'user-1', email: 'user@example.com', createdAt: '2026-01-01T00:00:00Z', emailVerifiedAt: null }

/** Simulates an already-authenticated visit by pre-seeding a token and mocking /me + /usage. */
function renderLandingAsAuthenticated(plan: 'FREE' | 'PREMIUM') {
  setToken('existing-token')
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.includes('/api/auth/me')) return Promise.resolve(jsonResponse(200, ME_RESPONSE))
      if (url.includes('/api/billing/usage')) {
        return Promise.resolve(
          jsonResponse(200, { plan, used: 0, limit: plan === 'FREE' ? 2 : null, remaining: plan === 'FREE' ? 2 : null, periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-09-01T00:00:00Z' }),
        )
      }
      throw new Error(`unexpected fetch to ${url}`)
    }),
  )

  return renderLanding()
}

describe('LandingPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('shows the hero, a register CTA, plan comparison, and FAQ for an unauthenticated visitor', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no token stored — no fetch expected'))))

    renderLanding()

    expect(screen.getByRole('heading', { name: /CV'nizi Yapay Zekâ ile/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Ücretsiz Başla' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Free' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Premium' })).toBeInTheDocument()
    expect(screen.getByText(/Sıkça Sorulan Sorular/)).toBeInTheDocument()
  })

  it('never grants Premium itself — the plan card link only ever leads to register/checkout, never sets a plan', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no token stored — no fetch expected'))))

    renderLanding()

    const premiumLinks = screen.getAllByRole('link', { name: "Premium'a Geç" })
    expect(premiumLinks.length).toBeGreaterThan(0)
    premiumLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/register')
    })
  })

  it('links footer to the legal and contact pages', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no token stored — no fetch expected'))))

    renderLanding()

    // "Gizlilik Politikası" also appears inline in the Security section, so there are two links —
    // both must point at /privacy either way.
    screen.getAllByRole('link', { name: 'Gizlilik Politikası' }).forEach((link) => expect(link).toHaveAttribute('href', '/privacy'))
    expect(screen.getByRole('link', { name: 'Kullanım Şartları' })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: 'Çerez Politikası' })).toHaveAttribute('href', '/cookies')
    expect(screen.getByRole('link', { name: 'İletişim' })).toHaveAttribute('href', '/contact')
  })

  it('sends an authenticated Free-plan visitor straight to checkout when they click "Premium\'a Geç" (not just the app shell)', async () => {
    renderLandingAsAuthenticated('FREE')

    await waitFor(() => expect(screen.getByRole('link', { name: "Premium'a Geç" })).toHaveAttribute('href', '/premium/checkout'))
  })

  it('sends an already-Premium authenticated visitor to the app shell, never back to checkout', async () => {
    renderLandingAsAuthenticated('PREMIUM')

    // Both before and after the usage fetch resolves, a Premium visitor's target stays /app —
    // never /premium/checkout, since there is nothing for them to check out.
    await waitFor(() => expect(screen.getByRole('link', { name: "Premium'a Geç" })).toHaveAttribute('href', '/app'))
  })
})

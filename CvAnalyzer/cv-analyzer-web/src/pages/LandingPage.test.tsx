import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LandingPage from './LandingPage'
import { AuthProvider } from '../context/AuthContext'
import { BillingProvider } from '../context/BillingContext'

function renderLanding() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <BillingProvider>
          <LandingPage />
        </BillingProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
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
})

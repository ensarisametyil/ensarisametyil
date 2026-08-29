import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPage from './PrivacyPage'
import TermsPage from './TermsPage'
import CookiesPage from './CookiesPage'
import { AuthProvider } from '../context/AuthContext'
import { BillingProvider } from '../context/BillingContext'

function renderWithProviders(ui: ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <BillingProvider>{ui}</BillingProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('Legal pages', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('PrivacyPage renders its heading, KVKK section, and a not-legal-advice disclaimer', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no fetch expected'))))
    renderWithProviders(<PrivacyPage />)

    expect(screen.getByRole('heading', { name: 'Gizlilik Politikası' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '5. Haklarınız (KVKK Kapsamında)' })).toBeInTheDocument()
    expect(screen.getByText(/hukuki danışmanlığın yerini tutmaz/)).toBeInTheDocument()
  })

  it('TermsPage renders its heading and a not-legal-advice disclaimer', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no fetch expected'))))
    renderWithProviders(<TermsPage />)

    expect(screen.getByRole('heading', { name: 'Kullanım Şartları' })).toBeInTheDocument()
    expect(screen.getByText(/hukuki danışmanlığın yerini tutmaz/)).toBeInTheDocument()
  })

  it('CookiesPage renders its heading and explains localStorage usage', () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no fetch expected'))))
    renderWithProviders(<CookiesPage />)

    expect(screen.getByRole('heading', { name: 'Çerez Politikası' })).toBeInTheDocument()
    expect(screen.getAllByText(/localStorage/).length).toBeGreaterThan(0)
  })
})

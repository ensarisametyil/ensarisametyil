import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PremiumCheckoutPage from './PremiumCheckoutPage'
import { I18nProvider } from '../context/I18nContext'
import { API_BASE_URL } from '../api/config'

function renderPage() {
  return render(
    <I18nProvider>
      <PremiumCheckoutPage />
    </I18nProvider>,
  )
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function fillBuyerForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Ad'), 'Ada')
  await user.type(screen.getByLabelText('Soyad'), 'Lovelace')
  await user.type(screen.getByLabelText('TC Kimlik No'), '11111111111')
  await user.type(screen.getByLabelText('Cep Telefonu'), '5551234567')
  await user.type(screen.getByLabelText('Şehir'), 'Istanbul')
  await user.type(screen.getByLabelText('Adres'), 'Test Sk. No:1')
}

describe('PremiumCheckoutPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submits the buyer info to POST /api/billing/checkout and renders the returned checkout form', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: 'tok-1', checkoutFormContent: '<div id="iyzico-form">payment form</div>' }))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    renderPage()
    await fillBuyerForm(user)
    await user.click(screen.getByRole('button', { name: 'Ödemeye Geç' }))

    expect(await screen.findByTestId('checkout-form-container')).toBeInTheDocument()
    expect(screen.getByText('payment form')).toBeInTheDocument()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE_URL}/api/billing/checkout`)
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({
      name: 'Ada',
      surname: 'Lovelace',
      identityNumber: '11111111111',
      gsmNumber: '5551234567',
      city: 'Istanbul',
      addressLine: 'Test Sk. No:1',
    })
  })

  it('shows a localized error message (by code, not the backend\'s raw text) when checkout cannot be started (e.g. already Premium)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse(503, { code: 'CHECKOUT_UNAVAILABLE', message: 'Zaten Premium plandasınız.' })),
    )
    const user = userEvent.setup()

    renderPage()
    await fillBuyerForm(user)
    await user.click(screen.getByRole('button', { name: 'Ödemeye Geç' }))

    expect(await screen.findByText('Ödeme başlatılamadı.')).toBeInTheDocument()
    expect(screen.queryByTestId('checkout-form-container')).not.toBeInTheDocument()
  })
})

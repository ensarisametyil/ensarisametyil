import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ComparePage from './ComparePage'
import { I18nProvider } from '../context/I18nContext'
import { API_BASE_URL } from '../api/config'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderPage() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={['/compare']}>
        <ComparePage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

const ANALYSES_RESPONSE = {
  items: [
    { id: 'analysis-a', cvId: 'cv-a', cvFileName: 'a.pdf', overallScore: 82, summary: 'ok', createdAt: '2026-03-01T00:00:00Z' },
    { id: 'analysis-b', cvId: 'cv-b', cvFileName: 'b.pdf', overallScore: 91, summary: 'ok', createdAt: '2026-03-02T00:00:00Z' },
  ],
  page: 1,
  pageSize: 100,
  totalCount: 2,
}

function mockFetchRoutes(overrides: Array<[RegExp, () => Response]> = []) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()

    for (const [pattern, handler] of overrides) {
      if (pattern.test(url)) {
        return Promise.resolve(handler())
      }
    }

    if (url.includes('/api/analyses')) {
      return Promise.resolve(jsonResponse(200, ANALYSES_RESPONSE))
    }

    throw new Error(`unexpected fetch to ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('ComparePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a hint instead of the compare form when the user has fewer than two analyses', async () => {
    mockFetchRoutes([[/\/api\/analyses/, () => jsonResponse(200, { items: [], page: 1, pageSize: 100, totalCount: 0 })]])

    renderPage()

    expect(await screen.findByText('Karşılaştırma yapabilmek için en az iki analiziniz olmalı.')).toBeInTheDocument()
  })

  it('rejects selecting the same analysis on both sides without calling the compare endpoint', async () => {
    const fetchMock = mockFetchRoutes()
    const user = userEvent.setup()

    renderPage()
    await user.selectOptions(await screen.findByLabelText('Analiz A'), 'analysis-a')
    await user.selectOptions(screen.getByLabelText('Analiz B'), 'analysis-a')
    await user.click(screen.getByRole('button', { name: 'Karşılaştır' }))

    expect(await screen.findByText('Karşılaştırmak için iki farklı analiz seçmelisiniz.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input]) => (typeof input === 'string' ? input : input.toString()).includes('/compare?'))).toBe(false)
  })

  it('submits two different analysis ids and renders each side’s unique strengths/weaknesses plus the score difference', async () => {
    const fetchMock = mockFetchRoutes([
      [
        /\/api\/career-assistant\/compare\?/,
        () =>
          jsonResponse(200, {
            a: { analysisId: 'analysis-a', cvId: 'cv-a', cvFileName: 'a.pdf', overallScore: 82, createdAt: '2026-03-01T00:00:00Z', uniqueStrengths: ['Clear layout'], uniqueWeaknesses: [] },
            b: { analysisId: 'analysis-b', cvId: 'cv-b', cvFileName: 'b.pdf', overallScore: 91, createdAt: '2026-03-02T00:00:00Z', uniqueStrengths: ['Good metrics'], uniqueWeaknesses: [] },
            scoreDifference: -9,
          }),
      ],
    ])
    const user = userEvent.setup()

    renderPage()
    await user.selectOptions(await screen.findByLabelText('Analiz A'), 'analysis-a')
    await user.selectOptions(screen.getByLabelText('Analiz B'), 'analysis-b')
    await user.click(screen.getByRole('button', { name: 'Karşılaştır' }))

    expect(await screen.findByText('Clear layout')).toBeInTheDocument()
    expect(screen.getByText('Good metrics')).toBeInTheDocument()
    expect(screen.getByText(/-9/)).toBeInTheDocument()

    const call = fetchMock.mock.calls.find(([input]) => (typeof input === 'string' ? input : input.toString()).includes('/compare?'))!
    const url = (typeof call[0] === 'string' ? call[0] : call[0].toString())
    expect(url).toBe(`${API_BASE_URL}/api/career-assistant/compare?analysisIdA=analysis-a&analysisIdB=analysis-b`)
  })
})

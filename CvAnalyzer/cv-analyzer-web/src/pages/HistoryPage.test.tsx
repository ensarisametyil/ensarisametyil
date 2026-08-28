import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HistoryPage from './HistoryPage'
import { API_BASE_URL } from '../api/config'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('HistoryPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders each past analysis with its CV name, score, summary, and date', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, {
        items: [
          {
            id: 'analysis-1',
            cvId: 'cv-1',
            cvFileName: 'my-cv.pdf',
            overallScore: 75,
            summary: 'Good CV with room to grow.',
            createdAt: '2026-03-15T00:00:00Z',
          },
        ],
        page: 1,
        pageSize: 20,
        totalCount: 1,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('my-cv.pdf')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('Good CV with room to grow.')).toBeInTheDocument()
    expect(screen.getByText('15 Mart 2026')).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/api/analyses?page=1&pageSize=20`)
  })

  it('shows an empty-state message when the user has no past analyses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse(200, { items: [], page: 1, pageSize: 20, totalCount: 0 })),
    )

    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Henüz bir analiz yapmadınız.')).toBeInTheDocument()
  })
})

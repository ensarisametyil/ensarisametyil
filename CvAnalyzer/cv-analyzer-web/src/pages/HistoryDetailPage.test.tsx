import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import HistoryDetailPage from './HistoryDetailPage'
import { API_BASE_URL } from '../api/config'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderDetailPage(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/history/${id}`]}>
      <Routes>
        <Route path="/history/:id" element={<HistoryDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HistoryDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches and renders the full analysis result for the id in the URL (never hard-coded)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, {
        id: 'analysis-42',
        cvId: 'cv-1',
        cvFileName: 'my-cv.pdf',
        createdAt: '2026-03-15T00:00:00Z',
        result: {
          overallScore: 82,
          summary: 'Strong technical CV.',
          strengths: ['Clear structure'],
          weaknesses: ['No metrics'],
          skills: ['C#'],
          experience: '3 years backend experience.',
          education: 'BSc Computer Science.',
          missingKeywords: ['Docker'],
          recommendations: ['Add measurable impact.'],
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderDetailPage('analysis-42')

    expect(await screen.findByText('my-cv.pdf')).toBeInTheDocument()
    expect(screen.getByText('Strong technical CV.')).toBeInTheDocument()
    expect(screen.getByText('82')).toBeInTheDocument()
    expect(screen.getByText('Clear structure')).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/api/analyses/analysis-42`)
  })

  it('shows an error message when the analysis cannot be found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse(404, { code: 'ANALYSIS_NOT_FOUND', message: 'Analiz bulunamadı.' })),
    )

    renderDetailPage('unknown-id')

    expect(await screen.findByText('CV bulunamadı.')).toBeInTheDocument()
  })
})

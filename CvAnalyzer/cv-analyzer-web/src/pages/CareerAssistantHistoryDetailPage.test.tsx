import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CareerAssistantHistoryDetailPage from './CareerAssistantHistoryDetailPage'
import { I18nProvider } from '../context/I18nContext'
import { API_BASE_URL } from '../api/config'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderDetailPage(id: string) {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[`/assistant/history/${id}`]}>
        <Routes>
          <Route path="/assistant/history/:id" element={<CareerAssistantHistoryDetailPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  )
}

describe('CareerAssistantHistoryDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a stored JobMatch result typed correctly, not as raw JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        jsonResponse(200, {
          id: 'result-1',
          cvId: 'cv-1',
          cvFileName: 'my-cv.pdf',
          type: 'JobMatch',
          createdAt: '2026-03-15T00:00:00Z',
          result: {
            overallScore: 82,
            skillsScore: 88,
            experienceScore: 76,
            keywordsScore: 91,
            educationScore: 80,
            summary: 'Strong match.',
            requiredSkills: ['C#'],
            preferredSkills: [],
            matchedSkills: ['C#'],
            missingSkills: [],
            strengths: ['Relevant experience'],
            gaps: [],
            suggestedCvChanges: [],
          },
        }),
      ),
    )

    renderDetailPage('result-1')

    expect(await screen.findByText('Strong match.')).toBeInTheDocument()
    expect(screen.getByText('Relevant experience')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'İş Eşleştirme' })).toBeInTheDocument()
  })

  it('renders a stored CoverLetter result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        jsonResponse(200, {
          id: 'result-2',
          cvId: 'cv-1',
          cvFileName: 'my-cv.pdf',
          type: 'CoverLetter',
          createdAt: '2026-03-15T00:00:00Z',
          result: { coverLetterText: 'Dear Hiring Manager, ...' },
        }),
      ),
    )

    renderDetailPage('result-2')

    expect(await screen.findByText('Dear Hiring Manager, ...')).toBeInTheDocument()
  })

  it('shows a localized error when the result cannot be found (never owned by another user)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse(404, { code: 'CAREER_ASSISTANT_RESULT_NOT_FOUND', message: 'not found' })),
    )

    renderDetailPage('unknown-id')

    expect(await screen.findByText('Belirtilen sonuç bulunamadı.')).toBeInTheDocument()
  })

  it('fetches the exact id from the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(200, {
        id: 'result-3',
        cvId: 'cv-1',
        cvFileName: 'my-cv.pdf',
        type: 'CvRewrite',
        createdAt: '2026-03-15T00:00:00Z',
        result: { summary: 'ok', suggestions: [] },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderDetailPage('result-3')

    await screen.findByText('ok')
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/api/career-assistant/history/result-3`)
  })
})

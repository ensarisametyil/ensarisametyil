import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CareerAssistantPage from './CareerAssistantPage'
import { I18nProvider } from '../context/I18nContext'
import { API_BASE_URL } from '../api/config'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const CV_ID = 'cv-123'

function renderPage() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={[`/assistant/${CV_ID}`]}>
        <Routes>
          <Route path="/assistant/:cvId" element={<CareerAssistantPage />} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>,
  )
}

const CV_DETAIL_RESPONSE = {
  id: CV_ID,
  fileName: 'my-cv.pdf',
  contentType: 'application/pdf',
  fileSizeBytes: 1024,
  uploadedAt: '2026-03-01T00:00:00Z',
}

const CVORA_SCORE_RESPONSE = {
  cvoraScore: 93,
  components: { contentQuality: 80, skills: 100, experience: 100, structure: 100, readability: 100, atsCompatibility: null },
  basedOnAnalysisId: 'analysis-1',
  basedOnAtsAnalysisId: null,
}

/** Routes GET /api/cv/{cvId} + GET cvora-score by default; extra handlers can override/extend for a specific test. */
function mockFetchRoutes(overrides: Array<[RegExp, () => Response]> = []) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const method = init?.method ?? 'GET'

    for (const [pattern, handler] of overrides) {
      if (pattern.test(url)) {
        return Promise.resolve(handler())
      }
    }

    if (url.includes(`/api/cv/${CV_ID}`) && method === 'GET') {
      return Promise.resolve(jsonResponse(200, CV_DETAIL_RESPONSE))
    }
    if (url.includes('/api/career-assistant/cvora-score/')) {
      return Promise.resolve(jsonResponse(200, CVORA_SCORE_RESPONSE))
    }

    throw new Error(`unexpected fetch to ${method} ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('CareerAssistantPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the CV file name and the CVora Score once both load', async () => {
    mockFetchRoutes()

    renderPage()

    expect(await screen.findByText(/my-cv.pdf/)).toBeInTheDocument()
    expect(await screen.findByText('93')).toBeInTheDocument()
  })

  it('shows an "analyze first" message when no base analysis exists yet for this CV', async () => {
    mockFetchRoutes([[/\/cvora-score\//, () => jsonResponse(404, { code: 'ANALYSIS_NOT_FOUND', message: 'not found' })]])

    renderPage()

    expect(await screen.findByText("Önce CV'nizi analiz edin")).toBeInTheDocument()
  })

  it('disables the Job Match submit button until a job description is entered, then shows results on success', async () => {
    const fetchMock = mockFetchRoutes([
      [
        /\/api\/career-assistant\/job-match$/,
        () =>
          jsonResponse(200, {
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
          }),
      ],
    ])
    const user = userEvent.setup()

    renderPage()
    await screen.findByText(/my-cv.pdf/)
    await user.click(screen.getByRole('tab', { name: 'İş Eşleştirme' }))

    const submitButton = screen.getByRole('button', { name: 'Eşleştirmeyi Analiz Et' })
    expect(submitButton).toBeDisabled()

    await user.type(screen.getByLabelText('İş İlanı Metni'), 'We need a backend developer with C# experience.')
    expect(submitButton).not.toBeDisabled()

    await user.click(submitButton)

    expect(await screen.findByText('Strong match.')).toBeInTheDocument()
    expect(screen.getByText('Relevant experience')).toBeInTheDocument()

    const call = fetchMock.mock.calls.find(([input]) => (typeof input === 'string' ? input : input.toString()).endsWith('/job-match'))!
    const [url, init] = call
    expect(url).toBe(`${API_BASE_URL}/api/career-assistant/job-match`)
    expect(JSON.parse(init!.body as string)).toEqual({ cvId: CV_ID, jobDescription: 'We need a backend developer with C# experience.' })
  })

  it('shows a Premium upgrade notice instead of a raw error when the backend returns PREMIUM_FEATURE_REQUIRED', async () => {
    mockFetchRoutes([[/\/api\/career-assistant\/ats-analysis$/, () => jsonResponse(403, { code: 'PREMIUM_FEATURE_REQUIRED', message: 'nope' })]])
    const user = userEvent.setup()

    renderPage()
    await screen.findByText(/my-cv.pdf/)
    await user.click(screen.getByRole('tab', { name: 'ATS Analizi' }))
    await user.click(screen.getByRole('button', { name: 'ATS Analizini Başlat' }))

    expect(await screen.findByText('Premium Özellik')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "Premium'a Geç" })).toHaveAttribute('href', '/premium/checkout')
  })

  it('shows an empty-state message on the History tab when this CV has no Career Assistant results yet', async () => {
    mockFetchRoutes([[/\/api\/career-assistant\/history\?/, () => jsonResponse(200, { items: [], page: 1, pageSize: 20, totalCount: 0 })]])
    const user = userEvent.setup()

    renderPage()
    await screen.findByText(/my-cv.pdf/)
    await user.click(screen.getByRole('tab', { name: 'Geçmiş' }))

    expect(await screen.findByText('Bu CV için henüz kariyer asistanı sonucu yok.')).toBeInTheDocument()
  })

  it('marks the active tab via aria-selected for accessibility', async () => {
    mockFetchRoutes()
    const user = userEvent.setup()

    renderPage()
    await screen.findByText(/my-cv.pdf/)

    const tabs = screen.getByRole('tablist')
    expect(within(tabs).getByRole('tab', { name: 'Genel Bakış' })).toHaveAttribute('aria-selected', 'true')

    await user.click(within(tabs).getByRole('tab', { name: 'CV Yeniden Yazım' }))
    expect(within(tabs).getByRole('tab', { name: 'CV Yeniden Yazım' })).toHaveAttribute('aria-selected', 'true')
    expect(within(tabs).getByRole('tab', { name: 'Genel Bakış' })).toHaveAttribute('aria-selected', 'false')
  })
})

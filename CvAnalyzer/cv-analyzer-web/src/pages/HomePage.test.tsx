import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomePage from './HomePage'
import { I18nProvider } from '../context/I18nContext'
import { AuthProvider } from '../context/AuthContext'
import { BillingProvider } from '../context/BillingContext'
import { setToken } from '../api/tokenStorage'
import { API_BASE_URL } from '../api/config'
import type { CvAnalysisResult } from '../types/cv'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderHomePage() {
  return render(
    <I18nProvider>
      <AuthProvider>
        <BillingProvider>
          <HomePage />
        </BillingProvider>
      </AuthProvider>
    </I18nProvider>,
  )
}

function makePdfFile(name = 'cv.pdf'): File {
  return new File(['%PDF-1.4 fake content'], name, { type: 'application/pdf' })
}

const ANALYSIS_RESULT: CvAnalysisResult = {
  overallScore: 82,
  summary: 'Strong technical CV with clear backend experience.',
  strengths: ['Clear structure'],
  weaknesses: ['No quantifiable achievements'],
  skills: ['C#', 'ASP.NET Core'],
  experience: '3+ years as a backend developer.',
  education: 'BSc Computer Science.',
  missingKeywords: ['Docker'],
  recommendations: ['Add measurable impact.'],
}

async function uploadAndClickAnalyze() {
  const user = userEvent.setup()
  await user.upload(screen.getByTestId('cv-file-input'), makePdfFile())
  const analyzeButton = await screen.findByRole('button', { name: "CV'yi Analiz Et" })
  await user.click(analyzeButton)
  return user
}

describe('HomePage upload -> analyze flow', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the cvId returned by upload and sends that exact id to analyze (never hard-coded)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { cvId: 'cv-42', fileName: 'cv.pdf' }))
      .mockResolvedValueOnce(jsonResponse(200, ANALYSIS_RESULT))
    vi.stubGlobal('fetch', fetchMock)

    renderHomePage()
    await uploadAndClickAnalyze()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const [analyzeUrl, analyzeInit] = fetchMock.mock.calls[1]
    expect(analyzeUrl).toBe(`${API_BASE_URL}/api/cv/cv-42/analyze`)
    expect(analyzeInit.method).toBe('POST')
  })

  it('shows a "CV analiz ediliyor..." loading state and disables the button while analyzing', async () => {
    let resolveAnalyze!: (response: Response) => void
    const analyzePromise = new Promise<Response>((resolve) => {
      resolveAnalyze = resolve
    })

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { cvId: 'cv-1', fileName: 'cv.pdf' }))
        .mockReturnValueOnce(analyzePromise),
    )

    renderHomePage()
    await uploadAndClickAnalyze()

    expect(await screen.findByText('CV analiz ediliyor...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /analiz/i })).toBeDisabled()

    resolveAnalyze(jsonResponse(200, ANALYSIS_RESULT))

    await waitFor(() => expect(screen.getByText('82')).toBeInTheDocument())
  })

  it('renders the analysis dashboard after a successful analyze call', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { cvId: 'cv-1', fileName: 'cv.pdf' }))
        .mockResolvedValueOnce(jsonResponse(200, ANALYSIS_RESULT)),
    )

    renderHomePage()
    await uploadAndClickAnalyze()

    expect(await screen.findByText(ANALYSIS_RESULT.summary)).toBeInTheDocument()
    expect(screen.getByText('82')).toBeInTheDocument()
    expect(screen.getByText('Clear structure')).toBeInTheDocument()
  })

  it.each([
    [404, 'CV bulunamadı.'],
    [429, 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.'],
    // 503 with an unrecognized code falls to the generic message — only a recognized `code`
    // (e.g. AI_UNAVAILABLE) gets the specific AI-unavailable text, never a status-based guess.
    [503, 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'],
  ])('shows the correct message for a %i analyze response', async (status, expectedMessage) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { cvId: 'cv-1', fileName: 'cv.pdf' }))
        .mockResolvedValueOnce(jsonResponse(status, { code: 'X', message: 'internal backend detail' })),
    )

    renderHomePage()
    await uploadAndClickAnalyze()

    expect(await screen.findByText(expectedMessage)).toBeInTheDocument()
    // Never show the raw backend detail directly for these well-known statuses.
    expect(screen.queryByText('internal backend detail')).not.toBeInTheDocument()
  })

  it('shows the recognized AI_UNAVAILABLE code as the specific AI-unavailable message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { cvId: 'cv-1', fileName: 'cv.pdf' }))
        .mockResolvedValueOnce(jsonResponse(503, { code: 'AI_UNAVAILABLE', message: 'internal backend detail' })),
    )

    renderHomePage()
    await uploadAndClickAnalyze()

    expect(await screen.findByText('AI analiz servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.')).toBeInTheDocument()
    expect(screen.queryByText('internal backend detail')).not.toBeInTheDocument()
  })

  it('shows a connectivity message on a network-level failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { cvId: 'cv-1', fileName: 'cv.pdf' }))
        .mockRejectedValueOnce(new TypeError('Failed to fetch')),
    )

    renderHomePage()
    await uploadAndClickAnalyze()

    expect(await screen.findByText('Sunucuya bağlanılamadı.')).toBeInTheDocument()
  })

  it('shows a generic message for an unexpected error and keeps the analyze button usable again', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { cvId: 'cv-1', fileName: 'cv.pdf' }))
        .mockResolvedValueOnce(jsonResponse(500, { code: 'INTERNAL_SERVER_ERROR', message: 'Beklenmeyen bir sunucu hatası oluştu.' })),
    )

    renderHomePage()
    await uploadAndClickAnalyze()

    expect(await screen.findByText('Beklenmeyen bir sunucu hatası oluştu.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: "CV'yi Analiz Et" })).toBeEnabled()
  })

  it('shows the localized quota-exceeded message (by code, not the backend\'s raw Turkish text) when analyze returns 402', async () => {
    // The backend's own message is always Turkish and carries dynamic details (exact limit,
    // etc.) — the frontend maps the safe `code` to a localized, static message instead, so the
    // active UI language is respected regardless of what the backend happened to say.
    const backendMessage = "Aylık analiz hakkınızı doldurdunuz (2 analiz). Daha fazla analiz için Premium'a geçebilirsiniz."
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(200, { cvId: 'cv-1', fileName: 'cv.pdf' }))
        .mockResolvedValueOnce(jsonResponse(402, { code: 'QUOTA_EXCEEDED', message: backendMessage })),
    )

    renderHomePage()
    await uploadAndClickAnalyze()

    expect(await screen.findByText('Aylık analiz hakkınızı doldurdunuz.')).toBeInTheDocument()
    expect(screen.queryByText(backendMessage)).not.toBeInTheDocument()
  })
})

describe('HomePage quota-aware Analyze button', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('disables the Analyze button with an explanation once the monthly quota is exhausted', async () => {
    setToken('existing-token')
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString()
        if (url.includes('/api/auth/me')) {
          return Promise.resolve(jsonResponse(200, { id: 'user-1', email: 'user@example.com', createdAt: '2026-01-01T00:00:00Z' }))
        }
        if (url.includes('/api/billing/usage')) {
          return Promise.resolve(
            jsonResponse(200, { plan: 'FREE', used: 2, limit: 2, remaining: 0, periodStart: '2026-08-01T00:00:00Z', periodEnd: '2026-09-01T00:00:00Z' }),
          )
        }
        if (url.includes('/api/cv/upload')) {
          return Promise.resolve(jsonResponse(200, { cvId: 'cv-1', fileName: 'cv.pdf' }))
        }
        throw new Error(`unexpected fetch to ${url}`)
      }),
    )

    renderHomePage()

    const user = userEvent.setup()
    await user.upload(screen.getByTestId('cv-file-input'), makePdfFile())

    const analyzeButton = await screen.findByRole('button', { name: "CV'yi Analiz Et" })
    expect(analyzeButton).toBeDisabled()
    expect(screen.getByText(/Premium'a geçerek daha fazla analiz yapabilirsiniz/)).toBeInTheDocument()
  })
})

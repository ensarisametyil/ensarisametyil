import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HistoryPage from './HistoryPage'
import { I18nProvider } from '../context/I18nContext'
import { API_BASE_URL } from '../api/config'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderHistoryPage() {
  return render(
    <I18nProvider>
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    </I18nProvider>,
  )
}

function mockFetchRoutes(routes: Record<string, () => Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const match = Object.entries(routes).find(([pattern]) => url.includes(pattern))
    if (!match) {
      throw new Error(`No mocked route for ${url}`)
    }
    return Promise.resolve(match[1]())
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
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

    renderHistoryPage()

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

    renderHistoryPage()

    expect(await screen.findByText('Henüz bir analiz yapmadınız.')).toBeInTheDocument()
  })

  it('does not render pagination controls when everything fits on one page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        jsonResponse(200, {
          items: [{ id: 'a1', cvId: 'cv-1', cvFileName: 'cv.pdf', overallScore: 50, summary: 's', createdAt: '2026-01-01T00:00:00Z' }],
          page: 1,
          pageSize: 20,
          totalCount: 1,
        }),
      ),
    )

    renderHistoryPage()

    await screen.findByText('cv.pdf')
    expect(screen.queryByRole('navigation', { name: 'Sayfalar' })).not.toBeInTheDocument()
  })

  it('shows pagination controls and fetches the next page on click, without loading everything at once', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: [{ id: 'a1', cvId: 'cv-1', cvFileName: 'page-one.pdf', overallScore: 50, summary: 's', createdAt: '2026-01-01T00:00:00Z' }],
          page: 1,
          pageSize: 20,
          totalCount: 45,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: [{ id: 'a2', cvId: 'cv-2', cvFileName: 'page-two.pdf', overallScore: 60, summary: 's2', createdAt: '2026-01-02T00:00:00Z' }],
          page: 2,
          pageSize: 20,
          totalCount: 45,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    renderHistoryPage()

    await screen.findByText('page-one.pdf')
    expect(screen.getByText('Sayfa 1 / 3')).toBeInTheDocument()
    const previousButton = screen.getByRole('button', { name: 'Önceki' })
    expect(previousButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Sonraki' }))

    await screen.findByText('page-two.pdf')
    expect(screen.queryByText('page-one.pdf')).not.toBeInTheDocument()
    expect(screen.getByText('Sayfa 2 / 3')).toBeInTheDocument()
    expect(fetchMock.mock.calls[1][0]).toBe(`${API_BASE_URL}/api/analyses?page=2&pageSize=20`)
  })

  it('shows a loading spinner again while fetching a new page', async () => {
    const user = userEvent.setup()
    let resolveSecondFetch: ((value: Response) => void) | undefined
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          items: [{ id: 'a1', cvId: 'cv-1', cvFileName: 'page-one.pdf', overallScore: 50, summary: 's', createdAt: '2026-01-01T00:00:00Z' }],
          page: 1,
          pageSize: 20,
          totalCount: 45,
        }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveSecondFetch = resolve
          }),
      )
    vi.stubGlobal('fetch', fetchMock)

    renderHistoryPage()

    await screen.findByText('page-one.pdf')
    await user.click(screen.getByRole('button', { name: 'Sonraki' }))

    await waitFor(() => expect(screen.queryByText('page-one.pdf')).not.toBeInTheDocument())
    expect(screen.getByText('Yükleniyor...')).toBeInTheDocument()

    resolveSecondFetch?.(
      jsonResponse(200, {
        items: [{ id: 'a2', cvId: 'cv-2', cvFileName: 'page-two.pdf', overallScore: 60, summary: 's2', createdAt: '2026-01-02T00:00:00Z' }],
        page: 2,
        pageSize: 20,
        totalCount: 45,
      }),
    )
    await screen.findByText('page-two.pdf')
  })

  it('asks for confirmation before deleting, and does nothing if the user backs out', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchRoutes({
      '/api/analyses':
        () =>
          jsonResponse(200, {
            items: [{ id: 'a1', cvId: 'cv-1', cvFileName: 'my-cv.pdf', overallScore: 50, summary: 's', createdAt: '2026-01-01T00:00:00Z' }],
            page: 1,
            pageSize: 20,
            totalCount: 1,
          }),
    })

    renderHistoryPage()
    await screen.findByText('my-cv.pdf')

    await user.click(screen.getByRole('button', { name: 'my-cv.pdf analizini sil' }))
    expect(await screen.findByText('Bu CV\'yi ve analiz sonucunu kalıcı olarak silmek istediğinize emin misiniz?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Vazgeç' }))

    expect(screen.queryByText('Bu CV\'yi ve analiz sonucunu kalıcı olarak silmek istediğinize emin misiniz?')).not.toBeInTheDocument()
    expect(screen.getByText('my-cv.pdf')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input]) => input.toString().includes('/api/cv/'))).toBe(false)
  })

  it('deletes the CV via DELETE /api/cv/{cvId} on confirmation and removes it from the list', async () => {
    const user = userEvent.setup()
    const fetchMock = mockFetchRoutes({
      '/api/analyses':
        () =>
          jsonResponse(200, {
            items: [{ id: 'a1', cvId: 'cv-1', cvFileName: 'my-cv.pdf', overallScore: 50, summary: 's', createdAt: '2026-01-01T00:00:00Z' }],
            page: 1,
            pageSize: 20,
            totalCount: 1,
          }),
      '/api/cv/cv-1': () => new Response(null, { status: 204 }),
    })

    renderHistoryPage()
    await screen.findByText('my-cv.pdf')

    await user.click(screen.getByRole('button', { name: 'my-cv.pdf analizini sil' }))
    await user.click(screen.getByRole('button', { name: 'Evet, Sil' }))

    await waitFor(() => expect(screen.queryByText('my-cv.pdf')).not.toBeInTheDocument())
    expect(screen.getByText('Henüz bir analiz yapmadınız.')).toBeInTheDocument()

    const deleteCall = fetchMock.mock.calls.find(([input]) => input.toString().includes('/api/cv/cv-1'))
    expect(deleteCall).toBeDefined()
    expect(deleteCall?.[1]?.method).toBe('DELETE')
  })

  it('shows a localized error and keeps the row when deletion fails', async () => {
    const user = userEvent.setup()
    mockFetchRoutes({
      '/api/analyses':
        () =>
          jsonResponse(200, {
            items: [{ id: 'a1', cvId: 'cv-1', cvFileName: 'my-cv.pdf', overallScore: 50, summary: 's', createdAt: '2026-01-01T00:00:00Z' }],
            page: 1,
            pageSize: 20,
            totalCount: 1,
          }),
      '/api/cv/cv-1': () => jsonResponse(404, { code: 'CV_NOT_FOUND', message: 'irrelevant backend text' }),
    })

    renderHistoryPage()
    await screen.findByText('my-cv.pdf')

    await user.click(screen.getByRole('button', { name: 'my-cv.pdf analizini sil' }))
    await user.click(screen.getByRole('button', { name: 'Evet, Sil' }))

    expect(await screen.findByText('Belirtilen CV bulunamadı.')).toBeInTheDocument()
    expect(screen.getByText('my-cv.pdf')).toBeInTheDocument()
    expect(screen.queryByText('irrelevant backend text')).not.toBeInTheDocument()
  })
})

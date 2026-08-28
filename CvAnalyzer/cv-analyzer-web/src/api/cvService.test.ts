import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeCv, uploadCv } from './cvService'
import { ApiError } from './ApiError'
import { API_BASE_URL } from './config'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('cvService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('uploadCv', () => {
    it('POSTs the file as multipart form data and returns the parsed response', async () => {
      const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { cvId: 'abc-123', fileName: 'cv.pdf' }))
      vi.stubGlobal('fetch', fetchMock)

      const file = new File(['%PDF-1.4'], 'cv.pdf', { type: 'application/pdf' })
      const result = await uploadCv(file)

      expect(result).toEqual({ cvId: 'abc-123', fileName: 'cv.pdf' })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${API_BASE_URL}/api/cv/upload`)
      expect(init.method).toBe('POST')
      expect(init.body).toBeInstanceOf(FormData)
      expect((init.body as FormData).get('file')).toBe(file)
    })

    it('throws an ApiError carrying the backend status/code/message on failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse(400, { code: 'INVALID_FILE', message: 'Sadece PDF ve DOCX dosyaları kabul edilir.' })),
      )

      const file = new File(['x'], 'cv.txt', { type: 'text/plain' })

      await expect(uploadCv(file)).rejects.toMatchObject({
        status: 400,
        code: 'INVALID_FILE',
        message: 'Sadece PDF ve DOCX dosyaları kabul edilir.',
      })
    })
  })

  describe('analyzeCv', () => {
    it('POSTs to /api/cv/{id}/analyze using the given cv id — never a hard-coded id', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse(200, {
          overallScore: 82,
          summary: 'Good CV',
          strengths: [],
          weaknesses: [],
          skills: [],
          experience: '',
          education: '',
          missingKeywords: [],
          recommendations: [],
        }),
      )
      vi.stubGlobal('fetch', fetchMock)

      await analyzeCv('b34f65c8-9060-4f9c-8794-c7aa8e214c53')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${API_BASE_URL}/api/cv/b34f65c8-9060-4f9c-8794-c7aa8e214c53/analyze`)
      expect(init.method).toBe('POST')
    })

    it('throws ApiError(status=0) on a network-level failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
      )

      await expect(analyzeCv('some-id')).rejects.toBeInstanceOf(ApiError)
      await expect(analyzeCv('some-id')).rejects.toMatchObject({ status: 0 })
    })

    it('throws ApiError(404) when the CV is not found', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse(404, { code: 'CV_NOT_FOUND', message: 'Belirtilen CV bulunamadı.' })),
      )

      await expect(analyzeCv('missing-id')).rejects.toMatchObject({ status: 404, code: 'CV_NOT_FOUND' })
    })

    it('throws ApiError(429) when rate-limited', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(429, { code: 'AI_RATE_LIMITED', message: 'Rate limited' })))

      await expect(analyzeCv('some-id')).rejects.toMatchObject({ status: 429 })
    })

    it('throws ApiError(503) when the AI provider is unavailable', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(503, { code: 'AI_UNAVAILABLE', message: 'Unavailable' })))

      await expect(analyzeCv('some-id')).rejects.toMatchObject({ status: 503 })
    })
  })
})

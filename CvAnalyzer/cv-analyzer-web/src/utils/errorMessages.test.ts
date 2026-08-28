import { describe, expect, it } from 'vitest'
import { getErrorMessage } from './errorMessages'
import { ApiError } from '../api/ApiError'

describe('getErrorMessage', () => {
  it('maps a network failure (status 0) to a connectivity message', () => {
    expect(getErrorMessage(new ApiError(0, 'irrelevant'))).toBe('Sunucuya bağlanılamadı.')
  })

  it('maps 404 to a not-found message', () => {
    expect(getErrorMessage(new ApiError(404, 'irrelevant', 'CV_NOT_FOUND'))).toBe('CV bulunamadı.')
  })

  it('maps 429 to a rate-limit message', () => {
    expect(getErrorMessage(new ApiError(429, 'irrelevant'))).toBe(
      'Çok fazla analiz isteği gönderildi. Lütfen biraz sonra tekrar deneyin.',
    )
  })

  it('maps 503 to an AI-unavailable message', () => {
    expect(getErrorMessage(new ApiError(503, 'irrelevant'))).toBe(
      'AI analiz servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    )
  })

  it('falls back to the backend message for any other status', () => {
    expect(getErrorMessage(new ApiError(400, 'Yüklenecek bir dosya seçmelisiniz.'))).toBe(
      'Yüklenecek bir dosya seçmelisiniz.',
    )
  })

  it('returns a generic safe message for a non-ApiError value (never leaks internals)', () => {
    expect(getErrorMessage(new Error('some internal stack trace detail'))).toBe(
      'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
    )
    expect(getErrorMessage('a plain string')).toBe('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.')
    expect(getErrorMessage(undefined)).toBe('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.')
  })
})

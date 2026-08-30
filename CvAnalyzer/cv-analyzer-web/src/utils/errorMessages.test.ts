import { describe, expect, it } from 'vitest'
import { getErrorMessage } from './errorMessages'
import { ApiError } from '../api/ApiError'
import { messages } from '../i18n/locales'

/**
 * A minimal, Turkish-only stand-in for the real I18nProvider's `t()` — enough to exercise
 * getErrorMessage's dot-path lookups without mounting a React tree. Mirrors the same
 * resolveValue logic as context/I18nContext.tsx, scoped to the `tr` locale only.
 */
function t(key: string): string {
  const value = key.split('.').reduce<unknown>((current, segment) => {
    if (typeof current !== 'object' || current === null || !(segment in current)) {
      return undefined
    }
    return (current as Record<string, unknown>)[segment]
  }, messages.tr)
  return typeof value === 'string' ? value : key
}

describe('getErrorMessage', () => {
  it('maps a network failure (status 0) to a connectivity message, regardless of any code/message present', () => {
    expect(getErrorMessage(new ApiError(0, 'irrelevant'), t)).toBe('Sunucuya bağlanılamadı.')
    expect(getErrorMessage(new ApiError(0, 'irrelevant', 'CV_NOT_FOUND'), t)).toBe('Sunucuya bağlanılamadı.')
  })

  it('maps a recognized backend code to its localized message, ignoring the backend\'s raw message text', () => {
    expect(getErrorMessage(new ApiError(404, 'some backend text', 'CV_NOT_FOUND'), t)).toBe('Belirtilen CV bulunamadı.')
    expect(getErrorMessage(new ApiError(503, 'some backend text', 'AI_UNAVAILABLE'), t)).toBe(
      'AI analiz servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    )
  })

  it('maps 404 with no recognized code to a generic not-found message', () => {
    expect(getErrorMessage(new ApiError(404, 'irrelevant'), t)).toBe('CV bulunamadı.')
  })

  it('maps 429 with no recognized code to a rate-limit message', () => {
    expect(getErrorMessage(new ApiError(429, 'irrelevant'), t)).toBe('Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.')
  })

  it('never falls back to the backend\'s raw message for an unmapped status/code — always a localized generic message', () => {
    expect(getErrorMessage(new ApiError(400, 'Yüklenecek bir dosya seçmelisiniz.'), t)).toBe(
      'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
    )
  })

  it('returns a generic safe message for a non-ApiError value (never leaks internals)', () => {
    expect(getErrorMessage(new Error('some internal stack trace detail'), t)).toBe('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.')
    expect(getErrorMessage('a plain string', t)).toBe('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.')
    expect(getErrorMessage(undefined, t)).toBe('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.')
  })
})

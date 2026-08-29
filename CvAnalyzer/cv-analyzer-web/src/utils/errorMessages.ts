import { ApiError } from '../api/ApiError'

const GENERIC_MESSAGE = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'

/**
 * Turns any error thrown by cvService into a safe, user-facing Turkish message. Never surfaces
 * backend exception details/stack traces — for well-known statuses it uses fixed copy; for
 * anything else it falls back to the backend's own (already-sanitized) message when present,
 * or a generic message otherwise.
 */
export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return GENERIC_MESSAGE
  }

  switch (error.status) {
    case 0:
      return 'Sunucuya bağlanılamadı.'
    case 404:
      return 'CV bulunamadı.'
    case 429:
      return 'Çok fazla analiz isteği gönderildi. Lütfen biraz sonra tekrar deneyin.'
    case 503:
      // 503 is shared by two unrelated backends behind this API — the AI provider and the
      // checkout/payment provider — so the fixed AI copy only applies to the AI's own code.
      // CHECKOUT_UNAVAILABLE (already Premium, Iyzico not configured, etc.) falls through to the
      // backend's own already-sanitized message instead.
      if (error.code === 'CHECKOUT_UNAVAILABLE') {
        return error.message || GENERIC_MESSAGE
      }
      return 'AI analiz servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.'
    default:
      return error.message || GENERIC_MESSAGE
  }
}

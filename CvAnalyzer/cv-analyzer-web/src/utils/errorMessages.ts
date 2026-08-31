import { ApiError } from '../api/ApiError'

type Translate = (key: string, params?: Record<string, string | number>) => string

/**
 * Turns any error thrown by cvService into a safe, user-facing, localized message. Never
 * surfaces backend exception details/stack traces. Keys off the backend's safe `code` field
 * (see errors.* in the locale files, which mirror every ErrorResponseDto code the API can
 * return) rather than its `message` — the backend's own message text is always Turkish, so
 * displaying it directly would silently ignore the active UI language.
 */
export function getErrorMessage(error: unknown, t: Translate): string {
  if (!(error instanceof ApiError)) {
    return t('errors.GENERIC')
  }

  if (error.status === 0) {
    return t('errors.NETWORK_ERROR')
  }

  if (error.code && hasErrorKey(error.code)) {
    return t(`errors.${error.code}`)
  }

  // No recognized code — fall back to a status-based generic, still never the backend's raw
  // (always-Turkish) message text.
  switch (error.status) {
    case 404:
      return t('errors.NOT_FOUND')
    case 429:
      return t('errors.RATE_LIMITED')
    default:
      return t('errors.GENERIC')
  }
}

const KNOWN_ERROR_CODES = new Set([
  'AI_INVALID_RESPONSE',
  'AI_RATE_LIMITED',
  'AI_UNAVAILABLE',
  'ACTION_FAILED',
  'ANALYSIS_NOT_FOUND',
  'CANCELLATION_FAILED',
  'CHECKOUT_UNAVAILABLE',
  'CV_FILE_NOT_FOUND',
  'CV_NOT_FOUND',
  'EMAIL_ALREADY_REGISTERED',
  'EMPTY_CV_TEXT',
  'FILE_TOO_LARGE',
  'INCORRECT_CURRENT_PASSWORD',
  'INCORRECT_PASSWORD',
  'INTERNAL_SERVER_ERROR',
  'INVALID_CREDENTIALS',
  'INVALID_FILE',
  'INVALID_OR_EXPIRED_TOKEN',
  'INVALID_REQUEST',
  'INVALID_ROLE',
  'INVALID_STATUS',
  'QUOTA_EXCEEDED',
  'RATE_LIMITED',
  'REQUEST_TOO_LARGE',
  'TEXT_EXTRACTION_FAILED',
  'UNSUPPORTED_FILE_TYPE',
  'USER_NOT_FOUND',
  'WEAK_PASSWORD',
])

function hasErrorKey(code: string): boolean {
  return KNOWN_ERROR_CODES.has(code)
}

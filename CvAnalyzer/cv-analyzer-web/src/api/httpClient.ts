import { ApiError } from './ApiError';
import { emitUnauthorized } from './authEvents';
import { getToken } from './tokenStorage';
import type { ApiErrorResponse } from '../types/cv';

// The strings below are internal fallback Error.message text, not user-facing copy — every call
// site displays an error via utils/errorMessages.getErrorMessage(error, t), which keys off
// status/code and always returns a localized string, ignoring this raw message. It only exists
// as a last-resort value for anything that reads error.message directly (e.g. a stray console
// log), so it's left in English rather than needing its own i18n plumbing in a module that has
// no access to the active locale (this is a plain fetch wrapper, not a React component/hook).
async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ApiErrorResponse>;
    return new ApiError(response.status, body.message ?? `Request failed (${response.status}).`, body.code);
  } catch {
    // Body wasn't JSON (or was empty) — fall back to a generic, still-safe message.
    return new ApiError(response.status, `Request failed (${response.status}).`);
  }
}

export interface RequestOptions extends RequestInit {
  /** Set true for requests that must never carry a token (register/login themselves). */
  skipAuth?: boolean;
}

/**
 * The single fetch wrapper every API call in this app goes through. Centralizing it here (rather
 * than attaching the Authorization header at each call site) is what makes "frontend never
 * juggles the token by hand" actually true — a call site just calls e.g. listAnalyses(), it never
 * touches the token itself.
 */
export async function requestJson<T>(input: string, init: RequestOptions = {}): Promise<T> {
  const { skipAuth, headers, ...rest } = init;

  const finalHeaders = new Headers(headers);
  const token = skipAuth ? null : getToken();
  if (token) {
    finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(input, { ...rest, headers: finalHeaders });
  } catch {
    // fetch() only throws for network-level failures (DNS, connection refused, CORS, offline) —
    // there was never an HTTP response to inspect.
    // Same rationale as parseErrorResponse above — getErrorMessage(error, t) always overrides
    // this for status 0 with the localized errors.NETWORK_ERROR string.
    throw new ApiError(0, 'Could not connect to the server.');
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      // We believed we were authenticated and the server disagreed (expired/invalid token) —
      // tell AuthContext so it can clear the stale session, distinct from a 401 returned by
      // /api/auth/login for a plain wrong-password attempt (no token was ever sent there).
      emitUnauthorized();
    }
    throw await parseErrorResponse(response);
  }

  return (await response.json()) as T;
}

/**
 * Same request/auth/error handling as requestJson, for endpoints that respond 204 No Content
 * (e.g. DELETE) — calling response.json() on an empty body would throw, so this variant never
 * attempts to parse one.
 */
export async function requestVoid(input: string, init: RequestOptions = {}): Promise<void> {
  const { skipAuth, headers, ...rest } = init;

  const finalHeaders = new Headers(headers);
  const token = skipAuth ? null : getToken();
  if (token) {
    finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(input, { ...rest, headers: finalHeaders });
  } catch {
    throw new ApiError(0, 'Could not connect to the server.');
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      emitUnauthorized();
    }
    throw await parseErrorResponse(response);
  }
}

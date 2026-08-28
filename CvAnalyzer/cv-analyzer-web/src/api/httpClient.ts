import { ApiError } from './ApiError';
import { emitUnauthorized } from './authEvents';
import { getToken } from './tokenStorage';
import type { ApiErrorResponse } from '../types/cv';

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as Partial<ApiErrorResponse>;
    return new ApiError(response.status, body.message ?? `İstek başarısız oldu (${response.status}).`, body.code);
  } catch {
    // Body wasn't JSON (or was empty) — fall back to a generic, still-safe message.
    return new ApiError(response.status, `İstek başarısız oldu (${response.status}).`);
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
    throw new ApiError(0, 'Sunucuya bağlanılamadı.');
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

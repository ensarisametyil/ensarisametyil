/**
 * Tiny pub-sub so httpClient (which has no knowledge of React) can tell AuthContext "the current
 * token was rejected by the server" without importing it directly. Only fired for a 401 on a
 * request that WAS sending a token (see httpClient) — a 401 from /api/auth/login for a wrong
 * password is a normal, expected error and must not trigger this.
 */
type UnauthorizedListener = () => void;

const listeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitUnauthorized(): void {
  for (const listener of listeners) {
    listener();
  }
}

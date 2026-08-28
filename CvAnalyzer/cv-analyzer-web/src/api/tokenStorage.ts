/**
 * Centralized access token storage — the ONLY place in the app that reads or writes the token.
 * Every other module (httpClient, AuthContext, ...) goes through these three functions instead
 * of touching localStorage directly, so the storage mechanism can be swapped in one place if the
 * tradeoff below is ever revisited.
 *
 * ## Storage decision: localStorage, with documented tradeoffs
 *
 * The backend issues the access token in the JSON body of /api/auth/register and
 * /api/auth/login (not as a Set-Cookie header) — this was a Stage 7 design choice, so an
 * httpOnly cookie (immune to XSS, but requires the server to set/manage the cookie and adds
 * CSRF-protection requirements) isn't an available option without backend changes.
 *
 * Given that contract, the realistic choices are: (a) in-memory only (safest against XSS, but
 * the user is logged out on every page refresh — the reload cost is judged too disruptive for
 * this app), (b) sessionStorage (same XSS exposure as localStorage, but confined to one tab —
 * loses the session across tabs, which isn't obviously an improvement for this app), or
 * (c) localStorage (persists across refreshes and tabs, JS-readable so a successful XSS attack
 * could read it). We chose (c) for the better UX (no forced re-login per refresh) and mitigate
 * the XSS risk the same way the rest of this app already does: React escapes all rendered text
 * by default and the codebase never uses dangerouslySetInnerHTML, the token is never written to
 * the URL/query string, never logged (see httpClient — errors log status/code, never headers or
 * tokens), and it is read from ONE place (this module) rather than passed around ad hoc between
 * components. If this app later handles higher-sensitivity data, revisit in favor of an
 * httpOnly-cookie + CSRF-token backend contract.
 */

const STORAGE_KEY = 'cvAnalyzer.accessToken';

export function getToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can throw (private browsing, disabled storage) — treat as "no token".
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Best-effort — if storage is unavailable the user simply won't stay logged in across reloads.
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage never worked in the first place.
  }
}

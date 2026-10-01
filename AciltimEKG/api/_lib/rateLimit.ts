import type { ApiRequest } from "./http.js";
import { query } from "./db.js";

// Login brute-force protection. Backed by Postgres (not an in-memory Map)
// because serverless function instances are not guaranteed to be reused
// between requests — in-memory counters would reset on every cold start and
// offer no real protection on Vercel.

const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function ensureLoginAttemptsSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      key TEXT PRIMARY KEY,
      failed_count INTEGER NOT NULL DEFAULT 0,
      window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      locked_until TIMESTAMPTZ
    );
  `);
}

/** Vercel's edge sets x-forwarded-for to the real client IP; fall back to the socket address for local dev. */
export function getClientIp(req: ApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (first) return first.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

export async function checkLoginLock(key: string): Promise<{ locked: boolean; retryAfterSeconds: number }> {
  const { rows } = await query<{ locked_until: string | null }>(
    `SELECT locked_until FROM login_attempts WHERE key = $1`,
    [key],
  );
  const lockedUntil = rows[0]?.locked_until ? new Date(rows[0].locked_until).getTime() : 0;
  const remainingMs = lockedUntil - Date.now();
  if (remainingMs > 0) {
    return { locked: true, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
  }
  return { locked: false, retryAfterSeconds: 0 };
}

export async function recordLoginFailure(key: string): Promise<void> {
  const now = Date.now();
  const { rows } = await query<{ failed_count: number; window_started_at: string }>(
    `SELECT failed_count, window_started_at FROM login_attempts WHERE key = $1`,
    [key],
  );
  const existing = rows[0];
  const windowExpired = !existing || now - new Date(existing.window_started_at).getTime() > WINDOW_MS;
  const nextCount = windowExpired ? 1 : existing.failed_count + 1;
  const windowStartedAt = windowExpired ? new Date(now) : new Date(existing.window_started_at);
  const lockedUntil = nextCount >= MAX_ATTEMPTS ? new Date(now + LOCKOUT_MS) : null;

  await query(
    `INSERT INTO login_attempts (key, failed_count, window_started_at, locked_until)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET failed_count = $2, window_started_at = $3, locked_until = $4`,
    [key, nextCount, windowStartedAt, lockedUntil],
  );
}

export async function recordLoginSuccess(key: string): Promise<void> {
  await query(`DELETE FROM login_attempts WHERE key = $1`, [key]);
}

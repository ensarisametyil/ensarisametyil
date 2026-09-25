import { createHmac, timingSafeEqual } from "node:crypto";
import type { ApiRequest, ApiResponse } from "./http";
import { parseCookies, serializeCookie, unauthorized } from "./http";

const COOKIE_NAME = "aciltimekg_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 gün

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET ortam değişkeni tanımlı değil.");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Basit imzalı çerez oturumu — ayrı bir oturum deposu (Redis vb.) gerektirmez. */
export function createSessionToken(username: string): string {
  const payload = JSON.stringify({ u: username, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

function verifySessionToken(token: string): { username: string } | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      u: string;
      exp: number;
    };
    if (Date.now() > payload.exp) return null;
    return { username: payload.u };
  } catch {
    return null;
  }
}

export function setSessionCookie(res: ApiResponse, username: string) {
  const token = createSessionToken(username);
  res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, token, { maxAge: SESSION_MAX_AGE_SECONDS }));
}

export function clearSessionCookie(res: ApiResponse) {
  res.setHeader("Set-Cookie", serializeCookie(COOKIE_NAME, "", { clear: true }));
}

export function getSession(req: ApiRequest): { username: string } | null {
  const cookies = req.cookies ?? parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token);
}

/** Returns the session if valid, otherwise writes a 401 and returns null — callers should `return` immediately when this is null. */
export function requireAuth(req: ApiRequest, res: ApiResponse): { username: string } | null {
  const session = getSession(req);
  if (!session) {
    unauthorized(res, "Oturum bulunamadı, lütfen giriş yapın.");
    return null;
  }
  return session;
}

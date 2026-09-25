import type { IncomingMessage, ServerResponse } from "node:http";

// Minimal req/res helpers shared by every API route. Written against plain
// Node's IncomingMessage/ServerResponse (which is exactly what Vercel's
// Node.js Functions runtime hands your default-exported handler) so these
// routes run unmodified on Vercel and under the local dev shim
// (scripts/dev-api.mjs) alike — no framework dependency either way.

export interface ApiRequest extends IncomingMessage {
  query: Record<string, string>;
  cookies: Record<string, string>;
  body?: unknown;
}

export type ApiResponse = ServerResponse;

export function send(res: ApiResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(payload);
}

export function ok(res: ApiResponse, body: unknown) {
  send(res, 200, body);
}

export function badRequest(res: ApiResponse, message: string) {
  send(res, 400, { error: message });
}

export function unauthorized(res: ApiResponse, message = "Yetkisiz erişim.") {
  send(res, 401, { error: message });
}

export function notFound(res: ApiResponse, message = "Bulunamadı.") {
  send(res, 404, { error: message });
}

export function methodNotAllowed(res: ApiResponse) {
  send(res, 405, { error: "Yöntem desteklenmiyor." });
}

export function serverError(res: ApiResponse, err: unknown) {
  console.error(err);
  send(res, 500, { error: "Sunucu hatası." });
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function serializeCookie(
  name: string,
  value: string,
  opts: { maxAge?: number; clear?: boolean } = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) parts.push("Secure");
  if (opts.clear) {
    parts.push("Max-Age=0");
  } else if (opts.maxAge) {
    parts.push(`Max-Age=${opts.maxAge}`);
  }
  return parts.join("; ");
}

/** Reads and JSON-parses the request body (Vercel's Node runtime does not pre-parse it for you). */
export async function readJsonBody<T = unknown>(req: ApiRequest): Promise<T> {
  if (req.body !== undefined) return req.body as T;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Geçersiz JSON gövdesi.");
  }
}

import http from "node:http";
import { URL } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

// Local-only dev server that runs the exact same `api/**/*.ts` handlers
// Vercel deploys, without needing `vercel dev` (which requires account
// login). Vite's dev server proxies /api/* here (see vite.config.ts).

loadDotEnv();

const PORT = process.env.DEV_API_PORT ? Number(process.env.DEV_API_PORT) : 8787;

/** Minimal .env loader (no dotenv dependency) — reads KEY=VALUE lines from .env into process.env, without overwriting variables already set in the shell. */
function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const routes = {
  "/api/categories": () => import("../api/categories.ts"),
  "/api/topics": () => import("../api/topics.ts"),
  "/api/admin/login": () => import("../api/admin/login.ts"),
  "/api/admin/logout": () => import("../api/admin/logout.ts"),
  "/api/admin/session": () => import("../api/admin/session.ts"),
  "/api/admin/topic": () => import("../api/admin/topic.ts"),
  "/api/admin/reorder": () => import("../api/admin/reorder.ts"),
  "/api/admin/upload": () => import("../api/admin/upload.ts"),
};

function parseCookieHeader(header) {
  const out = {};
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const loader = routes[url.pathname];
  if (!loader) {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Bulunamadı." }));
    return;
  }

  req.query = Object.fromEntries(url.searchParams.entries());
  req.cookies = parseCookieHeader(req.headers.cookie);

  try {
    const mod = await loader();
    await mod.default(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Sunucu hatası." }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`[dev-api] http://localhost:${PORT}`);
});

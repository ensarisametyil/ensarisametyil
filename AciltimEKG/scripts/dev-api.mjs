import http from "node:http";
import { URL } from "node:url";

// Local-only dev server that runs the exact same `api/**/*.ts` handlers
// Vercel deploys, without needing `vercel dev` (which requires account
// login). Vite's dev server proxies /api/* here (see vite.config.ts).

const PORT = process.env.DEV_API_PORT ? Number(process.env.DEV_API_PORT) : 8787;

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

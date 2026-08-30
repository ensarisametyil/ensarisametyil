# CVora AI — Frontend

React + TypeScript + Vite single-page app for CVora AI, an AI-powered CV analysis product.
Upload a CV (PDF/DOCX), get an AI-generated score, strengths/weaknesses, missing keywords and
recommendations, track your analysis history, and manage a Free/Premium subscription via Iyzico.

This is the `cv-analyzer-web` half of the repository; the backend is `CvAnalyzer.Api` (ASP.NET
Core 8) one directory up.

## Requirements

- Node.js 20+
- The backend running locally (see `../CvAnalyzer.Api`) — the app has nothing useful to do
  without it.

## Getting started

```bash
npm install
npm run dev
# http://localhost:5173
```

By default the app talks to the backend at `http://localhost:5285`. Override this by copying
`.env.example` to `.env.local` (gitignored) and setting `VITE_API_BASE_URL`. The backend's CORS
allowlist (`Cors:AllowedOrigins` in `CvAnalyzer.Api/appsettings.json`) must include whatever
origin the frontend actually runs on.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with HMR |
| `npm test` | Run the Vitest suite once (`npx vitest` for watch mode) |
| `npm run lint` | Run oxlint |
| `npx tsc -b` | Type-check the whole project |
| `npm run build` | Type-check, then produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |

## Where things live

- `src/api/` — every backend call goes through here (`httpClient.ts` is the single fetch
  wrapper; one `*Service.ts` file per backend resource).
- `src/context/` + `src/hooks/` — `AuthContext`/`BillingContext`/`I18nContext`, each with a
  matching `use*` hook.
- `src/i18n/` — the Turkish/English/German translation system; see `docs/i18n.md`.
- `src/pages/` — one component per route; `src/components/` — everything reused across pages.
- `src/utils/` — pure helpers (error-message mapping, score tiers, password policy, etc).

## Further reading

Project-wide documentation lives in `../docs/`:

- `frontend.md` — original frontend architecture writeup
- `frontend-authentication.md` / `authentication.md` — auth flow, token storage
- `monetization.md` / `iyzico-integration.md` — Free/Premium plans and the payment integration
- `i18n.md` — the multi-language architecture (supported locales, adding a new one/a new key)
- `production.md` — environment variables and deployment checklist

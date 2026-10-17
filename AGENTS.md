# Overwatch

Automated incident detection and response dashboard. Polls mock telemetry,
detects incidents, sends context to the KEV System One API for decisions
(owner, severity, next action, human escalation), and renders structured
incidents on a dashboard.

## Stack

- TanStack Start (SSR) + TanStack Router file routes, React 19, TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`, no config file)
- Nitro server output; deploys to Railway via Railpack (`railpack.json`)
- PostgreSQL (postgres.js) for the `/api/v1/*` backend; the dashboard
  pipeline still uses in-memory state in `src/lib/incident-state.ts`

## Commands

- `bun install` — install dependencies
- `bun dev` — dev server on :3000
- `bun run build` — production build (vite + nitro)
- `bun start` — serve `.output/server`
- `bun x tsc --noEmit` — typecheck
- `bun run db:migrate` — apply `db/schema.sql` (needs `DATABASE_URL`)
- `bun run db:create-key -- --tenant <slug>` — mint a tenant API key

## Layout

- `src/routes/` — file routes; `api/` endpoints use `Route.server.handlers`
  - `api/v1/` — tenant-scoped backend: `POST/GET /events`,
    `GET /events/:id`, `POST/GET /incidents`, `GET/PATCH/DELETE
    /incidents/:id`, `GET /stats`, `GET /health`
- `src/lib/` — pipeline modules:
  - `telemetry.ts` — sample types, mock source, poller
  - `incident-detector.ts` — batch evaluation → incident candidates
  - `kev-client.ts` — KEV System One API integration
  - `incident-state.ts` — in-memory incident records + action queue
  - `db.ts` — postgres.js pool + `withTenant` (sets `app.tenant_id` for RLS)
  - `api.ts` — API-key auth (sha256 lookup), scopes, CORS, error mapping
  - `rate-limit.ts` — per-key token bucket
  - `events.ts` — event validation, fingerprint dedup, keyset pagination
  - `incident-store.ts` — durable incident CRUD + event links
  - `stats.ts` — tenant rollup for dashboards
- `src/components/` — dashboard panels
- `db/schema.sql` — tables + RLS; `scripts/` — migrate / create-api-key
- Auth: `Authorization: Bearer <key>` or `X-Api-Key`; scopes `ingest`,
  `read`, `write`; per-key RPM limit in `api_keys`

## Pipeline

poller → detector → KEV API → structured decision → incident state +
action queue → dashboard

## Conventions

- `#/*` import alias maps to `src/*`
- Read the KEV API docs before implementing `kev-client.ts` — choice
  sets, score range, and response schema must match the real spec
- Commits: conventional format (`feat:`, `fix:`, `chore:`, `build:`,
  `docs:`, `refactor:`), one logical change each, no attribution trailers

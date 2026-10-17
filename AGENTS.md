# Overwatch

Automated incident detection and response dashboard. Polls mock telemetry,
detects incidents, sends context to the KEV System One API for decisions
(owner, severity, next action, human escalation), and renders structured
incidents on a dashboard.

## Stack

- TanStack Start (SSR) + TanStack Router file routes, React 19, TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`, no config file)
- Nitro server output; deploys to Railway via Railpack
- No database — in-memory state in `src/lib/incident-state.ts`

## Commands

- `bun install` — install dependencies
- `bun dev` — dev server on :3000
- `bun run build` — production build (vite + nitro)
- `bun start` — serve `.output/server`
- `bun x tsc --noEmit` — typecheck

## Env

Copy `.env.example` to `.env` (bun loads it automatically):

- `PORT` — dev/prod port and the watcher's poll target
- `KEV_ENDPOINT` — System One base URL; `/v1/systemone` is appended if missing. Unset = evaluations skipped, incidents still recorded
- `KEV_API_KEY` — optional bearer token (omit for local kev servers)
- `KEV_MODEL` — default `kev-latest`
- `KEV_TIMEOUT_MS`, `POLL_INTERVAL_MS`

## Layout

- `src/routes/` — file routes; `api/` endpoints use `Route.server.handlers`
- `src/lib/` — pipeline modules:
  - `telemetry.ts` — snapshot types, mock source, scenarios
  - `incident-detector.ts` — batch evaluation → incident candidates
  - `kev-client.ts` — KEV System One API integration
  - `incident-state.ts` — incident records + action queue + latest snapshot
  - `watcher.ts` — starts the monitor at boot
  - `incident-monitor.ts` — rolling window, poll loop, KEV evaluation
- `src/server.ts` — server entry; starts the watcher at boot
- `src/components/` — dashboard panels

## Pipeline

poller → detector → KEV API → structured decision → incident state +
action queue → dashboard

## Conventions

- `#/*` import alias maps to `src/*`
- Read the KEV API docs before implementing `kev-client.ts` — choice
  sets, score range, and response schema must match the real spec
- Commits: conventional format (`feat:`, `fix:`, `chore:`, `build:`,
  `docs:`, `refactor:`), one logical change each, no attribution trailers

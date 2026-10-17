# overwatch

Incident commander — automated incident detection and response powered by
KEV System One.

## Getting started

```bash
bun install
bun dev
```

Runs on http://localhost:3000. The dashboard is at `/`; mock telemetry is
served from `/api/telemetry`.

## Stack

TanStack Start (React + TypeScript), Tailwind CSS, Nitro server. Deploys
to Railway via Railpack — `bun run build` then `bun start`.

See [AGENTS.md](./AGENTS.md) for the module layout and pipeline overview.

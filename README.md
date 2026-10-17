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

## Backend API

Tenant-scoped ingestion + incident storage lives under `/api/v1/`:
`POST /events` (browser errors & user reports, deduplicated by
fingerprint), `GET /events`, `POST/GET /incidents`,
`GET/PATCH/DELETE /incidents/:id`, `GET /stats`, `GET /health`.

All endpoints require an API key (`Authorization: Bearer <key>` or
`X-Api-Key`); rows are isolated per tenant by `tenant_id` and Postgres
row-level security.

```bash
docker compose up -d          # local Postgres
cp .env.example .env          # set DATABASE_URL
bun run db:migrate            # apply db/schema.sql
bun run db:create-key -- --tenant acme --name ingest --scopes ingest,read,write
```

## Stack

TanStack Start (React + TypeScript), Tailwind CSS, Nitro server. Deploys
to Railway via Railpack — `bun run build` then `bun start`.

See [AGENTS.md](./AGENTS.md) for the module layout and pipeline overview.

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

## Backend demo

The server starts a 15-second telemetry poller at boot. The detector keeps the latest three minutes of samples. A
service becomes an incident candidate after at least two continuous minutes
of elevated error rate (2% or more), low availability (99% or less), or p95
latency (750 ms or more), with at least five samples, no gap above 45 seconds,
and at least 100 requests per sample. Customer/status reports add context but
do not create an incident without a sustained metric issue. Incidents are
deduplicated per active service issue.

Configure a local Kev server with `KEV_ENDPOINT=http://127.0.0.1:8009` and,
if it requires bearer authentication, `KEV_API_KEY`. `KEV_MODEL` defaults to
`kev-latest`. These values stay on the server. Without `KEV_ENDPOINT`, incidents
are still created with a visible evaluation error and no queued action.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/telemetry` | Return a fresh mock sample and feed the monitor. |
| `POST /api/telemetry` with `{"scenario":"healthy"}` (or `degraded` / `critical`) | Switch the mock source and reset the observation window. |
| `GET /api/incidents` | Return incidents and observation-window status. |
| `POST /api/incidents` | Take a sample now and return the current candidates and incidents. |
| `GET /api/incidents/:id` | Read one incident. |
| `PATCH /api/incidents/:id` with `{"status":"acknowledged"}` or `{"status":"resolved"}` | Update incident status. |
| `POST /api/incidents/:id/evaluate` | Ask Kev to evaluate a stored incident now or retry one without a decision. |
| `GET /api/actions` | Return tasks selected by Kev for agent workers. |
| `POST /api/actions` with `{"id":"...","status":"claimed"}` then `{"id":"...","status":"completed"}` | Claim and complete a queued task. |

Kev returns a team choice, a fractional score on a 0–4 severity rubric, a
next-action choice, and a Noul probability for immediate human intervention.
The action endpoint only records task state; it does not execute rollbacks or
contact an on-call person. Incident and task state is in memory and resets on
server restart.

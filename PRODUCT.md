# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

On-call engineers and the small platform/SRE team that owns a set of web
services (checkout, user, search, inventory, gateway). They open Overwatch
when paged, during a daily reliability check, or while tuning alerting. Many
sessions are short and stressful: confirm whether users are affected, find the
cause, decide the next action.

## Product Purpose

Overwatch is an incident commander: it polls service telemetry, detects
incidents from thresholds and user reports, asks the KEV System One decision
API for owner / severity / next action / human-escalation, and renders
structured incidents plus the queued actions on a dashboard. Success is an
engineer trusting the screen within seconds: what is broken, how badly, who
owns it, what happens next.

## Positioning

Detection and decision in one pipeline: incidents arrive already triaged with
a recommended action and a confidence, rather than as raw alerts the engineer
must interpret.

## Operating Context

- Pipeline: poller -> detector -> KEV API -> structured decision -> in-memory
  incident state + action queue -> dashboard.
- Telemetry today is a mock source (`src/lib/telemetry.ts`) with three
  scenarios: `healthy`, `degraded`, `critical`, five services, and
  enterprise-forum / support-ticket / status-page reports. `/api/telemetry`
  serves it (GET snapshot, POST scenario switch).
- Detector (`incident-detector.ts`) and KEV client (`kev-client.ts`) are stubs.
  Incident state is in-memory (`incident-state.ts`). No database.
- Stack: TanStack Start (SSR, file routes), React 19, TypeScript, Tailwind
  CSS v4, Nitro; deploys to Railway via Railpack. Bun for scripts.
- Conventions (AGENTS.md): `#/*` import alias, conventional commits, one
  logical change per commit, no attribution trailers.

## Capabilities and Constraints

- Information architecture (confirmed): Overview, Incidents (+ detail),
  Error Reports (+ detail), Telemetry, Verification, Reports, Settings
  (site settings; alerts and routing).
- Data shown by the UI comes from the repo's own mock telemetry pipeline and
  derived fixtures. It is illustrative and labeled as such; it is not observed
  production state and must not claim to be.
- KEV decisions appear as "Likely cause" / "Recommended actions" with a
  confidence; the real KEV integration is out of scope for the frontend work
  and remains a stub.
- Light theme only for this pass (confirmed). Dark mode is undecided.
- Dependencies approved for the frontend: `@fontsource-variable/inter`,
  `@fontsource-variable/jetbrains-mono`, `lucide-react`. Charts are
  hand-rolled SVG; no chart library.
- Undecided: authentication, multi-site/multi-environment data, persistence.

## Brand Commitments

- Name: Overwatch. Tagline in use: "Incident commander".
- Binding visual reference: twelve AI-generated mockups in
  `C:\Users\ericy\Downloads\Overwatch_UI_References` (light, left sidebar,
  environment + time-range pickers, stat cards, severity pills, dense tables).
  They set direction, not pixels; their inconsistencies are to be fixed, not
  copied.

## Evidence on Hand

- Mock telemetry values, scenario reports, and service/team names in
  `src/lib/telemetry.ts`.
- KEV decision shape in `src/lib/kev-client.ts` (`owner`, `severity` number,
  `nextAction` enum, `needsHuman`).
- No real incidents, users, customers, SLAs, or uptime figures exist. Any
  shown figure is synthetic.

## Product Principles

1. Severity before everything: the state of the system is readable before any
   label is.
2. Every incident answers four questions in order: what, impact, cause, next.
3. Illustrative data is honest data: synthetic values are plausible and
   labeled, never dressed as production truth.
4. Density is a feature; decoration is not. Operators scan tables and charts,
   they do not read cards.
5. One vocabulary across screens: the same pill, the same table, the same
   chart grammar everywhere.

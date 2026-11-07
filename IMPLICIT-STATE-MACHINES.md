# Implicit State Machine Audit — overwatch

Audit of tracked source files for mutually-exclusive state encoded without a
single declared state model. Report only; no refactoring performed.

Notes on what is *not* a finding: `Incident.status`
(`'open' | 'acknowledged' | 'resolved'`), `QueuedAction.status`
(`'queued' | 'claimed' | 'completed'`), `Scenario`, `KevDecision.nextAction`,
and the KEV answer discriminated unions are declared string unions with
guarded transitions — those are real state models. The findings below are the
places where state lives *across* those fields/collections instead.

## Incident evaluation lifecycle (null/presence + magic error string)

**States.** Each `Incident` simultaneously encodes an operator lifecycle and
an evaluation lifecycle in three separate fields:

- `pending` — `decision === null && evaluationError === undefined`
- `eval-failed` — `decision === null && evaluationError` set (sticky until a
  decision arrives)
- `decided` — `decision !== null`
- crossed with `status`: `open` / `acknowledged` / `resolved`

**Encoded as.** Field presence/absence plus a magic error string, not a
declared state:
`src/lib/incident-state.ts:8-15` (`decision: KevDecision | null`,
`evaluationError?: string`); the sentinel value
`'KEV_ENDPOINT is not configured'` written at
`src/lib/incident-monitor.ts:62` encodes a *config* state as an evaluation
error, while the same fact is separately derived as `kev.configured` at
`src/routes/api/incidents.ts:13`.

**Invalid combos.** Representable but contradictory:

- `decision !== null && evaluationError !== undefined` — "succeeded and
  failed" — reachable because `setIncidentEvaluationError`
  (`src/lib/incident-state.ts:86-89`) has no guard against a decided incident.
- `status === 'resolved' && decision === null` — permanent terminal state the
  UI renders as `Pending` / `Awaiting KEV` forever
  (`src/routes/incidents/index.tsx:18-19`, `src/routes/index.tsx:25-26`).
- `kev.configured === true && evaluationError === 'KEV_ENDPOINT is not
  configured'` — stale error outlives the condition that caused it; it is only
  cleared inside `setIncidentDecision` (`src/lib/incident-state.ts:81`).

**Transitions.**

- create with `decision: null`, `status: 'open'` —
  `src/lib/incident-state.ts:60-71`
- `setIncidentDecision` — refuses silently when `incident.decision` already
  set or `status === 'resolved'` (`src/lib/incident-state.ts:79`); a decision
  that arrives after the operator resolves the incident is *discarded with no
  record* (in-flight `evaluateRecord` at `src/lib/incident-monitor.ts:60-61`
  completes after the PATCH at `src/routes/api/incidents.$incidentId.ts:21`).
- `setIncidentEvaluationError` — unconditional write
  (`src/lib/incident-state.ts:86-89`); also fires for resolved incidents via
  `evaluateRecord`'s catch path because `evaluateRecord` never checks `status`
  (`src/lib/incident-monitor.ts:55-71`).
- `setIncidentStatus` — blocks only `resolved → acknowledged`
  (`src/lib/incident-state.ts:97`); `open → resolved` skips `acknowledged`.
- decision reads: `src/lib/incident-monitor.ts:57,78`;
  `src/routes/api/incidents.$incidentId.evaluate.ts:17`
  (`incident.decision ? 200 : 503`); UI reads at
  `src/routes/incidents/$incidentId.tsx:37,59-66`,
  `src/routes/incidents/index.tsx:19,41`.

**Risk.** High. Resolving an incident while a KEV call is in flight silently
drops the decision (guard at `incident-state.ts:79` swallows it, no error is
recorded); the incident then sits resolved with `decision: null`, so the
dashboard shows "Pending"/"Awaiting KEV" on a closed incident. Sticky
`evaluationError` values can contradict both a later decision and the live
`kev.configured` flag. The "unconfigured" state is encoded twice (env-derived
boolean vs. magic string) and can disagree.

## Per-service detection episode lifecycle (parallel collections)

**States.** For each service name, the monitor tracks an "episode" whose phase
is spread across four module-level structures — no single field says which
phase a service is in:

- `idle` — not in `activeEpisodes`, no non-resolved incident
- `pending-eval` — in `activeEpisodes`, incident with `decision: null`,
  `now >= nextRetryAt[service]`, not in `evaluating`
- `evaluating` — in `evaluating` (in-flight KEV call)
- `retry-cooldown` — `decision: null` and `now < nextRetryAt[service]`
- `decided` — `incident.decision` set (stays in `activeEpisodes` while
  signals persist)
- `resolved-suppressed` — still in `activeEpisodes` but
  `findActiveIncident(service)` returns nothing because the incident was
  resolved; new detections are silently dropped
- eviction — removed from `activeEpisodes` only when the service stops
  appearing in `candidates`

**Encoded as.** `activeEpisodes: Set`, `evaluating: Set`,
`nextRetryAt: Map`, plus incident `status`/`decision` in the store —
`src/lib/incident-monitor.ts:21-24`; "active incident" itself derived as
`status !== 'resolved'` at `src/lib/incident-state.ts:38-43`.

**Invalid combos.**

- `nextRetryAt[service]` in the future *and* `decision` set — written
  unconditionally in `evaluateRecord`'s `finally`
  (`src/lib/incident-monitor.ts:69`), even on success; harmless only because
  the `existing?.decision` check at line 78 happens first.
- `activeEpisodes.has(service)` with only resolved incidents — the suppressed
  state above; nothing in the record says suppression is active.
- `evaluating.has(service)` *and* an operator-triggered evaluate — the second
  call returns early from `evaluateRecord` (line 57) and the API reports
  `503` (`incidents.$incidentId.evaluate.ts:17`) even though evaluation is
  legitimately in progress.

**Transitions.**

- `idle → pending-eval`: `createIncident` + `activeEpisodes.add` —
  `src/lib/incident-monitor.ts:80-81`
- `→ evaluating`: `evaluating.add` — line 58
- `evaluating → decided | cooldown`: `setIncidentDecision` /
  `setIncidentEvaluationError` + `nextRetryAt.set` — lines 61-70
- `* → resolved-suppressed`: `setIncidentStatus(..., 'resolved')` —
  `src/lib/incident-state.ts:91-100`; suppression enforced at
  `src/lib/incident-monitor.ts:77` (asserted by the test at
  `src/lib/incident-monitor.test.ts:34-38`)
- `* → idle`: candidate eviction — `src/lib/incident-monitor.ts:104-107`;
  `resetMonitorWindow` clears `activeEpisodes`/`nextRetryAt` but not
  `evaluating` or stored incidents — lines 128-132

**Risk.** Medium. An `acknowledged` (not resolved) incident absorbs every
future episode for its service forever: `existing?.decision` at line 78
short-circuits detection, so no new incident can be created for that service
while the old one stays open — a later, *different* outage is invisible. The
resolved-suppressed state has the same effect until metrics fully clear.
Both behaviors are enforced by tests, so they are intentional — but they are
encoded across four collections with no name, so the suppression invariant is
easy to break (e.g. an eviction or reset path that forgets one collection).

## Parallel mock incident-status model + Pill string-keyed fallback

**States.** A second, incompatible `Incident` model for the same domain:
`status: 'investigating' | 'monitoring' | 'resolved'` plus a `resolvedAt?`
presence marker — alongside the live `'open' | 'acknowledged' | 'resolved'`
vocabulary. `Pill` additionally recognizes `new`, `grouped`, `ignored`,
`passing`, `failing` — 8 status strings total.

**Encoded as.** `src/lib/mock/incidents.ts:8,18,22` (`IncidentStatus`,
`resolvedAt?: string`); `statusStyles` is `Record<string, ...>` keyed on raw
strings with `?? statusStyles.ignored` silent fallback —
`src/components/ui/Pill.tsx:6,17-26,40`.

**Invalid combos.**

- `status === 'resolved'` with no `resolvedAt` — produced whenever a spec has
  `status: 'resolved'` but no `durationMin`
  (`src/lib/mock/incidents.ts:249-252`).
- Any unknown status string renders as "Ignored" instead of failing
  (`Pill.tsx:40`).
- Mock `decision.severity: 5` values (`mock/incidents.ts:138,173,...`)
  violate the live KEV contract — real responses cap at `0..4`
  (`src/lib/kev-client.ts:141`); the mock model has already drifted.

**Transitions.** Static fixtures only (`SPECS` → `buildIncident`,
`src/lib/mock/incidents.ts:108-236,246-390`); "active" recomputed as
`status !== 'resolved'` at `mock/incidents.ts:411-413`.

**Risk.** Low — currently dead code (no route imports `mock/` or `Pill`;
verified by import grep). If either is rewired, two incompatible incident
status vocabularies and two severity scales coexist with silent fallback
masking bad values.

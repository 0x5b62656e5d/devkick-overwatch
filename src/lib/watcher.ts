// Watcher: the poll loop that drives the pipeline.
// collect snapshot -> detect -> evaluate with KEV -> record incident.

import { collectTelemetry } from './telemetry'
import { detectIncidents } from './incident-detector'
import { evaluateIncident } from './kev-client'
import {
  createIncident,
  hasOpenIncidentFor,
  setLatestSnapshot,
} from './incident-state'

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 10_000)

let timer: ReturnType<typeof setInterval> | null = null
let inFlight = false

async function tick(): Promise<void> {
  if (inFlight) return
  inFlight = true
  try {
    const snapshot = collectTelemetry()
    setLatestSnapshot(snapshot)

    for (const candidate of detectIncidents(snapshot)) {
      if (hasOpenIncidentFor(candidate.service)) continue
      const decision = await evaluateIncident(candidate)
      const incident = createIncident(candidate, decision)
      console.log(
        `[watcher] incident ${incident.id.slice(0, 8)} ${candidate.service}` +
          ` -> ${decision?.nextAction ?? 'no decision'}` +
          ` (sev ${decision?.severity ?? '-'}, human ${decision?.needsHuman ?? '-'})`,
      )
    }
  } finally {
    inFlight = false
  }
}

export function startWatcher(): void {
  if (timer) return
  console.log(`[watcher] polling telemetry every ${POLL_INTERVAL_MS}ms`)
  timer = setInterval(() => void tick(), POLL_INTERVAL_MS)
  void tick()
}

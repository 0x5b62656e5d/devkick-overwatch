import { detectIncidents, DETECTION_WINDOW_MS, type IncidentCandidate } from './incident-detector'
import {
  createIncident,
  findActiveIncident,
  getIncident,
  listIncidents,
  setIncidentDecision,
  setIncidentEvaluationError,
  type Incident,
} from './incident-state'
import { evaluateIncident, type IncidentContext } from './kev-client'
import { collectTelemetry, type TelemetrySnapshot } from './telemetry'

const POLL_INTERVAL_MS = 15_000
const EVALUATION_RETRY_MS = 60_000
const history: TelemetrySnapshot[] = []
const evaluating = new Set<string>()
const activeEpisodes = new Set<string>()
const nextRetryAt = new Map<string, number>()
let poller: ReturnType<typeof setInterval> | undefined

export interface MonitorResult {
  snapshot: TelemetrySnapshot
  candidates: IncidentCandidate[]
  incidents: Incident[]
}

function toContext(candidate: IncidentCandidate): IncidentContext {
  const { snapshot, service } = candidate
  const metrics = snapshot.services.find((item) => item.name === service)
  if (!metrics) throw new Error(`Missing metrics for ${service}`)
  return {
    service,
    signals: candidate.signals,
    windowStart: candidate.windowStart,
    windowEnd: candidate.windowEnd,
    team: metrics.team,
    teams: snapshot.services.map((item) => item.team),
    availability: metrics.availability,
    errorRate: metrics.errorRate,
    latenciesMs: metrics.latenciesMs,
    requestCount: metrics.requestCount,
    reports: snapshot.reports
      .filter((report) => report.service === service)
      .map(({ source, message, timestamp }) => ({ source, message, timestamp })),
  }
}

async function evaluateRecord(incident: Incident, candidate: IncidentCandidate): Promise<void> {
  const service = candidate.service
  if (evaluating.has(service) || incident.decision) return
  evaluating.add(service)
  try {
    const decision = await evaluateIncident(toContext(candidate))
    if (decision) setIncidentDecision(incident.id, decision)
    else setIncidentEvaluationError(incident.id, 'KEV_API_URL is not configured')
  } catch (error) {
    setIncidentEvaluationError(
      incident.id,
      error instanceof Error ? error.message : 'KEV evaluation failed',
    )
  } finally {
    nextRetryAt.set(service, Date.now() + EVALUATION_RETRY_MS)
    evaluating.delete(service)
  }
}

async function evaluateCandidate(candidate: IncidentCandidate): Promise<void> {
  const service = candidate.service
  const existing = findActiveIncident(service)
  if (activeEpisodes.has(service) && !existing) return
  if (existing?.decision || Date.now() < (nextRetryAt.get(service) ?? 0)) return

  const incident = existing ?? createIncident(candidate, null)
  activeEpisodes.add(service)
  await evaluateRecord(incident, candidate)
}

/** Explicit retry for a stored incident; the request does not bypass detection. */
export async function requestIncidentDecision(id: string): Promise<Incident | undefined> {
  const incident = getIncident(id)
  if (!incident) return undefined
  await evaluateRecord(incident, incident.candidate)
  return incident
}

export async function processTelemetrySnapshot(snapshot: TelemetrySnapshot): Promise<MonitorResult> {
  const time = Date.parse(snapshot.timestamp)
  if (!Number.isFinite(time)) throw new Error('Telemetry snapshot has no valid timestamp')
  history.push(snapshot)
  history.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
  while (history.length && time - Date.parse(history[0].timestamp) > DETECTION_WINDOW_MS) {
    history.shift()
  }

  const candidates = detectIncidents(history)
  const activeServices = new Set(candidates.map((candidate) => candidate.service))
  for (const service of activeEpisodes) {
    if (!activeServices.has(service)) activeEpisodes.delete(service)
  }
  await Promise.all(candidates.map(evaluateCandidate))
  return { snapshot, candidates, incidents: listIncidents() }
}

export async function captureTelemetry(): Promise<MonitorResult> {
  startMonitor()
  return processTelemetrySnapshot(collectTelemetry())
}

export function startMonitor(): void {
  if (poller) return
  poller = setInterval(() => {
    void processTelemetrySnapshot(collectTelemetry()).catch((error: unknown) => {
      console.error('Telemetry poll failed', error)
    })
  }, POLL_INTERVAL_MS)
  poller.unref?.()
}

/** A scenario switch starts a new observation window. Existing incidents remain visible. */
export function resetMonitorWindow(): void {
  history.length = 0
  activeEpisodes.clear()
  nextRetryAt.clear()
}

export function getMonitorStatus(): {
  sampleCount: number
  windowStart: string | null
  windowEnd: string | null
  pollIntervalMs: number
} {
  return {
    sampleCount: history.length,
    windowStart: history[0]?.timestamp ?? null,
    windowEnd: history.at(-1)?.timestamp ?? null,
    pollIntervalMs: POLL_INTERVAL_MS,
  }
}

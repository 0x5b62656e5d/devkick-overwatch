import type { TelemetrySnapshot } from './telemetry'

export interface IncidentCandidate {
  service: string
  team: string
  signals: string[]
  snapshot: TelemetrySnapshot
}

const AVAILABILITY_MIN = 0.99
const ERROR_RATE_MAX = 0.02
const LATENCY_MAX_MS = 500

// Evaluate a telemetry snapshot and emit a candidate per service whose
// signals trip a threshold.
export function detectIncidents(snapshot: TelemetrySnapshot): IncidentCandidate[] {
  return snapshot.services.flatMap((service) => {
    const signals: string[] = []

    if (service.availability < AVAILABILITY_MIN) {
      signals.push(`availability ${service.availability} below ${AVAILABILITY_MIN}`)
    }
    if (service.errorRate > ERROR_RATE_MAX) {
      signals.push(`error rate ${service.errorRate} above ${ERROR_RATE_MAX}`)
    }
    const maxLatency = Math.max(...service.latenciesMs)
    if (maxLatency > LATENCY_MAX_MS) {
      signals.push(`latency spike to ${maxLatency}ms`)
    }
    const reports = snapshot.reports.filter((r) => r.service === service.name)
    if (reports.length > 0) {
      signals.push(
        `${reports.length} external report(s): ${reports.map((r) => r.source).join(', ')}`,
      )
    }

    return signals.length
      ? [{ service: service.name, team: service.team, signals, snapshot }]
      : []
  })
}

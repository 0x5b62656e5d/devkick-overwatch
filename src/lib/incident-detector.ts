import type { TelemetrySnapshot } from './telemetry'

export interface IncidentCandidate {
  service: string
  signals: string[]
  snapshot: TelemetrySnapshot
}

// TODO: evaluate each telemetry snapshot and emit candidates when
// thresholds trip (outage, error-rate spike, latency spike, forum surge).
export function detectIncidents(_snapshot: TelemetrySnapshot): IncidentCandidate[] {
  return []
}

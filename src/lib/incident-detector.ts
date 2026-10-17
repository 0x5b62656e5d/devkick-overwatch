import type { TelemetrySample } from './telemetry'

export interface IncidentCandidate {
  service: string
  signals: string[]
  samples: TelemetrySample[]
}

// TODO: evaluate each telemetry batch and emit candidates when
// thresholds trip (outage, error-rate spike, latency spike, forum surge).
export function detectIncidents(_samples: TelemetrySample[]): IncidentCandidate[] {
  return []
}

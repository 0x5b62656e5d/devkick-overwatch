// Telemetry source and poller.
// Owns telemetry types; the poller feeds samples to the incident
// detector at a configurable interval.

export interface TelemetrySample {
  service: string
  timestamp: number
  available: boolean
  errorRate: number
  latencyMs: number
  forumMentions: number
}

// TODO: implement the mock telemetry source (simulated services,
// availability flaps, latency spikes, forum thread counts).
export function collectTelemetry(): TelemetrySample[] {
  return []
}

// TODO: implement the poller — call collectTelemetry() on an interval
// and hand each batch to the incident detector.

import type { TelemetryService, TelemetrySnapshot } from './telemetry'

export const DETECTION_WINDOW_MS = 3 * 60_000
export const SUSTAINED_ISSUE_MS = 2 * 60_000
const MAX_SAMPLE_GAP_MS = 45_000
const MIN_SAMPLES = 5
const MIN_REQUESTS = 100

export interface IncidentCandidate {
  service: string
  team: string
  signals: string[]
  snapshot: TelemetrySnapshot
  windowStart: string
  windowEnd: string
  sampleCount: number
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.ceil(sorted.length * 0.95) - 1]
}

function metricSignals(service: TelemetryService): string[] {
  if (service.requestCount < MIN_REQUESTS) return []

  const signals: string[] = []
  if (service.availability <= 0.99) {
    signals.push(`availability ${(service.availability * 100).toFixed(1)}%`)
  }
  if (service.errorRate >= 0.02) {
    signals.push(`error rate ${(service.errorRate * 100).toFixed(1)}%`)
  }
  const p95 = percentile95(service.latenciesMs)
  if (p95 >= 750) signals.push(`p95 latency ${p95}ms`)
  return signals
}

/** Detect a continuous two-minute metric issue in the latest three minutes. */
export function detectIncidents(history: readonly TelemetrySnapshot[]): IncidentCandidate[] {
  const ordered = [...history]
    .filter((snapshot) => Number.isFinite(Date.parse(snapshot.timestamp)))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
  const latest = ordered.at(-1)
  if (!latest) return []

  const latestTime = Date.parse(latest.timestamp)
  const window = ordered.filter(
    (snapshot) => latestTime - Date.parse(snapshot.timestamp) <= DETECTION_WINDOW_MS,
  )

  return latest.services.flatMap((service) => {
    const streak: Array<{ snapshot: TelemetrySnapshot; signals: string[] }> = []
    let previousTime = latestTime

    for (let index = window.length - 1; index >= 0; index--) {
      const snapshot = window[index]
      const time = Date.parse(snapshot.timestamp)
      if (previousTime - time > MAX_SAMPLE_GAP_MS) break
      const metrics = snapshot.services.find((item) => item.name === service.name)
      const signals = metrics ? metricSignals(metrics) : []
      if (signals.length === 0) break
      streak.push({ snapshot, signals })
      previousTime = time
    }

    if (
      streak.length < MIN_SAMPLES ||
      latestTime - Date.parse(streak.at(-1)!.snapshot.timestamp) < SUSTAINED_ISSUE_MS
    ) {
      return []
    }

    const currentSignals = metricSignals(service)
    const recentReports = latest.reports.filter(
      (report) =>
        report.service === service.name &&
        Number.isFinite(Date.parse(report.timestamp)) &&
        latestTime - Date.parse(report.timestamp) <= DETECTION_WINDOW_MS,
    )
    const descriptions = [...currentSignals]
    if (streak.some((entry) => entry.signals.length > 1)) {
      descriptions.push('multiple metric signals persisted')
    }
    if (recentReports.length > 0) {
      descriptions.push(`${recentReports.length} corroborating customer/status report(s)`)
    }

    return [{
      service: service.name,
      team: service.team,
      signals: descriptions,
      snapshot: latest,
      windowStart: streak.at(-1)!.snapshot.timestamp,
      windowEnd: latest.timestamp,
      sampleCount: streak.length,
    }]
  })
}

import { minutesAgo, mulberry32 } from './clock'
import { incidentCounts } from './incidents'

export type Range = '24h' | '7d' | '30d'
export const RANGES: Range[] = ['24h', '7d', '30d']

const RANGE_SEED: Record<Range, number> = { '24h': 11, '7d': 22, '30d': 33 }
const RANGE_SCALE: Record<Range, number> = { '24h': 1, '7d': 6.4, '30d': 27 }

export interface OverviewMetrics {
  activeIncidents: { value: number; critical: number; warning: number }
  errorEvents: { value: number; deltaPct: number; spark: number[] }
  uptime: { pct: number; downtimeLabel: string; deltaPct: number }
  responseTimeP95: { ms: number; deltaPct: number; spark: number[] }
  requestsPerMinute: { value: number; spark: number[] }
  errorEventsBySeverity: {
    t: string
    critical: number
    error: number
    warning: number
    info: number
  }[]
  responseTimeSeries: { t: string; value: number }[]
  recentActivity: {
    kind: string
    title: string
    detail: string
    at: string
    tone: 'critical' | 'warning' | 'primary' | 'success' | 'muted'
  }[]
}

export function overviewMetrics(range: Range): OverviewMetrics {
  const rand = mulberry32(RANGE_SEED[range])
  const scale = RANGE_SCALE[range]

  // 24 buckets; error events cluster around the active incident window
  // (the checkout outage started ~2h ago in mock time).
  const errorEventsBySeverity = Array.from({ length: 24 }, (_, i) => {
    const minsAgo = range === '24h' ? 1440 - i * 60 : range === '7d' ? 10080 - i * 420 : 43200 - i * 1800
    const t = minutesAgo(minsAgo)
    const hot = range === '24h' && minsAgo <= 150
    const f = () => rand()
    return {
      t,
      critical: hot ? Math.round(60 + f() * 140 * (minsAgo < 90 ? 1 : 0.4)) : Math.round(f() * 4),
      error: Math.round((hot ? 40 : 6) + f() * (hot ? 60 : 18)),
      warning: Math.round((hot ? 25 : 10) + f() * 30),
      info: Math.round(4 + f() * 16),
    }
  })

  const responseTimeSeries = Array.from({ length: 24 }, (_, i) => {
    const minsAgo = range === '24h' ? 1440 - i * 60 : range === '7d' ? 10080 - i * 420 : 43200 - i * 1800
    const hot = range === '24h' && minsAgo <= 150
    const base = hot ? 320 + rand() * 480 : 95 + rand() * 60
    return { t: minutesAgo(minsAgo), value: Math.round(base) }
  })

  const spark = (n: number, base: number, spread: number, tail: number) =>
    Array.from({ length: n }, (_, i) =>
      Math.round(base + rand() * spread + (i >= n - 4 ? tail * (i - n + 4) : 0)),
    )

  const errorSpark = spark(12, 30, 40, range === '24h' ? 90 : 20)

  return {
    activeIncidents: {
      value: incidentCounts().active,
      critical: incidentCounts().active >= 2 ? 2 : incidentCounts().active,
      warning: 1,
    },
    errorEvents: {
      value: Math.round(12_400 * scale),
      deltaPct: range === '24h' ? 218 : range === '7d' ? 34 : -6,
      spark: errorSpark,
    },
    uptime: {
      pct: range === '24h' ? 99.97 : range === '7d' ? 99.94 : 99.9,
      downtimeLabel: range === '24h' ? '7m total downtime' : range === '7d' ? '61m total downtime' : '4h 13m total downtime',
      deltaPct: range === '30d' ? -0.02 : 0.01,
    },
    responseTimeP95: {
      ms: range === '24h' ? 412 : range === '7d' ? 238 : 186,
      deltaPct: range === '24h' ? 64 : range === '7d' ? 12 : -3,
      spark: spark(12, 110, 60, range === '24h' ? 120 : 10),
    },
    requestsPerMinute: {
      value: range === '24h' ? 10_420 : range === '7d' ? 11_050 : 10_980,
      spark: spark(12, 60, 30, -8),
    },
    errorEventsBySeverity,
    responseTimeSeries,
    recentActivity: [
      {
        kind: 'incident',
        title: 'Checkout failing with 500 errors',
        detail: 'INC-4821 · checkout-api · investigating',
        at: minutesAgo(134),
        tone: 'critical',
      },
      {
        kind: 'decision',
        title: 'KEV recommended rollback for INC-4821',
        detail: 'queue-rollback · payments · needs human approval',
        at: minutesAgo(128),
        tone: 'primary',
      },
      {
        kind: 'incident',
        title: 'Gateway rate limiting upstream traffic',
        detail: 'INC-4824 · gateway · investigating',
        at: minutesAgo(58),
        tone: 'critical',
      },
      {
        kind: 'status',
        title: 'Search latency moved to monitoring',
        detail: 'INC-4823 · mitigation applied',
        at: minutesAgo(30),
        tone: 'success',
      },
      {
        kind: 'resolved',
        title: 'Elevated login API errors resolved',
        detail: 'INC-4822 · user-api · 1h 14m duration',
        at: minutesAgo(346),
        tone: 'muted',
      },
      {
        kind: 'report',
        title: 'Support ticket linked to INC-4821',
        detail: '“Payment attempts are timing out for multiple customers.”',
        at: minutesAgo(96),
        tone: 'warning',
      },
    ],
  }
}

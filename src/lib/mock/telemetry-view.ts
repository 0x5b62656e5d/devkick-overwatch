import { minutesAgo, mulberry32 } from './clock'

export interface TelemetryView {
  stats: {
    errorRate: { pct: number; spark: number[] }
    latencyP95: { ms: number; spark: number[] }
    rpm: { value: number; spark: number[] }
    lcp: { s: number; spark: number[] }
    uptime: { pct: number }
  }
  errorRateSeries: { t: string; value: number }[]
  latencySeries: { t: string; value: number }[]
  requestsSeries: { t: string; value: number }[]
  vitals: {
    lcp: { t: string; value: number }[]
    inp: { t: string; value: number }[]
    cls: { t: string; value: number }[]
  }
  uptimeSeries: { t: string; value: number }[]
  topServices: {
    name: string
    color: string
    errorRatePct: number
    deltaPct: number
    rpm: number
    p95ms: number
    trend: number[]
  }[]
}

const SERVICES = [
  { name: 'checkout-api', color: 'var(--color-critical)', err: 18.4, delta: 15.2, rpm: 1200, p95: 1240 },
  { name: 'search-api', color: 'var(--color-warning)', err: 6.1, delta: 4.8, rpm: 900, p95: 1410 },
  { name: 'user-api', color: 'var(--color-primary)', err: 0.8, delta: 0.2, rpm: 2400, p95: 96 },
  { name: 'inventory-api', color: 'var(--color-series-vitals)', err: 0.4, delta: -0.1, rpm: 700, p95: 52 },
  { name: 'gateway', color: 'var(--color-info)', err: 0.2, delta: 0.0, rpm: 5200, p95: 24 },
]

export function telemetryView(): TelemetryView {
  const rand = mulberry32(4242)
  const series = (n: number, f: (i: number) => number) =>
    Array.from({ length: n }, (_, i) => ({ t: minutesAgo(240 - i * 10), value: f(i) }))
  const hot = (t: string) => Date.parse(t) >= Date.parse(minutesAgo(134))

  const errorRateSeries = series(24, () => 0)
  const latencySeries = series(24, () => 0)
  const requestsSeries = series(24, () => 0)
  const uptimeSeries = series(24, () => 0)

  for (let i = 0; i < 24; i++) {
    const t = errorRateSeries[i].t
    const h = hot(t)
    errorRateSeries[i].value = h ? +(8 + rand() * 8).toFixed(1) : +(0.2 + rand() * 0.6).toFixed(1)
    latencySeries[i].value = h ? Math.round(700 + rand() * 900) : Math.round(90 + rand() * 60)
    requestsSeries[i].value = Math.round(9200 + rand() * 2400 - (h ? 1200 : 0))
    uptimeSeries[i].value = h ? +(99.0 + rand() * 0.9).toFixed(2) : +(99.9 + rand() * 0.1).toFixed(2)
  }

  const spark = (base: number, spread: number) =>
    Array.from({ length: 12 }, () => Math.round(base + rand() * spread))

  return {
    stats: {
      errorRate: { pct: 4.8, spark: spark(10, 60) },
      latencyP95: { ms: 412, spark: spark(100, 300) },
      rpm: { value: 10420, spark: spark(60, 30) },
      lcp: { s: 1.9, spark: spark(16, 8) },
      uptime: { pct: 99.97 },
    },
    errorRateSeries,
    latencySeries,
    requestsSeries,
    vitals: {
      lcp: series(24, () => Math.round(1600 + rand() * 800)),
      inp: series(24, () => Math.round(120 + rand() * 90)),
      cls: series(24, () => +(rand() * 0.12).toFixed(3)),
    },
    uptimeSeries,
    topServices: SERVICES.map((s, i) => ({
      name: s.name,
      color: s.color,
      errorRatePct: s.err,
      deltaPct: s.delta,
      rpm: s.rpm,
      p95ms: s.p95,
      trend: Array.from({ length: 12 }, (_, j) => {
        const r = mulberry32(i * 31 + j)
        return Math.round(s.err * 10 * (0.7 + r() * 0.6))
      }),
    })),
  }
}

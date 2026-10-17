import { NOW, minutesAgo, mulberry32 } from './clock'

export function incidentTrends30d() {
  const rand = mulberry32(2024)
  // 30 daily buckets ending today (Oct 17 = NOW), sparse baseline + a spike mid-window
  return Array.from({ length: 30 }, (_, i) => {
    const t = new Date(NOW - (29 - i) * 24 * 3600_000).toISOString()
    const spike = i === 27 ? 8 : i === 28 ? 5 : 0
    return {
      t,
      critical: Math.round(rand() * 1.4 + (spike ? 4 : 0)),
      error: Math.round(1 + rand() * 3 + spike),
      warning: Math.round(1 + rand() * 3),
      info: Math.round(rand() * 2),
    }
  })
}

export function mttrSeries() {
  const rand = mulberry32(3033)
  return Array.from({ length: 24 }, (_, i) => ({
    t: minutesAgo((23 - i) * 180),
    value: Math.round(28 + rand() * 40 - (i > 16 ? 14 : 0)),
  }))
}

export const TOP_PAGES = [
  { page: '/checkout/confirm', events: 9412, deltaPct: 412 },
  { page: '/search', events: 1296, deltaPct: 84 },
  { page: '/login', events: 2204, deltaPct: 190 },
  { page: '/cart', events: 918, deltaPct: 33 },
  { page: '/dashboard', events: 3180, deltaPct: 240 },
]

export const ERROR_CATEGORIES = [
  { label: 'Server', pct: 42, count: 478, color: 'var(--color-critical)' },
  { label: 'Client', pct: 28, count: 319, color: 'var(--color-error)' },
  { label: 'Network', pct: 16, count: 182, color: 'var(--color-warning)' },
  { label: 'Timeouts', pct: 9, count: 102, color: 'var(--color-primary)' },
  { label: 'Validation', pct: 5, count: 58, color: 'var(--color-info)' },
]

export const UPTIME_SUMMARY = [
  { label: 'Overall uptime', value: '99.94%', delta: '+0.01%', good: true },
  { label: 'Checkout uptime', value: '99.21%', delta: '-0.68%', good: false },
  { label: 'Search uptime', value: '99.88%', delta: '-0.04%', good: false },
  { label: 'Gateway uptime', value: '99.99%', delta: '+0.00%', good: true },
]

export const INSIGHTS = [
  {
    tone: 'success' as const,
    title: 'MTTR improved 34% week over week',
    detail: 'Median resolution dropped to 41 minutes after the new runbook rollout.',
  },
  {
    tone: 'primary' as const,
    title: 'Checkout drives 61% of user-facing errors',
    detail: 'Two incidents (INC-4821, INC-4808) account for most of the volume.',
  },
  {
    tone: 'warning' as const,
    title: 'Warning-level incidents are trending up',
    detail: 'Six warnings in 3 days vs a 30-day median of two. Worth a look before they escalate.',
  },
]

export function reportStats() {
  return { totalIncidents: 24, mttr: '41m', uptime: '99.94%', impactedUsers: 8240 }
}

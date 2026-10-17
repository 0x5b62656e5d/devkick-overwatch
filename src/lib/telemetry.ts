// Mock telemetry source.
// Owns telemetry types and scenario state; the poller hands snapshots
// to the incident detector at a configurable interval.

export const SCENARIOS = ['healthy', 'degraded', 'critical'] as const
export type Scenario = (typeof SCENARIOS)[number]

export interface TelemetryService {
  name: string
  team: string
  availability: number
  errorRate: number
  latenciesMs: number[]
  requestCount: number
}

export interface TelemetryReport {
  source: 'enterprise-forum' | 'support-ticket' | 'status-page'
  service: string
  message: string
  timestamp: string
}

export interface TelemetrySnapshot {
  timestamp: string
  scenario: Scenario
  services: TelemetryService[]
  reports: TelemetryReport[]
}

interface ServiceMetrics {
  availability: number
  errorRate: number
  latenciesMs: number[]
  requestCount: number
}

const SERVICES = [
  { name: 'checkout-api', team: 'payments' },
  { name: 'user-api', team: 'identity' },
  { name: 'search-api', team: 'search' },
  { name: 'inventory-api', team: 'inventory' },
  { name: 'gateway', team: 'platform' },
] as const

const BASE: Record<string, ServiceMetrics> = {
  'checkout-api': {
    availability: 0.999,
    errorRate: 0.003,
    latenciesMs: [80, 95, 110, 120, 130, 150],
    requestCount: 1500,
  },
  'user-api': {
    availability: 0.999,
    errorRate: 0.002,
    latenciesMs: [35, 40, 42, 38, 45, 41],
    requestCount: 2400,
  },
  'search-api': {
    availability: 0.998,
    errorRate: 0.004,
    latenciesMs: [60, 75, 90, 110, 140, 180],
    requestCount: 900,
  },
  'inventory-api': {
    availability: 0.999,
    errorRate: 0.002,
    latenciesMs: [25, 30, 35, 32, 40, 38],
    requestCount: 700,
  },
  gateway: {
    availability: 0.9995,
    errorRate: 0.001,
    latenciesMs: [10, 12, 15, 14, 18, 20],
    requestCount: 5200,
  },
}

const SCENARIO_OVERRIDES: Record<Scenario, Record<string, ServiceMetrics>> = {
  healthy: {},
  degraded: {
    'search-api': {
      availability: 0.985,
      errorRate: 0.03,
      latenciesMs: [90, 120, 160, 220, 350, 500],
      requestCount: 950,
    },
    'checkout-api': {
      availability: 0.995,
      errorRate: 0.008,
      latenciesMs: [100, 120, 150, 180, 240, 320],
      requestCount: 1400,
    },
  },
  critical: {
    'checkout-api': {
      availability: 0.91,
      errorRate: 0.18,
      latenciesMs: [120, 145, 180, 950, 1200, 2100],
      requestCount: 1200,
    },
    'search-api': {
      availability: 0.97,
      errorRate: 0.06,
      latenciesMs: [80, 100, 150, 400, 800, 1500],
      requestCount: 900,
    },
  },
}

const SCENARIO_REPORTS: Record<
  Scenario,
  Array<Pick<TelemetryReport, 'source' | 'service' | 'message'>>
> = {
  healthy: [],
  degraded: [
    {
      source: 'enterprise-forum',
      service: 'search-api',
      message: 'Search results are intermittently slow for some tenants.',
    },
    {
      source: 'status-page',
      service: 'search-api',
      message: 'We are investigating elevated search latency.',
    },
  ],
  critical: [
    {
      source: 'enterprise-forum',
      service: 'checkout-api',
      message: 'Customers report that checkout requests are failing.',
    },
    {
      source: 'support-ticket',
      service: 'checkout-api',
      message: 'Payment attempts are timing out for multiple customers.',
    },
  ],
}

let currentScenario: Scenario = 'critical'

export function listScenarios(): Scenario[] {
  return [...SCENARIOS]
}

export function setScenario(scenario: string): scenario is Scenario {
  if (!SCENARIOS.includes(scenario as Scenario)) return false
  currentScenario = scenario as Scenario
  return true
}

const jitter = (value: number, pct: number) =>
  value * (1 + (Math.random() * 2 - 1) * pct)

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const round3 = (value: number) => Math.round(value * 1000) / 1000

export function collectTelemetry(): TelemetrySnapshot {
  const now = Date.now()

  const services = SERVICES.map(({ name, team }) => {
    const metrics = { ...BASE[name], ...SCENARIO_OVERRIDES[currentScenario][name] }
    return {
      name,
      team,
      availability: round3(clamp01(jitter(metrics.availability, 0.002))),
      errorRate: round3(clamp01(jitter(metrics.errorRate, 0.15))),
      latenciesMs: metrics.latenciesMs.map((ms) =>
        Math.max(1, Math.round(jitter(ms, 0.12))),
      ),
      requestCount: Math.max(0, Math.round(jitter(metrics.requestCount, 0.08))),
    }
  })

  const reports = SCENARIO_REPORTS[currentScenario].map((report, i) => ({
    ...report,
    timestamp: new Date(now - i * 60_000).toISOString(),
  }))

  return {
    timestamp: new Date(now).toISOString(),
    scenario: currentScenario,
    services,
    reports,
  }
}

// The server-side poller in incident-monitor.ts consumes these snapshots.

import { minutesAgo, mulberry32 } from './clock'

export type CheckStatus = 'passed' | 'failed' | 'warning'

export interface SyntheticTest {
  id: string
  name: string
  description: string
  lastRunMinAgo: number
  status: CheckStatus
  avgRuntimeS: number
  schedule: string
}

export const TESTS: SyntheticTest[] = [
  { id: 't1', name: 'Homepage load', description: 'GET / returns 200 under 2s', lastRunMinAgo: 12, status: 'passed', avgRuntimeS: 4.1, schedule: 'Every 5 min' },
  { id: 't2', name: 'Login flow', description: 'Sign in, session cookie, dashboard load', lastRunMinAgo: 12, status: 'passed', avgRuntimeS: 9.8, schedule: 'Every 5 min' },
  { id: 't3', name: 'Checkout flow', description: 'Cart → address → payment confirm', lastRunMinAgo: 14, status: 'failed', avgRuntimeS: 12.4, schedule: 'Every 5 min' },
  { id: 't4', name: 'API health', description: 'All five /healthz endpoints return 200', lastRunMinAgo: 11, status: 'passed', avgRuntimeS: 1.6, schedule: 'Every 1 min' },
  { id: 't5', name: 'Sign-up flow', description: 'Register, verify email, first login', lastRunMinAgo: 32, status: 'warning', avgRuntimeS: 15.2, schedule: 'Every 15 min' },
]

export const RUN_HISTORY = [
  { atMin: 11, test: 'API health', status: 'passed' as CheckStatus, runtimeS: 1.5, detail: 'All 5 endpoints 200' },
  { atMin: 12, test: 'Homepage load', status: 'passed' as CheckStatus, runtimeS: 4.0, detail: '200 in 1.9s' },
  { atMin: 12, test: 'Login flow', status: 'passed' as CheckStatus, runtimeS: 9.4, detail: 'All steps passed' },
  { atMin: 14, test: 'Checkout flow', status: 'failed' as CheckStatus, runtimeS: 12.4, detail: 'Step 4/6 — confirm timed out' },
  { atMin: 32, test: 'Sign-up flow', status: 'warning' as CheckStatus, runtimeS: 15.8, detail: 'Slow email verify step' },
  { atMin: 41, test: 'Checkout flow', status: 'failed' as CheckStatus, runtimeS: 12.1, detail: 'Step 4/6 — confirm timed out' },
  { atMin: 56, test: 'API health', status: 'passed' as CheckStatus, runtimeS: 1.4, detail: 'All 5 endpoints 200' },
  { atMin: 62, test: 'Checkout flow', status: 'failed' as CheckStatus, runtimeS: 12.9, detail: 'Step 4/6 — confirm timed out' },
]

export const CHECKOUT_RUN = {
  test: 'Checkout flow',
  status: 'failed' as CheckStatus,
  detail: 'POST /api/checkout returning 500 for some users',
  atMin: 14,
  runtimeS: 12.4,
  steps: [
    { name: 'Load homepage', status: 'passed' as CheckStatus, durationS: 1.9 },
    { name: 'Add item to cart', status: 'passed' as CheckStatus, durationS: 1.4 },
    { name: 'Open checkout', status: 'passed' as CheckStatus, durationS: 2.2 },
    { name: 'Confirm payment', status: 'failed' as CheckStatus, durationS: 5.0, detail: 'Expected 200 but got 500' },
    { name: 'Verify order page', status: 'skipped' as const, durationS: 0 },
    { name: 'Check confirmation email', status: 'passed' as CheckStatus, durationS: 1.9 },
  ],
}

export function verificationStats() {
  const rand = mulberry32(909)
  return {
    passRate: 94.2,
    failedChecks: 3,
    avgRuntimeS: 8.6,
    sparks: {
      pass: Array.from({ length: 12 }, () => Math.round(88 + rand() * 10)),
      failed: Array.from({ length: 12 }, () => Math.round(rand() * 5)),
      runtime: Array.from({ length: 12 }, () => +(6 + rand() * 5).toFixed(1)),
    },
  }
}

export { minutesAgo }

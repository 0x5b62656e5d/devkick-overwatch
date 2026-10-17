import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectIncidents } from './incident-detector'
import type { TelemetrySnapshot } from './telemetry'

const start = Date.parse('2026-01-01T00:00:00.000Z')

function snapshot(offsetMs: number, errorRate: number, requestCount = 1_000): TelemetrySnapshot {
  return {
    timestamp: new Date(start + offsetMs).toISOString(),
    scenario: 'healthy',
    services: [{
      name: 'checkout-api',
      team: 'payments',
      availability: 0.999,
      errorRate,
      latenciesMs: [100, 120, 140],
      requestCount,
    }],
    reports: [{
      source: 'support-ticket',
      service: 'checkout-api',
      message: 'A customer reported a failure',
      timestamp: new Date(start + offsetMs).toISOString(),
    }],
  }
}

test('a sustained two-minute issue creates one candidate with window evidence', () => {
  const history = Array.from({ length: 9 }, (_, index) => snapshot(index * 15_000, 0.08))
  const candidates = detectIncidents(history)
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].service, 'checkout-api')
  assert.equal(candidates[0].sampleCount, 9)
  assert.equal(candidates[0].windowStart, history[0].timestamp)
  assert.equal(candidates[0].windowEnd, history[8].timestamp)
})

test('one spike or a customer report alone is noise', () => {
  const spike = Array.from({ length: 9 }, (_, index) =>
    snapshot(index * 15_000, index === 4 ? 0.08 : 0.003),
  )
  assert.deepEqual(detectIncidents(spike), [])
  assert.deepEqual(detectIncidents(spike.map((item) => ({
    ...item,
    services: item.services.map((service) => ({ ...service, errorRate: 0.003 })),
  }))), [])
})

test('a healthy sample, missing interval, or low request volume breaks the streak', () => {
  const issue = Array.from({ length: 9 }, (_, index) => snapshot(index * 15_000, 0.08))
  assert.deepEqual(detectIncidents(issue.map((item, index) =>
    index === 4 ? snapshot(index * 15_000, 0.003) : item,
  )), [])
  assert.deepEqual(detectIncidents(issue.filter((_, index) => index < 3 || index > 5)), [])
  assert.deepEqual(detectIncidents(issue.map((item, index) =>
    index === 4 ? snapshot(index * 15_000, 0.08, 5) : item,
  )), [])
})

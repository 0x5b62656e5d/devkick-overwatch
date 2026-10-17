import assert from 'node:assert/strict'
import { test } from 'node:test'
import { processTelemetrySnapshot } from './incident-monitor'
import { listActionQueue, listIncidents, setIncidentStatus } from './incident-state'
import type { TelemetrySnapshot } from './telemetry'

function sample(offsetMs: number): TelemetrySnapshot {
  return {
    timestamp: new Date(Date.parse('2026-01-01T00:00:00.000Z') + offsetMs).toISOString(),
    scenario: 'critical',
    services: [{
      name: 'checkout-api',
      team: 'payments',
      availability: 0.91,
      errorRate: 0.18,
      latenciesMs: [100, 900, 1_100],
      requestCount: 1_200,
    }],
    reports: [],
  }
}

test('the monitor creates one incident and does not queue an action without KEV', async () => {
  process.env.KEV_API_URL = ''
  for (let index = 0; index < 9; index++) {
    await processTelemetrySnapshot(sample(index * 15_000))
  }
  assert.equal(listIncidents().length, 1)
  assert.equal(listIncidents()[0].evaluationError, 'KEV_API_URL is not configured')
  assert.equal(listActionQueue().length, 0)

  await processTelemetrySnapshot(sample(135_000))
  assert.equal(listIncidents().length, 1)

  setIncidentStatus(listIncidents()[0].id, 'resolved')
  await processTelemetrySnapshot(sample(150_000))
  assert.equal(listIncidents().length, 1)
})

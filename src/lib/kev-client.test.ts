import assert from 'node:assert/strict'
import { test } from 'node:test'
import { evaluateIncident, type IncidentContext } from './kev-client'

const context: IncidentContext = {
  service: 'checkout-api',
  signals: ['error rate 18.0%'],
  windowStart: '2026-01-01T00:00:00.000Z',
  windowEnd: '2026-01-01T00:02:00.000Z',
  team: 'payments',
  teams: ['payments', 'platform'],
  topology: [
    { service: 'checkout-api', team: 'payments' },
    { service: 'gateway', team: 'platform' },
  ],
  availability: 0.91,
  errorRate: 0.18,
  latenciesMs: [100, 1_000],
  requestCount: 1_200,
  reports: [],
}

test('KEV request and typed response follow the System One contract', async () => {
  const originalFetch = globalThis.fetch
  const originalUrl = process.env.KEV_ENDPOINT
  const originalKey = process.env.KEV_API_KEY
  process.env.KEV_ENDPOINT = 'http://kev.example'
  process.env.KEV_API_KEY = 'test-key'

  try {
    globalThis.fetch = async (input, init) => {
      assert.equal(input, 'http://kev.example/v1/systemone')
      assert.equal(init?.method, 'POST')
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-key')
      const request = JSON.parse(String(init?.body))
      assert.equal(request.model, 'kev-latest')
      assert.equal(request.state.service, 'checkout-api')
      assert.equal(request.questions.owner.type, 'choice')
      assert.equal(request.questions.severity.type, 'score')
      assert.equal(request.questions.severity.criteria.length, 5)
      assert.equal(request.questions.action.type, 'choice')
      assert.equal(request.questions.human.type, 'noul')
      return Response.json({
        model: 'kev-latest',
        answers: {
          owner: { type: 'choice', choice: 'payments', confidence: 0.8, probabilities: { payments: 0.9, platform: 0.1 } },
          severity: { type: 'score', score: 3.25, confidence: 0.7, probabilities: { '0': 0, '1': 0, '2': 0.1, '3': 0.55, '4': 0.35 } },
          action: { type: 'choice', choice: 'escalate-oncall', confidence: 0.6, probabilities: { 'escalate-oncall': 0.8, investigate: 0.2 } },
          human: { type: 'noul', noul: 0.87 },
        },
      })
    }

    const decision = await evaluateIncident(context)
    assert.deepEqual({
      owner: decision?.owner,
      severity: decision?.severity,
      nextAction: decision?.nextAction,
      needsHuman: decision?.needsHuman,
      confidence: decision?.confidence,
    }, {
      owner: 'payments',
      severity: 3.25,
      nextAction: 'escalate-oncall',
      needsHuman: true,
      confidence: 0.6,
    })
    assert.equal(decision?.answers.human.noul, 0.87)
  } finally {
    globalThis.fetch = originalFetch
    if (originalUrl === undefined) delete process.env.KEV_ENDPOINT
    else process.env.KEV_ENDPOINT = originalUrl
    if (originalKey === undefined) delete process.env.KEV_API_KEY
    else process.env.KEV_API_KEY = originalKey
  }
})

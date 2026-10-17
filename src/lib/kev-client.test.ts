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
  availability: 0.91,
  errorRate: 0.18,
  latenciesMs: [100, 1_000],
  requestCount: 1_200,
  reports: [],
}

test('KEV request and typed response follow the System One contract', async () => {
  const originalFetch = globalThis.fetch
  const originalUrl = process.env.KEV_API_URL
  const originalKey = process.env.KEV_API_KEY
  process.env.KEV_API_URL = 'http://kev.example'
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
      assert.equal(request.questions.nextAction.type, 'choice')
      assert.equal(request.questions.needsHuman.type, 'noul')
      return Response.json({
        model: 'kev-latest',
        answers: {
          owner: { type: 'choice', choice: 'payments' },
          severity: { type: 'score', score: 3.25 },
          nextAction: { type: 'choice', choice: 'escalate-oncall' },
          needsHuman: { type: 'noul', noul: 0.87 },
        },
      })
    }

    assert.deepEqual(await evaluateIncident(context), {
      owner: 'payments',
      severity: 3.25,
      nextAction: 'escalate-oncall',
      needsHuman: true,
    })
  } finally {
    globalThis.fetch = originalFetch
    if (originalUrl === undefined) delete process.env.KEV_API_URL
    else process.env.KEV_API_URL = originalUrl
    if (originalKey === undefined) delete process.env.KEV_API_KEY
    else process.env.KEV_API_KEY = originalKey
  }
})

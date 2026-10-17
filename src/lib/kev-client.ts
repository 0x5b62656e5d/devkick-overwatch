export interface IncidentContext {
  service: string
  signals: string[]
  windowStart: string
  windowEnd: string
  team: string
  teams: string[]
  availability: number
  errorRate: number
  latenciesMs: number[]
  requestCount: number
  reports: Array<{ source: string; message: string; timestamp: string }>
}

export interface KevDecision {
  owner: string
  /** Expected position on the ordered 0–4 severity rubric; may be fractional. */
  severity: number
  nextAction: 'investigate' | 'check-dependencies' | 'queue-rollback' | 'escalate-oncall'
  needsHuman: boolean
}

const ACTIONS = {
  investigate: 'Investigate the service and gather more evidence.',
  'check-dependencies': 'Check upstream and downstream dependencies.',
  'queue-rollback': 'Prepare a rollback for human approval.',
  'escalate-oncall': 'Page the on-call human immediately.',
} as const

const SEVERITY_RUBRIC = [
  '0: minor issue with negligible customer impact',
  '1: limited degradation affecting a small share of requests',
  '2: sustained degradation affecting customers',
  '3: major outage or widespread customer impact',
  '4: critical outage of a core service requiring immediate response',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Null means KEV has not been configured; failures throw for the caller to record. */
export async function evaluateIncident(
  context: IncidentContext,
): Promise<KevDecision | null> {
  const baseUrl = process.env.KEV_API_URL
  if (!baseUrl) return null

  const model = process.env.KEV_MODEL || 'kev-latest'
  const teams = [...new Set(context.teams)]
  if (teams.length === 0) throw new Error('No owner choices were provided')

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/systemone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.KEV_API_KEY
        ? { Authorization: `Bearer ${process.env.KEV_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      model,
      state: context,
      questions: {
        owner: {
          type: 'choice',
          instructions: 'Which team should own this incident? Use the service ownership and incident signals.',
          criteria: Object.fromEntries(teams.map((team) => [team, `The ${team} engineering team`])),
        },
        severity: {
          type: 'score',
          instructions: 'Rate customer impact and urgency using the ordered severity rubric.',
          criteria: SEVERITY_RUBRIC,
        },
        nextAction: {
          type: 'choice',
          instructions: 'Choose the single next step. A rollback is only queued for review, not executed.',
          criteria: ACTIONS,
        },
        needsHuman: {
          type: 'noul',
          instructions: 'Does this incident require immediate human intervention?',
        },
      },
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) throw new Error(`KEV request failed with HTTP ${response.status}`)
  const payload: unknown = await response.json()
  if (!isRecord(payload) || !isRecord(payload.answers)) {
    throw new Error('KEV returned an invalid response')
  }

  const { owner, severity, nextAction, needsHuman } = payload.answers
  if (
    !isRecord(owner) || owner.type !== 'choice' ||
    typeof owner.choice !== 'string' || !teams.includes(owner.choice) ||
    !isRecord(severity) || severity.type !== 'score' ||
    typeof severity.score !== 'number' || !Number.isFinite(severity.score) ||
    severity.score < 0 || severity.score > SEVERITY_RUBRIC.length - 1 ||
    !isRecord(nextAction) || nextAction.type !== 'choice' ||
    typeof nextAction.choice !== 'string' || !(nextAction.choice in ACTIONS) ||
    !isRecord(needsHuman) || needsHuman.type !== 'noul' ||
    typeof needsHuman.noul !== 'number' || !Number.isFinite(needsHuman.noul) ||
    needsHuman.noul < 0 || needsHuman.noul > 1
  ) {
    throw new Error('KEV returned an invalid decision')
  }

  return {
    owner: owner.choice,
    severity: severity.score,
    nextAction: nextAction.choice as KevDecision['nextAction'],
    needsHuman: needsHuman.noul >= 0.5,
  }
}

export interface IncidentContext {
  service: string
  signals: string[]
  windowStart: string
  windowEnd: string
  team: string
  teams: string[]
  topology: Array<{ service: string; team: string }>
  availability: number
  errorRate: number
  latenciesMs: number[]
  requestCount: number
  reports: Array<{ source: string; message: string; timestamp: string }>
}

export interface ChoiceAnswer {
  type: 'choice'
  choice: string
  confidence: number
  probabilities: Record<string, number>
}

export interface ScoreAnswer {
  type: 'score'
  score: number
  confidence: number
  probabilities: Record<string, number>
  legend?: Record<string, string>
}

export interface NoulAnswer {
  type: 'noul'
  noul: number
}

export interface KevAnswers {
  owner: ChoiceAnswer
  severity: ScoreAnswer
  action: ChoiceAnswer
  human: NoulAnswer
}

export interface KevDecision {
  owner: string
  /** Expected position on the ordered 0–4 severity rubric; may be fractional. */
  severity: number
  nextAction: 'investigate' | 'check-dependencies' | 'queue-rollback' | 'escalate-oncall'
  needsHuman: boolean
  confidence: number
  answers: KevAnswers
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
  const baseUrl = process.env.KEV_ENDPOINT || process.env.KEV_API_URL
  if (!baseUrl) return null

  const model = process.env.KEV_MODEL || 'kev-9b'
  const teams = [...new Set(context.teams)]
  if (teams.length === 0) throw new Error('No owner choices were provided')
  const teamCriteria = Object.fromEntries(teams.map((team) => [
    team,
    `Owns ${context.topology.filter((item) => item.team === team).map((item) => item.service).join(', ')}`,
  ]))
  const endpoint = baseUrl.replace(/\/+$/, '')
  const url = endpoint.endsWith('/v1/systemone') ? endpoint : `${endpoint}/v1/systemone`
  const timeout = Number(process.env.KEV_TIMEOUT_MS ?? 15_000)
  if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('Invalid KEV_TIMEOUT_MS')

  const response = await fetch(url, {
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
          criteria: teamCriteria,
        },
        severity: {
          type: 'score',
          instructions: 'Rate customer impact and urgency using the ordered severity rubric.',
          criteria: SEVERITY_RUBRIC,
        },
        action: {
          type: 'choice',
          instructions: 'Choose the single next step. A rollback is only queued for review, not executed.',
          criteria: ACTIONS,
        },
        human: {
          type: 'noul',
          instructions: 'Does this incident require immediate human intervention?',
        },
      },
    }),
    signal: AbortSignal.timeout(timeout),
  })

  if (!response.ok) throw new Error(`KEV request failed with HTTP ${response.status}`)
  const payload: unknown = await response.json()
  if (!isRecord(payload) || !isRecord(payload.answers)) {
    throw new Error('KEV returned an invalid response')
  }

  const { owner, severity, action, human } = payload.answers
  if (
    !isRecord(owner) || owner.type !== 'choice' ||
    typeof owner.choice !== 'string' || !teams.includes(owner.choice) ||
    typeof owner.confidence !== 'number' || !Number.isFinite(owner.confidence) ||
    !isRecord(owner.probabilities) ||
    !isRecord(severity) || severity.type !== 'score' ||
    typeof severity.score !== 'number' || !Number.isFinite(severity.score) ||
    severity.score < 0 || severity.score > SEVERITY_RUBRIC.length - 1 ||
    typeof severity.confidence !== 'number' || !Number.isFinite(severity.confidence) ||
    !isRecord(severity.probabilities) ||
    !isRecord(action) || action.type !== 'choice' ||
    typeof action.choice !== 'string' || !(action.choice in ACTIONS) ||
    typeof action.confidence !== 'number' || !Number.isFinite(action.confidence) ||
    !isRecord(action.probabilities) ||
    !isRecord(human) || human.type !== 'noul' ||
    typeof human.noul !== 'number' || !Number.isFinite(human.noul) ||
    human.noul < 0 || human.noul > 1
  ) {
    throw new Error('KEV returned an invalid decision')
  }

  return {
    owner: owner.choice,
    severity: severity.score,
    nextAction: action.choice as KevDecision['nextAction'],
    needsHuman: human.noul >= 0.5,
    confidence: Math.min(owner.confidence, severity.confidence, action.confidence),
    answers: { owner, severity, action, human } as unknown as KevAnswers,
  }
}

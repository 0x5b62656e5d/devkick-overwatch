// KEV System One decision client — TypeSafe System One protocol.
// POST {KEV_ENDPOINT}/v1/systemone with {state, model, questions}.
// choice: criteria maps option -> description, answer is the argmax name
// score:  criteria is ordered level descriptions, answer is the expected
//         level index (float)
// noul:   answer is the probability of yes

import type { IncidentCandidate } from './incident-detector'

const KEV_ENDPOINT = process.env.KEV_ENDPOINT?.replace(/\/+$/, '')
const KEV_API_KEY = process.env.KEV_API_KEY
const KEV_MODEL = process.env.KEV_MODEL ?? 'kev-latest'
const KEV_TIMEOUT_MS = Number(process.env.KEV_TIMEOUT_MS ?? 15_000)

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

interface SystemOneResponse {
  model: string
  answers: KevAnswers
  usage?: { input_tokens: number; output_tokens: number }
  latency_ms?: number
}

export interface KevDecision {
  owner: string
  severity: number
  nextAction: 'investigate' | 'check-dependencies' | 'queue-rollback' | 'escalate-oncall'
  needsHuman: boolean
  confidence: number
  answers: KevAnswers
}

const NEXT_ACTIONS = [
  'investigate',
  'check-dependencies',
  'queue-rollback',
  'escalate-oncall',
] as const

function endpointUrl(): string | null {
  if (!KEV_ENDPOINT) return null
  return KEV_ENDPOINT.endsWith('/v1/systemone')
    ? KEV_ENDPOINT
    : `${KEV_ENDPOINT}/v1/systemone`
}

function buildQuestions(candidate: IncidentCandidate) {
  const teamServices = new Map<string, string[]>()
  for (const s of candidate.snapshot.services) {
    teamServices.set(s.team, [...(teamServices.get(s.team) ?? []), s.name])
  }
  const ownerCriteria = Object.fromEntries(
    [...teamServices].map(([team, services]) => [
      team,
      `owns ${services.join(', ')}`,
    ]),
  )

  return {
    owner: {
      type: 'choice',
      instructions: 'Which engineering team should own this incident?',
      criteria: ownerCriteria,
    },
    severity: {
      type: 'score',
      instructions: 'Rate the severity of this incident by customer impact.',
      criteria: [
        'sev5: no user-facing impact',
        'sev4: minor degradation, workaround exists',
        'sev3: partial outage affecting some users',
        'sev2: major degradation or outage for many users',
        'sev1: critical outage, core flows failing',
      ],
    },
    action: {
      type: 'choice',
      instructions: 'What should happen next in response to this incident?',
      criteria: {
        investigate: 'assign an engineer to investigate logs and traces',
        'check-dependencies': 'check upstream and downstream dependencies for the root cause',
        'queue-rollback': 'queue a rollback of the most recent deploy',
        'escalate-oncall': 'escalate to the on-call engineer immediately',
      },
    },
    human: {
      type: 'noul',
      instructions: 'Does this incident require immediate human intervention?',
      criteria: {
        true: 'a human must intervene right now',
        false: 'automated handling is acceptable for now',
      },
    },
  }
}

function buildState(candidate: IncidentCandidate) {
  const service = candidate.snapshot.services.find(
    (s) => s.name === candidate.service,
  )
  return {
    incident: {
      service: candidate.service,
      owningTeam: candidate.team,
      detectedSignals: candidate.signals,
    },
    metrics: service,
    externalReports: candidate.snapshot.reports
      .filter((r) => r.service === candidate.service)
      .map(({ source, message, timestamp }) => ({ source, message, timestamp })),
    topology: candidate.snapshot.services.map((s) => ({
      service: s.name,
      team: s.team,
    })),
  }
}

let warned = false

export async function evaluateIncident(
  candidate: IncidentCandidate,
): Promise<KevDecision | null> {
  const url = endpointUrl()
  if (!url) {
    if (!warned) {
      console.warn('[kev] KEV_ENDPOINT not set — skipping evaluation')
      warned = true
    }
    return null
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(KEV_API_KEY ? { authorization: `Bearer ${KEV_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        state: buildState(candidate),
        model: KEV_MODEL,
        questions: buildQuestions(candidate),
      }),
      signal: AbortSignal.timeout(KEV_TIMEOUT_MS),
    })

    if (!res.ok) {
      console.error(`[kev] ${res.status}: ${await res.text()}`)
      return null
    }

    const data = (await res.json()) as SystemOneResponse
    const { owner, severity, action, human } = data.answers

    return {
      owner: owner.choice,
      severity: Math.round(severity.score) + 1,
      nextAction: NEXT_ACTIONS.includes(action.choice as never)
        ? (action.choice as KevDecision['nextAction'])
        : 'investigate',
      needsHuman: human.noul >= 0.5,
      confidence: Math.min(
        owner.confidence,
        severity.confidence,
        action.confidence,
      ),
      answers: data.answers,
    }
  } catch (err) {
    console.error('[kev] request failed:', err)
    return null
  }
}

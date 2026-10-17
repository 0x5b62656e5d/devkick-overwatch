import type { IncidentCandidate } from './incident-detector'
import type { KevDecision } from './kev-client'

// In-memory incident state and action queue. Swap for persistent
// storage later — everything else talks to these functions.

export interface Incident {
  id: string
  candidate: IncidentCandidate
  decision: KevDecision | null
  status: 'open' | 'acknowledged' | 'resolved'
  createdAt: number
  evaluationError?: string
}

export interface QueuedAction {
  id: string
  incidentId: string
  action: KevDecision['nextAction']
  owner: string
  status: 'queued' | 'claimed' | 'completed'
  queuedAt: number
}

const incidents = new Map<string, Incident>()
const actionQueue: QueuedAction[] = []

export function listIncidents(): Incident[] {
  return [...incidents.values()]
}

export function getIncident(id: string): Incident | undefined {
  return incidents.get(id)
}

export function findActiveIncident(service: string): Incident | undefined {
  return listIncidents().find(
    (incident) =>
      incident.candidate.service === service && incident.status !== 'resolved',
  )
}

function queueDecision(incident: Incident, decision: KevDecision): void {
  actionQueue.push({
    id: crypto.randomUUID(),
    incidentId: incident.id,
    action: decision.nextAction,
    owner: decision.owner,
    status: 'queued',
    queuedAt: Date.now(),
  })
}

export function createIncident(
  candidate: IncidentCandidate,
  decision: KevDecision | null,
): Incident {
  const incident: Incident = {
    id: crypto.randomUUID(),
    candidate,
    decision,
    status: 'open',
    createdAt: Date.now(),
  }
  incidents.set(incident.id, incident)

  if (decision) queueDecision(incident, decision)

  return incident
}

export function setIncidentDecision(
  id: string,
  decision: KevDecision,
): Incident | undefined {
  const incident = incidents.get(id)
  if (!incident || incident.decision || incident.status === 'resolved') return incident
  incident.decision = decision
  delete incident.evaluationError
  queueDecision(incident, decision)
  return incident
}

export function setIncidentEvaluationError(id: string, message: string): void {
  const incident = incidents.get(id)
  if (incident) incident.evaluationError = message
}

export function setIncidentStatus(
  id: string,
  status: 'acknowledged' | 'resolved',
): Incident | undefined {
  const incident = incidents.get(id)
  if (!incident) return undefined
  if (incident.status === 'resolved' && status === 'acknowledged') return undefined
  incident.status = status
  return incident
}

export function listActionQueue(): QueuedAction[] {
  return [...actionQueue]
}

export function setActionStatus(
  id: string,
  status: 'claimed' | 'completed',
): QueuedAction | undefined {
  const action = actionQueue.find((item) => item.id === id)
  if (!action) return undefined
  if (status === 'claimed' && action.status !== 'queued') return undefined
  if (status === 'completed' && action.status !== 'claimed') return undefined
  action.status = status
  return action
}

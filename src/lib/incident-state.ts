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
}

export interface QueuedAction {
  incidentId: string
  action: KevDecision['nextAction']
  queuedAt: number
}

const incidents = new Map<string, Incident>()
const actionQueue: QueuedAction[] = []

export function listIncidents(): Incident[] {
  return [...incidents.values()]
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

  if (decision) {
    actionQueue.push({
      incidentId: incident.id,
      action: decision.nextAction,
      queuedAt: Date.now(),
    })
  }

  return incident
}

export function listActionQueue(): QueuedAction[] {
  return [...actionQueue]
}

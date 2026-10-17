// KEV System One decision client.
// Read the KEV API docs before implementing — choice sets, score range,
// and the response schema must match the actual spec.

export interface IncidentContext {
  service: string
  signals: string[]
  // TODO: extend with whatever telemetry context KEV expects.
}

export interface KevDecision {
  owner: string
  severity: number
  nextAction: 'investigate' | 'check-dependencies' | 'queue-rollback' | 'escalate-oncall'
  needsHuman: boolean
}

// TODO: send incident context to the KEV System One API and parse the
// response into KevDecision.
export async function evaluateIncident(
  _context: IncidentContext,
): Promise<KevDecision | null> {
  return null
}

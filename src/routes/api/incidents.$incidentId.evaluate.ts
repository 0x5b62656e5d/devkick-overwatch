import { createFileRoute } from '@tanstack/react-router'
import { requestIncidentDecision } from '#/lib/incident-monitor'
import { getIncident } from '#/lib/incident-state'

export const Route = createFileRoute('/api/incidents/$incidentId/evaluate')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const existing = getIncident(params.incidentId)
        if (existing?.status === 'resolved') {
          return Response.json({ error: 'resolved incidents cannot be evaluated' }, { status: 409 })
        }
        const incident = await requestIncidentDecision(params.incidentId)
        if (!incident) {
          return Response.json({ error: 'incident not found' }, { status: 404 })
        }
        return Response.json(incident, { status: incident.decision ? 200 : 503 })
      },
    },
  },
})

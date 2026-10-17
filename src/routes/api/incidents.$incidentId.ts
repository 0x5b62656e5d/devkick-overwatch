import { createFileRoute } from '@tanstack/react-router'
import { getIncident, setIncidentStatus } from '#/lib/incident-state'

export const Route = createFileRoute('/api/incidents/$incidentId')({
  server: {
    handlers: {
      GET: ({ params }) => {
        const incident = getIncident(params.incidentId)
        return incident
          ? Response.json(incident)
          : Response.json({ error: 'incident not found' }, { status: 404 })
      },
      PATCH: async ({ request, params }) => {
        const body = await request.json().catch(() => null)
        if (body?.status !== 'acknowledged' && body?.status !== 'resolved') {
          return Response.json({ error: 'expected status (acknowledged or resolved)' }, { status: 400 })
        }
        if (!getIncident(params.incidentId)) {
          return Response.json({ error: 'incident not found' }, { status: 404 })
        }
        const incident = setIncidentStatus(params.incidentId, body.status)
        return incident
          ? Response.json(incident)
          : Response.json({ error: 'invalid status transition' }, { status: 409 })
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'
import {
  ApiError,
  authenticate,
  corsPreflight,
  json,
  parseJsonBody,
  toResponse,
} from '#/lib/api'
import {
  deleteIncidentRecord,
  getIncidentRecord,
  updateIncidentRecord,
  validateIncidentPatch,
} from '#/lib/incident-store'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validId(id: string): void {
  if (!UUID_RE.test(id)) {
    throw new ApiError(400, 'invalid_id', 'incident id must be a UUID')
  }
}

export const Route = createFileRoute('/api/v1/incidents/$incidentId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { tenantId } = await authenticate(request, 'read')
          validId(params.incidentId)
          const incident = await getIncidentRecord(
            tenantId,
            params.incidentId,
          )
          if (!incident) {
            throw new ApiError(404, 'not_found', 'incident not found')
          }
          return json({ incident })
        } catch (err) {
          return toResponse(err)
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const { tenantId } = await authenticate(request, 'write')
          validId(params.incidentId)
          const patch = validateIncidentPatch(await parseJsonBody(request))
          const incident = await updateIncidentRecord(
            tenantId,
            params.incidentId,
            patch,
          )
          if (!incident) {
            throw new ApiError(404, 'not_found', 'incident not found')
          }
          return json({ incident })
        } catch (err) {
          return toResponse(err)
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const { tenantId } = await authenticate(request, 'write')
          validId(params.incidentId)
          const deleted = await deleteIncidentRecord(
            tenantId,
            params.incidentId,
          )
          if (!deleted) {
            throw new ApiError(404, 'not_found', 'incident not found')
          }
          return json({ deleted: true })
        } catch (err) {
          return toResponse(err)
        }
      },
      OPTIONS: () => corsPreflight(),
    },
  },
})

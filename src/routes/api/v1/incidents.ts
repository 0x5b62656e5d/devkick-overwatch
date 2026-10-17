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
  INCIDENT_STATUSES,
  createIncidentRecord,
  listIncidentRecords,
  validateIncidentInput,
  type IncidentQuery,
  type IncidentStatus,
} from '#/lib/incident-store'

const MAX_LIMIT = 200

function parseQuery(url: URL): IncidentQuery {
  const p = url.searchParams

  const status = p.get('status')
  if (
    status !== null &&
    !(INCIDENT_STATUSES as readonly string[]).includes(status)
  ) {
    throw new ApiError(
      400,
      'invalid_query',
      `'status' must be one of: ${INCIDENT_STATUSES.join(', ')}`,
    )
  }

  const severityRaw = p.get('severity')
  const severity = severityRaw === null ? undefined : Number(severityRaw)
  if (
    severity !== undefined &&
    (!Number.isInteger(severity) || severity < 1 || severity > 5)
  ) {
    throw new ApiError(
      400,
      'invalid_query',
      `'severity' must be an integer between 1 and 5`,
    )
  }

  const limitRaw = p.get('limit')
  const limit = limitRaw === null ? 50 : Number(limitRaw)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new ApiError(
      400,
      'invalid_query',
      `'limit' must be an integer between 1 and ${MAX_LIMIT}`,
    )
  }

  return {
    status: (status ?? undefined) as IncidentStatus | undefined,
    severity,
    limit,
    cursor: p.get('cursor') ?? undefined,
  }
}

export const Route = createFileRoute('/api/v1/incidents')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { tenantId } = await authenticate(request, 'write')
          const input = validateIncidentInput(await parseJsonBody(request))
          const incident = await createIncidentRecord(tenantId, input)
          return json({ incident }, { status: 201 })
        } catch (err) {
          return toResponse(err)
        }
      },
      GET: async ({ request }) => {
        try {
          const { tenantId } = await authenticate(request, 'read')
          const result = await listIncidentRecords(
            tenantId,
            parseQuery(new URL(request.url)),
          )
          return json(result)
        } catch (err) {
          return toResponse(err)
        }
      },
      OPTIONS: () => corsPreflight(),
    },
  },
})

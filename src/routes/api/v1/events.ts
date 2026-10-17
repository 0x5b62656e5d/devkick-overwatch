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
  EVENT_KINDS,
  ingestEvents,
  listEvents,
  validateEventBatch,
  type EventKind,
  type EventQuery,
} from '#/lib/events'

const MAX_LIMIT = 200

function parseQuery(url: URL): EventQuery {
  const p = url.searchParams

  const kind = p.get('kind')
  if (kind !== null && !(EVENT_KINDS as readonly string[]).includes(kind)) {
    throw new ApiError(
      400,
      'invalid_query',
      `'kind' must be one of: ${EVENT_KINDS.join(', ')}`,
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

  const parseDate = (name: string): Date | undefined => {
    const v = p.get(name)
    if (v === null) return undefined
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) {
      throw new ApiError(400, 'invalid_query', `'${name}' is not a valid date`)
    }
    return d
  }

  return {
    kind: (kind ?? undefined) as EventKind | undefined,
    fingerprint: p.get('fingerprint') ?? undefined,
    since: parseDate('since'),
    until: parseDate('until'),
    limit,
    cursor: p.get('cursor') ?? undefined,
  }
}

export const Route = createFileRoute('/api/v1/events')({
  server: {
    handlers: {
      // Ingest browser errors and user reports. Accepts a single event
      // object or { events: [...] } (max 100). Duplicates collapse onto
      // existing rows via fingerprint.
      POST: async ({ request }) => {
        try {
          const { tenantId } = await authenticate(request, 'ingest')
          const events = validateEventBatch(await parseJsonBody(request))
          const result = await ingestEvents(tenantId, events)
          return json(result, { status: 202 })
        } catch (err) {
          return toResponse(err)
        }
      },
      GET: async ({ request }) => {
        try {
          const { tenantId } = await authenticate(request, 'read')
          const result = await listEvents(
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

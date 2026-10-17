import { createFileRoute } from '@tanstack/react-router'
import {
  ApiError,
  authenticate,
  corsPreflight,
  json,
  toResponse,
} from '#/lib/api'
import { getEvent } from '#/lib/events'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/api/v1/events/$eventId')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { tenantId } = await authenticate(request, 'read')
          if (!UUID_RE.test(params.eventId)) {
            throw new ApiError(400, 'invalid_id', 'event id must be a UUID')
          }
          const event = await getEvent(tenantId, params.eventId)
          if (!event) {
            throw new ApiError(404, 'not_found', 'event not found')
          }
          return json({ event })
        } catch (err) {
          return toResponse(err)
        }
      },
      OPTIONS: () => corsPreflight(),
    },
  },
})

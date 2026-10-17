import { createFileRoute } from '@tanstack/react-router'
import {
  getLatestSnapshot,
  listActionQueue,
  listIncidents,
} from '#/lib/incident-state'

export const Route = createFileRoute('/api/incidents')({
  server: {
    handlers: {
      GET: () =>
        Response.json({
          incidents: listIncidents(),
          actionQueue: listActionQueue(),
          snapshot: getLatestSnapshot(),
        }),
    },
  },
})

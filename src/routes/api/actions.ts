import { createFileRoute } from '@tanstack/react-router'
import { listActionQueue, setActionStatus } from '#/lib/incident-state'

export const Route = createFileRoute('/api/actions')({
  server: {
    handlers: {
      GET: () => Response.json({ actions: listActionQueue() }),
      // Agent workers claim a queued task, then mark it completed.
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null)
        if (
          typeof body?.id !== 'string' ||
          (body?.status !== 'claimed' && body?.status !== 'completed')
        ) {
          return Response.json({ error: 'expected id and status (claimed or completed)' }, { status: 400 })
        }
        const action = setActionStatus(body.id, body.status)
        if (!action) {
          return Response.json({ error: 'action not found or invalid transition' }, { status: 409 })
        }
        return Response.json(action)
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'
import { authenticate, corsPreflight, json, toResponse } from '#/lib/api'
import { getTenantStats } from '#/lib/stats'

export const Route = createFileRoute('/api/v1/stats')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { tenantId } = await authenticate(request, 'read')
          return json(await getTenantStats(tenantId))
        } catch (err) {
          return toResponse(err)
        }
      },
      OPTIONS: () => corsPreflight(),
    },
  },
})

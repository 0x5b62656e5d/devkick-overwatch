import { createFileRoute } from '@tanstack/react-router'
import { corsPreflight, json } from '#/lib/api'
import { getDb } from '#/lib/db'

export const Route = createFileRoute('/api/v1/health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          await getDb()`select 1`
          return json({ status: 'ok' })
        } catch (err) {
          return json(
            {
              status: 'unavailable',
              detail: err instanceof Error ? err.message : 'database error',
            },
            { status: 503 },
          )
        }
      },
      OPTIONS: () => corsPreflight(),
    },
  },
})

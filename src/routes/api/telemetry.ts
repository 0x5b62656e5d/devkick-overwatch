import { createFileRoute } from '@tanstack/react-router'
import { collectTelemetry } from '#/lib/telemetry'

export const Route = createFileRoute('/api/telemetry')({
  server: {
    handlers: {
      GET: () => Response.json({ samples: collectTelemetry() }),
    },
  },
})

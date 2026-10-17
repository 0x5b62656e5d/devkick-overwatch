import { createFileRoute } from '@tanstack/react-router'
import { collectTelemetry, listScenarios, setScenario } from '#/lib/telemetry'

export const Route = createFileRoute('/api/telemetry')({
  server: {
    handlers: {
      GET: () => Response.json(collectTelemetry()),
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null)
        if (typeof body?.scenario === 'string' && setScenario(body.scenario)) {
          return Response.json(collectTelemetry())
        }
        return Response.json(
          { error: 'unknown scenario', scenarios: listScenarios() },
          { status: 400 },
        )
      },
    },
  },
})

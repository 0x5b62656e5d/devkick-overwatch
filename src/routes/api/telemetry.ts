import { createFileRoute } from '@tanstack/react-router'
import { listScenarios, setScenario } from '#/lib/telemetry'
import { captureTelemetry, resetMonitorWindow } from '#/lib/incident-monitor'

export const Route = createFileRoute('/api/telemetry')({
  server: {
    handlers: {
      GET: async () => Response.json((await captureTelemetry()).snapshot),
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null)
        if (typeof body?.scenario === 'string' && setScenario(body.scenario)) {
          resetMonitorWindow()
          return Response.json((await captureTelemetry()).snapshot)
        }
        return Response.json(
          { error: 'unknown scenario', scenarios: listScenarios() },
          { status: 400 },
        )
      },
    },
  },
})

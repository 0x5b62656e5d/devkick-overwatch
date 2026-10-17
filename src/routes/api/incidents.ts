import { createFileRoute } from '@tanstack/react-router'
import { captureTelemetry, getMonitorStatus } from '#/lib/incident-monitor'
import { listIncidents } from '#/lib/incident-state'

export const Route = createFileRoute('/api/incidents')({
  server: {
    handlers: {
      GET: async () => {
        await captureTelemetry()
        return Response.json({ incidents: listIncidents(), monitor: getMonitorStatus() })
      },
      // An on-demand sample uses the same sustained-issue gate as the poller.
      POST: async () => {
        const result = await captureTelemetry()
        return Response.json({ ...result, monitor: getMonitorStatus() })
      },
    },
  },
})

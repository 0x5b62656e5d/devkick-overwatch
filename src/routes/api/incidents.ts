import { createFileRoute } from '@tanstack/react-router'
import { captureTelemetry, getMonitorStatus } from '#/lib/incident-monitor'
import { getLatestSnapshot, listActionQueue, listIncidents } from '#/lib/incident-state'

export const Route = createFileRoute('/api/incidents')({
  server: {
    handlers: {
      GET: () => Response.json({
        incidents: listIncidents(),
        actionQueue: listActionQueue(),
        snapshot: getLatestSnapshot(),
        monitor: getMonitorStatus(),
      }),
      // An on-demand sample uses the same sustained-issue gate as the poller.
      POST: async () => {
        const result = await captureTelemetry()
        return Response.json({
          ...result,
          actionQueue: listActionQueue(),
          monitor: getMonitorStatus(),
        })
      },
    },
  },
})

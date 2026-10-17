// Keep the server entry's startup hook while using the single monitor poller.
import { captureTelemetry } from './incident-monitor'

export function startWatcher(): void {
  void captureTelemetry().catch((error: unknown) => {
    console.error('Initial telemetry poll failed', error)
  })
}

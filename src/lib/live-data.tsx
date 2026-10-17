import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Incident, QueuedAction } from './incident-state'
import type { TelemetrySnapshot, Scenario } from './telemetry'

export interface LiveFeed {
  incidents: Incident[]
  actionQueue: QueuedAction[]
  snapshot: TelemetrySnapshot | null
  history: TelemetrySnapshot[]
  kev: { configured: boolean }
  monitor: { sampleCount: number; windowStart: string | null; windowEnd: string | null; pollIntervalMs: number }
}

interface LiveContextValue {
  feed: LiveFeed | null
  error: string | null
  refresh: () => Promise<void>
  changeScenario: (scenario: Scenario) => Promise<void>
  updateIncident: (id: string, status: 'acknowledged' | 'resolved') => Promise<void>
  evaluateIncident: (id: string) => Promise<void>
}

const LiveContext = createContext<LiveContextValue | null>(null)

async function apiRequest(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(path, { ...init, cache: 'no-store' })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || `Request failed (${response.status})`)
  }
  return response
}

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [feed, setFeed] = useState<LiveFeed | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await apiRequest('/api/incidents')
      setFeed(await response.json() as LiveFeed)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load live data')
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 5_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const changeScenario = async (scenario: Scenario) => {
    await apiRequest('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    })
    await refresh()
  }

  const updateIncident = async (id: string, status: 'acknowledged' | 'resolved') => {
    await apiRequest(`/api/incidents/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await refresh()
  }

  const evaluateIncident = async (id: string) => {
    try {
      await apiRequest(`/api/incidents/${encodeURIComponent(id)}/evaluate`, { method: 'POST' })
    } finally {
      await refresh()
    }
  }

  return (
    <LiveContext.Provider value={{ feed, error, refresh, changeScenario, updateIncident, evaluateIncident }}>
      {children}
    </LiveContext.Provider>
  )
}

export function useLiveData(): LiveContextValue {
  const value = useContext(LiveContext)
  if (!value) throw new Error('useLiveData must be used inside LiveDataProvider')
  return value
}

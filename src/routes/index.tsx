import { createFileRoute } from '@tanstack/react-router'
import { ServiceHealth } from '#/components/ServiceHealth'
import { MetricsChart } from '#/components/MetricsChart'
import { IncidentCard } from '#/components/IncidentCard'
import { DecisionHistory } from '#/components/DecisionHistory'

export const Route = createFileRoute('/')({ component: Dashboard })

function Dashboard() {
  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Overwatch</h1>
        <p className="mt-1 text-neutral-400">Incident watcher</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <ServiceHealth />
          <MetricsChart />
          <IncidentCard />
          <DecisionHistory />
        </div>
      </div>
    </main>
  )
}

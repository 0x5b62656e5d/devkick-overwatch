import { createFileRoute } from '@tanstack/react-router'
import { Activity, AlertOctagon, Gauge, Timer } from 'lucide-react'
import { PageHeader } from '#/components/shell/PageHeader'
import { StatCard } from '#/components/ui/StatCard'
import { Card, CardHeader } from '#/components/ui/Card'
import { Select } from '#/components/ui/Select'
import { DataTable, type Column } from '#/components/ui/DataTable'
import { AreaChart } from '#/components/charts/AreaChart'
import { useLiveData } from '#/lib/live-data'
import type { Incident } from '#/lib/incident-state'
import type { TelemetryService, Scenario } from '#/lib/telemetry'
import { formatNumber, formatRelative } from '#/lib/format'

export const Route = createFileRoute('/')({ component: OverviewPage })

function p95(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.ceil(sorted.length * 0.95) - 1]
}

const incidentColumns: Column<Incident>[] = [
  { key: 'service', header: 'Service', render: (i) => <span className="font-mono">{i.candidate.service}</span> },
  { key: 'status', header: 'Status', render: (i) => i.status },
  { key: 'owner', header: 'Owner', render: (i) => i.decision?.owner ?? 'Awaiting KEV' },
  { key: 'severity', header: 'KEV severity', render: (i) => i.decision ? `${i.decision.severity.toFixed(1)} / 4` : 'Pending' },
  { key: 'created', header: 'Detected', render: (i) => formatRelative(new Date(i.createdAt).toISOString(), Date.now()) },
]

const serviceColumns: Column<TelemetryService>[] = [
  { key: 'name', header: 'Service', render: (s) => <span className="font-mono">{s.name}</span> },
  { key: 'team', header: 'Team', render: (s) => s.team },
  { key: 'availability', header: 'Availability', render: (s) => `${(s.availability * 100).toFixed(1)}%` },
  { key: 'errorRate', header: 'Error rate', render: (s) => `${(s.errorRate * 100).toFixed(1)}%` },
  { key: 'p95', header: 'p95 latency', render: (s) => `${p95(s.latenciesMs)}ms` },
  { key: 'requests', header: 'Requests / sample', render: (s) => formatNumber(s.requestCount) },
]

function OverviewPage() {
  const { feed, error, changeScenario } = useLiveData()
  const navigate = Route.useNavigate()
  const snapshot = feed?.snapshot
  const services = snapshot?.services ?? []
  const incidents = [...(feed?.incidents ?? [])].sort((a, b) => b.createdAt - a.createdAt)
  const active = incidents.filter((incident) => incident.status !== 'resolved')
  const totalRequests = services.reduce((sum, service) => sum + service.requestCount, 0)
  const errorRate = totalRequests ? services.reduce((sum, service) => sum + service.requestCount * service.errorRate, 0) / totalRequests : 0
  const availability = totalRequests ? services.reduce((sum, service) => sum + service.requestCount * service.availability, 0) / totalRequests : 0
  const latency = Math.max(0, ...services.map((service) => p95(service.latenciesMs)))
  const history = feed?.history ?? []

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <PageHeader title="Overwatch" description="Live simulated telemetry from the server incident monitor." />
      {error ? <Card><p role="alert" className="text-critical">Backend connection failed: {error}</p></Card> : null}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-ink">Demo controls</p>
            <p className="text-[12px] text-ink-3">Detection needs two minutes of sustained bad samples. Changing scenarios resets the observation window.</p>
          </div>
          <Select aria-label="Telemetry scenario" value={snapshot?.scenario ?? 'critical'} onChange={(event) => void changeScenario(event.target.value as Scenario)} options={[
            { value: 'healthy', label: 'Healthy' }, { value: 'degraded', label: 'Degraded' }, { value: 'critical', label: 'Critical' },
          ]} />
        </div>
        <p className="mt-3 text-[12px] text-ink-3">Last sample: {snapshot ? new Date(snapshot.timestamp).toLocaleTimeString() : 'Waiting for server'} · {feed?.monitor.sampleCount ?? 0} samples in window · KEV: {feed?.kev.configured ? 'configured; see decisions below' : 'not configured'}</p>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard icon={AlertOctagon} label="Active incidents" value={String(active.length)} tone={active.length ? 'critical' : 'success'} href="/incidents" footnote="Detected by the server" />
        <StatCard icon={Activity} label="Error rate" value={`${(errorRate * 100).toFixed(1)}%`} footnote="Weighted by request count" />
        <StatCard icon={Gauge} label="Availability" value={`${(availability * 100).toFixed(1)}%`} footnote="Latest sample" />
        <StatCard icon={Timer} label="Highest service p95" value={`${latency}ms`} footnote="Latest sample" />
      </div>
      <Card>
        <CardHeader title="Error rate over observation window" description="Samples collected by the server in the last three minutes" />
        {history.length > 1 ? <AreaChart yAxisLabel="Error rate (%)" series={services.map((service, index) => ({
          name: service.name,
          data: history.map((sample) => ({ t: sample.timestamp, value: (sample.services.find((item) => item.name === service.name)?.errorRate ?? 0) * 100 })),
          color: ['var(--color-critical)', 'var(--color-primary)', 'var(--color-warning)', 'var(--color-info)', 'var(--color-success)'][index % 5],
          format: (value: number) => `${value.toFixed(0)}%`,
        }))} /> : <p className="text-[13px] text-ink-3">Collecting samples…</p>}
      </Card>
      <Card className="p-0">
        <div className="p-5 pb-0"><CardHeader title="Current service telemetry" description="Simulated API data from the backend" /></div>
        <DataTable columns={serviceColumns} rows={services} rowKey={(service) => service.name} />
      </Card>
      <Card className="p-0">
        <div className="p-5 pb-0"><CardHeader title="Recent detected incidents" description="Created after sustained detection; KEV decisions appear when the remote API responds" /></div>
        <DataTable columns={incidentColumns} rows={incidents.slice(0, 5)} rowKey={(incident) => incident.id} onRowClick={(incident) => navigate({ to: '/incidents/$incidentId', params: { incidentId: incident.id } })} empty={<p className="p-5 text-[13px] text-ink-3">No incidents detected yet.</p>} />
      </Card>
    </div>
  )
}

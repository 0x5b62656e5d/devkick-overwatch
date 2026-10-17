import { createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  Gauge,
  ListFilter,
  MoreHorizontal,
  Timer,
} from 'lucide-react'
import { PageHeader } from '#/components/shell/PageHeader'
import { StatCard } from '#/components/ui/StatCard'
import { Card, CardHeader } from '#/components/ui/Card'
import { Select } from '#/components/ui/Select'
import { Button } from '#/components/ui/Button'
import { Pill } from '#/components/ui/Pill'
import { DataTable, type Column } from '#/components/ui/DataTable'
import { Sparkline } from '#/components/charts/Sparkline'
import { AreaChart } from '#/components/charts/AreaChart'
import { StackedBarChart } from '#/components/charts/StackedBarChart'
import { overviewMetrics, type Range } from '#/lib/mock/overview'
import { listIncidents, type Incident } from '#/lib/mock/incidents'
import { NOW } from '#/lib/mock/clock'
import { formatDuration, formatNumber, formatRelative } from '#/lib/format'

const validateSearch = (s: Record<string, unknown>): { range?: Range } => ({
  range: s.range === '7d' || s.range === '30d' ? s.range : '24h',
})

export const Route = createFileRoute('/')({
  validateSearch,
  component: OverviewPage,
})

function greeting() {
  const h = Number(
    new Date(NOW).toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Los_Angeles' }),
  )
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const incidentColumns: Column<Incident>[] = [
  {
    key: 'status',
    header: 'Status',
    width: '120px',
    render: (i) => <Pill kind="status" value={i.status} />,
  },
  {
    key: 'title',
    header: 'Title',
    render: (i) => (
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-ink">{i.title}</p>
        <p className="font-mono text-[12px] text-ink-3">{i.id}</p>
      </div>
    ),
  },
  {
    key: 'service',
    header: 'Service',
    render: (i) => (
      <span className="rounded-full bg-info-soft px-2 py-0.5 font-mono text-[12px] text-[#475569]">
        {i.service}
      </span>
    ),
  },
  { key: 'severity', header: 'Severity', render: (i) => <Pill kind="severity" value={i.severity} /> },
  {
    key: 'errorEvents',
    header: 'Error events',
    align: 'right',
    sortValue: (i) => i.errorEvents,
    render: (i) => <span className="tnum">{formatNumber(i.errorEvents)}</span>,
  },
  {
    key: 'started',
    header: 'Started',
    sortValue: (i) => i.startedAt,
    render: (i) => <span className="text-ink-3">{formatRelative(i.startedAt, NOW)}</span>,
  },
  {
    key: 'duration',
    header: 'Duration',
    render: (i) => (
      <span className="tnum text-ink-3">
        {i.resolvedAt
          ? formatDuration((Date.parse(i.resolvedAt) - Date.parse(i.startedAt)) / 1000)
          : formatDuration((NOW - Date.parse(i.startedAt)) / 1000)}
      </span>
    ),
  },
  {
    key: 'actions',
    header: '',
    width: '40px',
    render: () => (
      <button
        type="button"
        aria-label="Incident actions"
        onClick={(e) => e.stopPropagation()}
        className="flex h-7 w-7 items-center justify-center rounded-control text-ink-3 hover:bg-surface hover:text-ink-2"
      >
        <MoreHorizontal aria-hidden className="h-4 w-4" />
      </button>
    ),
  },
]

function OverviewPage() {
  const range = Route.useSearch().range ?? '24h'
  const navigate = Route.useNavigate()
  const m = overviewMetrics(range)
  const recent = listIncidents().slice(0, 4)

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <PageHeader
        title={`${greeting()}, Jordan`}
        description={
          m.activeIncidents.value > 0 ? (
            <>
              Your services are mostly healthy.{' '}
              <strong className="font-semibold text-[#991b1b]">
                {m.activeIncidents.value} active incidents
              </strong>{' '}
              need attention.
            </>
          ) : (
            'Everything looks stable.'
          )
        }
      />

      {/* row 1 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={AlertOctagon}
          label="Active incidents"
          value={String(m.activeIncidents.value)}
          tone={m.activeIncidents.value > 0 ? 'critical' : 'neutral'}
          footnote={`${m.activeIncidents.critical} critical · ${m.activeIncidents.warning} warning`}
          href="/incidents"
        >
          <Sparkline data={m.errorEvents.spark} kind="bars" color="var(--color-critical)" label="Active incident history" />
        </StatCard>
        <StatCard
          icon={Activity}
          label="Error events"
          value={formatNumber(m.errorEvents.value)}
          delta={{ value: `${m.errorEvents.deltaPct > 0 ? '+' : ''}${m.errorEvents.deltaPct}%`, direction: 'up', good: m.errorEvents.deltaPct <= 0 }}
          footnote="vs previous period"
        >
          <Sparkline data={m.errorEvents.spark} kind="line" color="var(--color-critical)" label="Error events trend" />
        </StatCard>
        <StatCard
          icon={Gauge}
          label="Uptime"
          value={`${m.uptime.pct}%`}
          tone="success"
          delta={{ value: `${m.uptime.deltaPct > 0 ? '+' : ''}${m.uptime.deltaPct}%`, direction: m.uptime.deltaPct >= 0 ? 'up' : 'down', good: m.uptime.deltaPct >= 0 }}
          footnote={m.uptime.downtimeLabel}
        />
      </div>

      {/* row 2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <StatCard
          icon={Timer}
          label="Response time p95"
          value={`${m.responseTimeP95.ms}ms`}
          delta={{
            value: `${m.responseTimeP95.deltaPct > 0 ? '+' : ''}${m.responseTimeP95.deltaPct}%`,
            direction: m.responseTimeP95.deltaPct >= 0 ? 'up' : 'down',
            good: m.responseTimeP95.deltaPct <= 0,
          }}
          footnote="95th percentile across all requests"
        >
          <Sparkline data={m.responseTimeP95.spark} kind="area" color="var(--color-series-latency)" label="p95 latency trend" />
        </StatCard>
        <StatCard
          icon={ListFilter}
          label="Requests per minute"
          value={formatNumber(m.requestsPerMinute.value)}
          footnote="across all 5 services"
        >
          <Sparkline data={m.requestsPerMinute.spark} kind="bars" color="var(--color-series-requests)" label="Requests per minute" />
        </StatCard>
      </div>

      {/* row 3 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Error events over time"
            description="Total error events grouped by severity"
            action={
              <Select
                aria-label="Severity filter"
                defaultValue="all"
                options={[{ value: 'all', label: 'All severities' }]}
              />
            }
          />
          <StackedBarChart buckets={m.errorEventsBySeverity} />
        </Card>
        <Card>
          <CardHeader
            title="Response time p95"
            description="95th percentile across all requests"
            action={
              <Select
                aria-label="Service filter"
                defaultValue="all"
                options={[{ value: 'all', label: 'All services' }]}
              />
            }
          />
          <AreaChart
            yAxisLabel="Response time p95 (ms)"
            series={[
              {
                name: 'p95',
                data: m.responseTimeSeries,
                color: 'var(--color-series-latency)',
                format: (v) => `${Math.round(v)}ms`,
              },
            ]}
          />
        </Card>
      </div>

      {/* row 4 */}
      <Card className="p-0">
        <div className="p-5 pb-0">
          <CardHeader
            title="Recent incidents"
            description="Latest incidents across your services"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/incidents' })}>
                View all incidents
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Button>
            }
          />
        </div>
        <DataTable
          columns={incidentColumns}
          rows={recent}
          rowKey={(i) => i.id}
          onRowClick={(i) => navigate({ to: '/incidents/$incidentId', params: { incidentId: i.id } })}
        />
      </Card>
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  Download,
  Gauge,
  HeartPulse,
  Info,
  Lightbulb,
  MoreHorizontal,
  OctagonAlert,
  Share2,
  TrendingUp,
  Users,
} from 'lucide-react'
import { PageHeader } from '#/components/shell/PageHeader'
import { StatCard } from '#/components/ui/StatCard'
import { Card, CardHeader } from '#/components/ui/Card'
import { Button } from '#/components/ui/Button'
import { Select } from '#/components/ui/Select'
import { StackedBarChart } from '#/components/charts/StackedBarChart'
import { AreaChart } from '#/components/charts/AreaChart'
import { DonutChart } from '#/components/charts/DonutChart'
import {
  ERROR_CATEGORIES,
  INSIGHTS,
  TOP_PAGES,
  UPTIME_SUMMARY,
  incidentTrends30d,
  mttrSeries,
  reportStats,
} from '#/lib/mock/reports'
import { formatNumber } from '#/lib/format'

export const Route = createFileRoute('/reports')({
  component: ReportsPage,
})

const toneBg = {
  success: 'bg-success-soft',
  primary: 'bg-primary-soft',
  warning: 'bg-warning-soft',
} as const
const toneText = {
  success: 'text-[#166534]',
  primary: 'text-[#1e40af]',
  warning: 'text-[#92400e]',
} as const

function ReportsPage() {
  const stats = reportStats()
  const dayLabel = (t: string) =>
    new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <PageHeader
        title="Reliability insights"
        description="Monitor your application's reliability and performance over time."
        actions={
          <>
            <Button variant="secondary" icon={Share2}>Share report</Button>
            <Button variant="secondary" icon={Download}>Export</Button>
            <button type="button" aria-label="More actions" className="flex h-9 w-9 items-center justify-center rounded-control text-ink-2 hover:bg-sunken">
              <MoreHorizontal aria-hidden className="h-4 w-4" />
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={OctagonAlert} label="Total incidents" value={String(stats.totalIncidents)} tone="critical" footnote="last 30 days" />
        <StatCard icon={Gauge} label="MTTR" value={stats.mttr} delta={{ value: '34%', direction: 'down', good: true }} footnote="median time to resolve" />
        <StatCard icon={HeartPulse} label="Uptime" value={stats.uptime} tone="success" footnote="last 30 days" />
        <StatCard icon={Users} label="Impacted users" value={formatNumber(stats.impactedUsers)} footnote="unique users seeing errors" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader
            title="Incident trends"
            description="Incidents per day over the last 30 days"
            action={
              <div className="flex gap-2">
                <Select aria-label="Group by" defaultValue="day" options={[{ value: 'day', label: 'By day' }]} />
                <Select aria-label="Severity" defaultValue="all" options={[{ value: 'all', label: 'All severities' }]} />
              </div>
            }
          />
          <StackedBarChart buckets={incidentTrends30d()} every={2} xLabel={(b) => dayLabel(b.t)} />
        </Card>
        <Card className="xl:col-span-4">
          <CardHeader title="MTTR over time" description="Median time to resolve" />
          <AreaChart
            yAxisLabel="MTTR (minutes)"
            series={[{ name: 'MTTR', data: mttrSeries(), color: 'var(--color-primary)', format: (v) => `${Math.round(v)}m` }]}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="p-0">
          <div className="p-5 pb-0">
            <CardHeader
              title="Top failing pages"
              action={<Button variant="ghost" size="sm">View all pages<ArrowRight aria-hidden className="h-3.5 w-3.5" /></Button>}
            />
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-2.5 text-[12px] font-medium text-ink-3">Page</th>
                <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-medium text-ink-3">Error events</th>
                <th scope="col" className="px-5 py-2.5 text-right text-[12px] font-medium text-ink-3">Change</th>
              </tr>
            </thead>
            <tbody>
              {TOP_PAGES.map((p) => (
                <tr key={p.page} className="border-b border-line last:border-0 hover:bg-sunken">
                  <td className="px-5 py-3"><code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[12px] text-ink-2">{p.page}</code></td>
                  <td className="tnum px-4 py-3 text-right text-[13px] text-ink-2">{formatNumber(p.events)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`tnum rounded-full px-1.5 py-0.5 text-[12px] font-medium ${p.deltaPct > 100 ? 'bg-critical-soft text-[#991b1b]' : 'bg-warning-soft text-[#92400e]'}`}>
                      +{p.deltaPct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title="Error categories" description="Share of events by category" />
          <DonutChart
            segments={ERROR_CATEGORIES.map((c) => ({ label: c.label, value: c.count, color: c.color }))}
            centerValue="1,139"
            centerLabel="events"
            size={150}
          />
          <ul className="mt-4 space-y-1.5">
            {ERROR_CATEGORIES.map((c) => (
              <li key={c.label} className="flex items-center gap-2 text-[13px] text-ink-2">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                {c.label}
                <span className="tnum ml-auto text-ink-3">{c.pct}% · {formatNumber(c.count)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Uptime summary" description="Per-service availability" />
          <ul className="space-y-3">
            {UPTIME_SUMMARY.map((u) => (
              <li key={u.label} className="flex items-center gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-control ${u.good ? 'bg-success-soft' : 'bg-warning-soft'}`}>
                  <HeartPulse aria-hidden className={`h-4 w-4 ${u.good ? 'text-[#166534]' : 'text-[#92400e]'}`} />
                </span>
                <span className="min-w-0 flex-1 text-[13px] text-ink-2">{u.label}</span>
                <span className="tnum text-[14px] font-semibold text-ink">{u.value}</span>
                <span className={`tnum w-14 text-right text-[12px] ${u.good ? 'text-[#166534]' : 'text-[#92400e]'}`}>{u.delta}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent insights" description="Patterns detected across the last 30 days" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {INSIGHTS.map((i) => (
            <div key={i.title} className={`rounded-card p-4 ${toneBg[i.tone]}`}>
              <p className={`flex items-center gap-2 text-[13px] font-semibold ${toneText[i.tone]}`}>
                {i.tone === 'primary' ? <TrendingUp aria-hidden className="h-4 w-4" /> : i.tone === 'warning' ? <Info aria-hidden className="h-4 w-4" /> : <Lightbulb aria-hidden className="h-4 w-4" />}
                {i.title}
              </p>
              <p className={`mt-1 text-[13px] ${toneText[i.tone]} opacity-90`}>{i.detail}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { Activity, AlertTriangle, Filter, Gauge, HeartPulse, Timer } from 'lucide-react'
import { PageHeader } from '#/components/shell/PageHeader'
import { StatCard } from '#/components/ui/StatCard'
import { Card, CardHeader } from '#/components/ui/Card'
import { Button } from '#/components/ui/Button'
import { Select } from '#/components/ui/Select'
import { Sparkline } from '#/components/charts/Sparkline'
import { AreaChart } from '#/components/charts/AreaChart'
import { telemetryView } from '#/lib/mock/telemetry-view'
import { formatNumber } from '#/lib/format'

export const Route = createFileRoute('/telemetry')({
  component: TelemetryPage,
})

const serviceSelect = (
  <Select aria-label="Service filter" defaultValue="all" options={[{ value: 'all', label: 'All services' }]} />
)

function TelemetryPage() {
  const m = telemetryView()

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <PageHeader
        title="Telemetry"
        description="Real-time insights into your application's performance, reliability, and user experience."
        actions={<Button variant="secondary" icon={Filter}>Add filter</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={AlertTriangle} label="Error rate" value={`${m.stats.errorRate.pct}%`} tone="critical">
          <Sparkline data={m.stats.errorRate.spark} kind="line" color="var(--color-critical)" label="Error rate trend" />
        </StatCard>
        <StatCard icon={Timer} label="Latency p95" value={`${m.stats.latencyP95.ms}ms`}>
          <Sparkline data={m.stats.latencyP95.spark} kind="line" color="var(--color-series-latency)" label="Latency trend" />
        </StatCard>
        <StatCard icon={Activity} label="Requests / min" value={formatNumber(m.stats.rpm.value)}>
          <Sparkline data={m.stats.rpm.spark} kind="bars" color="var(--color-series-requests)" label="Requests trend" />
        </StatCard>
        <StatCard icon={Gauge} label="Web Vitals LCP" value={`${m.stats.lcp.s}s`} tone="success">
          <Sparkline data={m.stats.lcp.spark} kind="line" color="var(--color-success)" label="LCP trend" />
        </StatCard>
        <StatCard icon={HeartPulse} label="Uptime" value={`${m.stats.uptime.pct}%`} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Error rate" description="Errors as a share of requests" action={serviceSelect} />
          <AreaChart
            yAxisLabel="Error rate (%)"
            series={[{ name: 'Error rate', data: m.errorRateSeries, color: 'var(--color-critical)', format: (v) => `${v.toFixed(1)}%` }]}
          />
        </Card>
        <Card>
          <CardHeader title="Latency p95" description="95th percentile response time" action={serviceSelect} />
          <AreaChart
            yAxisLabel="Latency p95 (ms)"
            series={[{ name: 'p95', data: m.latencySeries, color: 'var(--color-series-latency)', format: (v) => `${Math.round(v)}ms` }]}
          />
        </Card>
        <Card>
          <CardHeader title="Requests per minute" description="Total request volume" action={serviceSelect} />
          <AreaChart
            yAxisLabel="Requests per minute"
            series={[{ name: 'Requests', data: m.requestsSeries, color: 'var(--color-series-requests)', kind: 'bars', format: (v) => formatNumber(Math.round(v)) }]}
          />
        </Card>
        <Card>
          <CardHeader title="Web Vitals" description="LCP, INP and CLS across page loads" action={serviceSelect} />
          <AreaChart
            yAxisLabel="Web vitals"
            series={[
              { name: 'LCP ms', data: m.vitals.lcp, color: 'var(--color-success)' },
              { name: 'INP ms', data: m.vitals.inp, color: 'var(--color-primary)' },
              { name: 'CLS ×1000', data: m.vitals.cls.map((d) => ({ ...d, value: d.value * 1000 })), color: 'var(--color-series-vitals)' },
            ]}
          />
          <div className="mt-2 flex gap-4 text-[12px] text-ink-3">
            {[
              ['LCP', 'var(--color-success)'],
              ['INP', 'var(--color-primary)'],
              ['CLS', 'var(--color-series-vitals)'],
            ].map(([l, c]) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Uptime" description="Successful checks share, last 4 hours" action={serviceSelect} />
          <AreaChart
            yAxisLabel="Uptime (%)"
            series={[{ name: 'Uptime', data: m.uptimeSeries, color: 'var(--color-success)', format: (v) => `${v.toFixed(1)}%` }]}
          />
        </Card>
        <Card className="p-0">
          <div className="p-5 pb-0">
            <CardHeader title="Top services by errors" description="Error rate across monitored services" />
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-5 py-2.5 text-[12px] font-medium text-ink-3">Service</th>
                <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-medium text-ink-3">Error rate</th>
                <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-medium text-ink-3">Req/min</th>
                <th scope="col" className="px-4 py-2.5 text-right text-[12px] font-medium text-ink-3">p95</th>
                <th scope="col" className="w-28 px-4 py-2.5 text-[12px] font-medium text-ink-3">Trend</th>
              </tr>
            </thead>
            <tbody>
              {m.topServices.map((s) => (
                <tr key={s.name} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                      <code className="font-mono text-[12px] text-ink-2">{s.name}</code>
                    </span>
                  </td>
                  <td className="tnum px-4 py-3 text-right text-[13px]">
                    {s.errorRatePct}%
                    <span className={`tnum ml-1.5 text-[11px] ${s.deltaPct > 0.5 ? 'text-[#991b1b]' : 'text-ink-3'}`}>
                      {s.deltaPct > 0 ? '+' : ''}{s.deltaPct}%
                    </span>
                  </td>
                  <td className="tnum px-4 py-3 text-right text-[13px] text-ink-2">{formatNumber(s.rpm)}</td>
                  <td className="tnum px-4 py-3 text-right text-[13px] text-ink-2">{s.p95ms}ms</td>
                  <td className="px-4 py-2"><Sparkline data={s.trend} kind="line" height={28} color={s.color} label={`${s.name} error trend`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

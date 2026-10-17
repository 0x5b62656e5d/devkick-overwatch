import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  FileCode2,
  ListChecks,
  MoreHorizontal,
  SearchX,
  Share2,
  Terminal,
  Timer,
  Users,
  X,
} from 'lucide-react'
import { PageHeader } from '#/components/shell/PageHeader'
import { Card, CardHeader } from '#/components/ui/Card'
import { Button } from '#/components/ui/Button'
import { Select } from '#/components/ui/Select'
import { Pill } from '#/components/ui/Pill'
import { StatCard } from '#/components/ui/StatCard'
import { Timeline } from '#/components/ui/Timeline'
import { EmptyState } from '#/components/ui/EmptyState'
import { AreaChart } from '#/components/charts/AreaChart'
import { getIncident, SERVICES } from '#/lib/mock/incidents'
import { NOW } from '#/lib/mock/clock'
import { formatDuration, formatPercent, formatRelative, formatTime, formatNumber } from '#/lib/format'

export const Route = createFileRoute('/incidents/$incidentId')({
  component: IncidentDetailPage,
})

const confidencePill: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-success-soft', text: 'text-[#166534]', label: 'High confidence' },
  medium: { bg: 'bg-warning-soft', text: 'text-[#92400e]', label: 'Medium confidence' },
  low: { bg: 'bg-info-soft', text: 'text-[#475569]', label: 'Low confidence' },
}

function IncidentDetailPage() {
  const { incidentId } = Route.useParams()
  const incident = getIncident(incidentId)

  if (!incident) {
    return (
      <EmptyState
        icon={SearchX}
        title="Incident not found"
        description={`No incident with ID ${incidentId} exists in the mock dataset.`}
        action={
          <Link to="/incidents">
            <Button variant="secondary" size="sm">
              Back to incidents
            </Button>
          </Link>
        }
      />
    )
  }

  const i = incident
  const svc = SERVICES[i.service]
  const elapsed = (NOW - Date.parse(i.startedAt)) / 1000
  const detectedAt = new Date(Date.parse(i.startedAt) + i.timeToDetect * 1000).toISOString()
  const passing = i.verification.filter((v) => v.status === 'passed').length
  const conf = confidencePill[i.likelyCause.confidence]

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <PageHeader
        breadcrumb={[
          { label: 'Incidents', to: '/incidents' },
          { label: i.id },
        ]}
        title={
          <span className="inline-flex items-center gap-2">
            {i.title}
            <ExternalLink aria-hidden className="h-5 w-5 text-ink-3" />
          </span>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="font-mono">{i.id}</span>
            <span aria-hidden>·</span>
            <span>Opened {formatRelative(i.startedAt, NOW)}</span>
            <span aria-hidden>·</span>
            <span>Last updated {formatRelative(minutesAgoFrom(i, 12), NOW)}</span>
            <span aria-hidden>·</span>
            <span>
              {svc.label} (Production)
            </span>
            <button
              type="button"
              aria-label="Copy incident reference"
              className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded text-ink-3 hover:bg-sunken hover:text-ink-2"
            >
              <Copy aria-hidden className="h-3 w-3" />
            </button>
          </span>
        }
        actions={
          <>
            <button
              type="button"
              aria-label="More actions"
              className="flex h-9 w-9 items-center justify-center rounded-control text-ink-2 hover:bg-sunken"
            >
              <MoreHorizontal aria-hidden className="h-4 w-4" />
            </button>
            <Button variant="secondary" icon={Share2}>
              Share
            </Button>
            <Button variant="contrast" icon={Check} disabled={i.status === 'resolved'}>
              {i.status === 'resolved' ? 'Resolved' : 'Resolve incident'}
            </Button>
          </>
        }
      />

      {/* summary strip */}
      <Card>
        <div className="flex flex-wrap items-start gap-3">
          <span className="relative inline-flex">
            <select
              aria-label="Severity"
              defaultValue={i.severity}
              className="h-8 appearance-none rounded-full border border-line bg-surface pl-3 pr-7 text-[13px] font-medium text-ink-2"
            >
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-ink-3" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-ink">{i.summary}</p>
            <p className="mt-1 text-[14px] leading-5 text-ink-2">{i.description}</p>
          </div>
        </div>
      </Card>

      {/* stat row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="User impact"
          value={`~${i.userImpactPct}%`}
          tone={i.userImpactPct >= 10 ? 'critical' : i.userImpactPct > 0 ? 'warning' : 'neutral'}
          footnote={`of ${svc.label.toLowerCase()} requests failing`}
        />
        <StatCard
          icon={Terminal}
          label="Error rate"
          value={formatPercent(i.errorRatePct, 1)}
          delta={{
            value: `+${i.errorRateDeltaPct}%`,
            direction: 'up',
            good: false,
          }}
          footnote={`${formatNumber(i.errorEvents)} events since start`}
        />
        <StatCard
          icon={Timer}
          label="Time to detect"
          value={formatDuration(i.timeToDetect)}
          footnote={`${formatTime(detectedAt)} · via error threshold`}
        />
        <StatCard
          icon={Timer}
          label="Time since start"
          value={formatDuration(elapsed)}
          footnote={`Started at ${formatTime(i.startedAt)}`}
        />
      </div>

      {/* chart + evidence */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader
            title="Error rate & request volume"
            description="Error rate against request volume around the incident window"
            action={
              <Select
                aria-label="Chart range"
                defaultValue="4h"
                options={[{ value: '4h', label: 'Last 4 hours' }]}
              />
            }
          />
          <AreaChart
            yAxisLabel="Error rate (%) and requests"
            series={[
              {
                name: 'Requests',
                data: i.series.map((p) => ({ t: p.t, value: p.requests })),
                color: 'var(--color-series-requests)',
                kind: 'bars',
                axis: 'right',
                format: (v) => `${Math.round(v)}`,
              },
              {
                name: 'Error rate',
                data: i.series.map((p) => ({ t: p.t, value: p.errorRatePct })),
                color: 'var(--color-critical)',
                axis: 'left',
                format: (v) => `${v.toFixed(1)}%`,
              },
            ]}
          />
          <div className="mt-2 flex gap-4">
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-critical" /> Error rate (left)
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-series-requests)' }} /> Requests (right)
            </span>
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader
            title="Evidence"
            description="Signals correlated with this incident"
            action={
              <Button variant="ghost" size="sm">
                View in Error Reports
                <ArrowRight aria-hidden className="h-3.5 w-3.5" />
              </Button>
            }
          />
          <ul className="space-y-3">
            <EvidenceRow
              label="Top error"
              value={i.evidence.topError.type}
              detail={i.evidence.topError.message}
            />
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-info-soft">
                <FileCode2 aria-hidden className="h-4 w-4 text-[#475569]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-info-soft px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#475569]">
                    {i.evidence.endpoint.method}
                  </span>
                  <code className="truncate font-mono text-[13px] text-ink">{i.evidence.endpoint.path}</code>
                  <CopyButton label="endpoint" />
                </div>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  <span className="tnum">{formatNumber(i.evidence.endpoint.failed)}</span> failed of{' '}
                  <span className="tnum">{formatNumber(i.evidence.endpoint.total)}</span> ·{' '}
                  <span className="tnum">{formatPercent(i.evidence.endpoint.errorRatePct, 1)}</span> error rate
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-info-soft">
                <Terminal aria-hidden className="h-4 w-4 text-[#475569]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-info-soft px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#475569]">
                    {i.evidence.exampleRequest.method}
                  </span>
                  <code className="truncate font-mono text-[13px] text-ink">{i.evidence.exampleRequest.path}</code>
                  <CopyButton label="example request" />
                </div>
                <p className="mt-0.5 font-mono text-[12px] text-ink-3">
                  {i.evidence.exampleRequest.fields.join(' · ')}
                </p>
              </div>
            </li>
          </ul>
        </Card>
      </div>

      {/* verification + likely cause */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader
            icon={ListChecks}
            title="Verification results"
            description="Synthetic checks covering the affected flow"
            action={
              <div className="flex items-center gap-2">
                <Pill kind="status" value={passing === i.verification.length ? 'passing' : 'failing'} />
                <span className="tnum text-[12px] text-ink-3">
                  {passing} / {i.verification.length} passing
                </span>
                <Button variant="secondary" size="sm">
                  Re-run checks
                </Button>
              </div>
            }
          />
          <ul className="divide-y divide-line">
            {i.verification.map((v) => (
              <li key={v.name} className="flex items-center gap-3 py-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    v.status === 'passed' ? 'bg-success-soft' : 'bg-critical-soft'
                  }`}
                >
                  {v.status === 'passed' ? (
                    <Check aria-hidden className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <X aria-hidden className="h-3.5 w-3.5 text-critical" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink">{v.name}</p>
                  <p className="text-[12px] text-ink-3">{v.kind}</p>
                </div>
                <span
                  className={`text-[12px] font-medium ${v.status === 'passed' ? 'text-[#166534]' : 'text-[#991b1b]'}`}
                >
                  {v.status === 'passed' ? 'Passed' : 'Failed'} · {v.detail}
                </span>
                <Button variant="ghost" size="sm">
                  View run
                  <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader
            title="Likely cause"
            description="KEV decision · needs human approval"
            action={
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium ${conf.bg} ${conf.text}`}>
                {conf.label}
              </span>
            }
          />
          <p className="text-[14px] font-medium text-ink">{i.likelyCause.title}</p>
          <p className="mt-1.5 text-[13px] leading-5 text-ink-2">{i.likelyCause.explanation}</p>
          <pre className="mt-3 overflow-x-auto rounded-control bg-sunken p-3 font-mono text-[12px] leading-5 text-ink-2">
            {i.likelyCause.stackTrace.join('\n')}
          </pre>
        </Card>
      </div>

      {/* timeline + actions/related */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader title="Timeline" description="Detection and response events" />
          <Timeline items={i.timeline} />
        </Card>
        <div className="flex flex-col gap-4 xl:col-span-5">
          <Card>
            <CardHeader title="Recommended actions" description="Next steps from the KEV decision" />
            <ul className="space-y-2.5">
              {i.recommendedActions.map((a) => (
                <li key={a.label} className="flex items-center gap-3">
                  <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-ink-3" />
                  <span className="min-w-0 flex-1 text-[13px] text-ink-2">{a.label}</span>
                  <Button variant="secondary" size="sm">
                    {a.cta}
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader
              title="Related events"
              action={
                <Button variant="ghost" size="sm">
                  View all
                  <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <ul className="space-y-3">
              {i.related.map((r) => (
                <li key={r.id} className="flex items-center gap-2.5">
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
                  <Link
                    to="/incidents/$incidentId"
                    params={{ incidentId: r.id }}
                    className="shrink-0 font-mono text-[12px] text-primary hover:underline"
                  >
                    {r.id}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{r.title}</span>
                  <span className="shrink-0 text-[12px] text-ink-3">{r.when}</span>
                  <Pill kind="severity" value={r.severity} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

function minutesAgoFrom(i: { resolvedAt?: string; startedAt: string }, mins: number): string {
  const base = i.resolvedAt ? Date.parse(i.resolvedAt) : NOW
  return new Date(base - mins * 60_000).toISOString()
}

function EvidenceRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-critical-soft">
        <Terminal aria-hidden className="h-4 w-4 text-[#991b1b]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-ink-3">{label}</span>
          <code className="truncate font-mono text-[13px] text-ink">{value}</code>
          <CopyButton label={label.toLowerCase()} />
        </div>
        <p className="mt-0.5 text-[12px] text-ink-3">{detail}</p>
      </div>
    </li>
  )
}

function CopyButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-3 hover:bg-sunken hover:text-ink-2"
    >
      <Copy aria-hidden className="h-3 w-3" />
    </button>
  )
}

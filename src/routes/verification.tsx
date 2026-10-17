import { createFileRoute } from '@tanstack/react-router'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  FlaskConical,
  MoreHorizontal,
  Play,
  ShieldCheck,
  Timer,
  X,
} from 'lucide-react'
import { PageHeader } from '#/components/shell/PageHeader'
import { StatCard } from '#/components/ui/StatCard'
import { Card, CardHeader } from '#/components/ui/Card'
import { Button } from '#/components/ui/Button'
import { Select } from '#/components/ui/Select'
import { Pill } from '#/components/ui/Pill'
import { Sparkline } from '#/components/charts/Sparkline'
import { CHECKOUT_RUN, RUN_HISTORY, TESTS, verificationStats } from '#/lib/mock/verification'
import { NOW, minutesAgo } from '#/lib/mock/clock'
import { formatRelative } from '#/lib/format'

export const Route = createFileRoute('/verification')({
  component: VerificationPage,
})

const dotCls: Record<string, string> = {
  passed: 'bg-success',
  failed: 'bg-critical',
  warning: 'bg-warning',
}

function VerificationPage() {
  const stats = verificationStats()
  const run = CHECKOUT_RUN
  const passed = run.steps.filter((s) => s.status === 'passed').length

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <PageHeader
        title="Verification"
        description="Run synthetic tests to verify critical user flows and APIs are working as expected."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={ShieldCheck} label="Pass rate" value={`${stats.passRate}%`} tone="success" footnote="last 24 hours">
          <Sparkline data={stats.sparks.pass} kind="line" color="var(--color-success)" label="Pass rate trend" />
        </StatCard>
        <StatCard icon={FlaskConical} label="Failed checks" value={String(stats.failedChecks)} tone="critical" footnote="checkout flow failing">
          <Sparkline data={stats.sparks.failed} kind="bars" color="var(--color-critical)" label="Failed checks trend" />
        </StatCard>
        <StatCard icon={Timer} label="Average runtime" value={`${stats.avgRuntimeS}s`} footnote="across all tests">
          <Sparkline data={stats.sparks.runtime} kind="line" color="var(--color-primary)" label="Runtime trend" />
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="flex flex-col gap-4 xl:col-span-7">
          <Card className="p-0">
            <div className="p-5 pb-0">
              <CardHeader
                title="Synthetic tests"
                description="Configured checks for critical flows"
                action={<Button icon={Play} size="sm">Run all tests</Button>}
              />
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line">
                  {['Test', 'Last run', 'Status', 'Avg runtime', 'Schedule', ''].map((h, i) => (
                    <th key={i} scope="col" className="px-4 py-2.5 text-[12px] font-medium text-ink-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TESTS.map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-0 hover:bg-sunken">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control ${t.status === 'failed' ? 'bg-critical-soft' : t.status === 'warning' ? 'bg-warning-soft' : 'bg-success-soft'}`}>
                          <FlaskConical aria-hidden className={`h-3.5 w-3.5 ${t.status === 'failed' ? 'text-[#991b1b]' : t.status === 'warning' ? 'text-[#92400e]' : 'text-[#166534]'}`} />
                        </span>
                        <span>
                          <span className="block text-[13px] font-medium text-ink">{t.name}</span>
                          <span className="block text-[12px] text-ink-3">{t.description}</span>
                        </span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[13px] text-ink-2">
                        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dotCls[t.status]}`} />
                        {formatRelative(minutesAgo(t.lastRunMinAgo), NOW)}
                      </span>
                    </td>
                    <td className="px-4 py-3"><Pill kind="status" value={t.status} /></td>
                    <td className="tnum px-4 py-3 text-[13px] text-ink-2">{t.avgRuntimeS}s</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[13px] text-ink-3">{t.schedule}</td>
                    <td className="px-4 py-3">
                      <button type="button" aria-label={`${t.name} actions`} className="flex h-7 w-7 items-center justify-center rounded-control text-ink-3 hover:bg-surface hover:text-ink-2">
                        <MoreHorizontal aria-hidden className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card className="p-0">
            <div className="p-5 pb-0">
              <CardHeader
                title="Test run history"
                description="Recent runs across all synthetic tests"
                action={<Select aria-label="Filter by test" defaultValue="all" options={[{ value: 'all', label: 'All tests' }]} />}
              />
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line">
                  {['Time', 'Test', 'Status', 'Runtime', 'Details'].map((h) => (
                    <th key={h} scope="col" className="px-4 py-2.5 text-[12px] font-medium text-ink-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RUN_HISTORY.map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-0 hover:bg-sunken">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[13px] text-ink-2">
                        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dotCls[r.status]}`} />
                        {formatRelative(minutesAgo(r.atMin), NOW)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] font-medium text-ink">{r.test}</td>
                    <td className="px-4 py-3"><Pill kind="status" value={r.status} /></td>
                    <td className="tnum px-4 py-3 text-[13px] text-ink-2">{r.runtimeS}s</td>
                    <td className="px-4 py-3 text-[13px] text-ink-3">{r.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card>
            <CardHeader
              title="Recent verification evidence"
              description="Latest run with captured steps"
              action={
                <div className="flex items-center gap-2">
                  <Select aria-label="Test" defaultValue="checkout" options={[{ value: 'checkout', label: 'Checkout flow' }]} />
                  <span className="inline-flex items-center text-[12px] text-ink-3">
                    Latest run
                    <button type="button" aria-label="Previous run" className="ml-1 flex h-6 w-6 items-center justify-center rounded text-ink-3 hover:bg-sunken"><ChevronLeft aria-hidden className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="Next run" className="flex h-6 w-6 items-center justify-center rounded text-ink-3 hover:bg-sunken"><ChevronRight aria-hidden className="h-3.5 w-3.5" /></button>
                  </span>
                </div>
              }
            />
            <div className="rounded-control bg-critical-soft p-3">
              <p className="flex items-center gap-2 text-[13px] font-medium text-[#991b1b]">
                <X aria-hidden className="h-4 w-4" />
                Failed · {run.detail}
              </p>
              <p className="mt-0.5 text-[12px] text-[#b91c1c]/80">
                {formatRelative(minutesAgo(run.atMin), NOW)} · {run.runtimeS}s
              </p>
            </div>

            <div className="mt-3 flex aspect-video items-center justify-center rounded-control bg-sunken">
              <Button variant="secondary" icon={Play} size="sm">Play run recording</Button>
            </div>

            <div className="mt-4">
              <p className="mb-2 flex items-center justify-between text-[13px] font-medium text-ink">
                Step results
                <span className="tnum text-[12px] font-normal text-ink-3">{passed} of {run.steps.length} passed</span>
              </p>
              <div className="flex gap-1">
                {run.steps.map((s, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className={`h-1.5 flex-1 rounded-full ${s.status === 'passed' ? 'bg-success' : s.status === 'failed' ? 'bg-critical' : 'bg-line'}`}
                  />
                ))}
              </div>
              <ol className="mt-3 space-y-2.5">
                {run.steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    {s.status === 'passed' ? (
                      <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : s.status === 'failed' ? (
                      <X aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
                    ) : (
                      <Circle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-line-strong" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline justify-between text-[13px] text-ink-2">
                        {s.name}
                        <span className="tnum text-[12px] text-ink-3">{s.durationS ? `${s.durationS}s` : '—'}</span>
                      </p>
                      {s.detail ? <p className="mt-0.5 text-[12px] text-[#991b1b]">{s.detail}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Copy,
  Monitor,
  MoreHorizontal,
  Play,
  SearchX,
  Share2,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Card, CardHeader } from '#/components/ui/Card'
import { Button } from '#/components/ui/Button'
import { Pill } from '#/components/ui/Pill'
import { Tabs } from '#/components/ui/Tabs'
import { EmptyState } from '#/components/ui/EmptyState'
import { getErrorReport } from '#/lib/mock/errors'
import { NOW, minutesAgo } from '#/lib/mock/clock'
import { formatNumber, formatRelative } from '#/lib/format'

export const Route = createFileRoute('/errors/$errorId')({
  component: ErrorDetailPage,
})

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[13px] text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] text-ink-2">{children}</dd>
    </div>
  )
}

function ErrorDetailPage() {
  const { errorId } = Route.useParams()
  const report = getErrorReport(errorId)
  const [tab, setTab] = useState('stack')
  const [replayTab, setReplayTab] = useState('replay')
  const [stackView, setStackView] = useState('original')

  if (!report) {
    return (
      <EmptyState
        icon={SearchX}
        title="Error report not found"
        description={`No error report with ID ${errorId} exists in the mock dataset.`}
        action={
          <Link to="/errors">
            <Button variant="secondary" size="sm">Back to error reports</Button>
          </Link>
        }
      />
    )
  }

  const r = report
  const firstSeen = minutesAgo(r.firstSeenMinAgo)
  const lastSeen = minutesAgo(r.lastSeenMinAgo)

  const stats: [string, string][] = [
    ['Users impacted', formatNumber(r.usersImpacted)],
    ['Total events', formatNumber(r.count)],
    ['Affected sessions', formatNumber(r.affectedSessions)],
    ['First seen', formatRelative(firstSeen, NOW)],
    ['Last seen', formatRelative(lastSeen, NOW)],
  ]

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <Link to="/errors" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-ink-3 hover:text-ink-2">
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Back to error reports
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-[28px] font-semibold leading-[34px] tracking-[-0.02em]">
            {r.title}
            <Pill kind="severity" value={r.severity} />
          </h1>
          <p className="mt-1 font-mono text-[13px] text-ink-3">{r.message}</p>
          <p className="mt-1 text-[13px] text-ink-3">
            First seen {formatRelative(firstSeen, NOW)} · Last seen {formatRelative(lastSeen, NOW)} ·{' '}
            <span className="tnum">{formatNumber(r.count)}</span> total events
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" icon={Share2}>Share</Button>
          <button type="button" aria-label="More actions" className="flex h-9 w-9 items-center justify-center rounded-control text-ink-2 hover:bg-sunken">
            <MoreHorizontal aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* stat strip */}
      <Card className="p-0">
        <dl className="grid grid-cols-2 divide-line sm:grid-cols-5 sm:divide-x">
          {stats.map(([label, value]) => (
            <div key={label} className="px-5 py-4">
              <dt className="text-[12px] font-medium text-ink-3">{label}</dt>
              <dd className="tnum mt-1 text-[18px] font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="flex flex-col gap-4 xl:col-span-7">
          <Card>
            <CardHeader title="Error details" />
            <dl className="divide-y divide-line">
              <div className="py-2.5">
                <dt className="text-[13px] text-ink-3">Error message</dt>
                <dd className="mt-1.5 flex items-start justify-between gap-2 rounded-control bg-critical-soft p-3">
                  <code className="min-w-0 font-mono text-[12px] leading-5 text-[#991b1b]">{r.message}</code>
                  <button type="button" aria-label="Copy error message" className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#991b1b] hover:bg-white/60">
                    <Copy aria-hidden className="h-3.5 w-3.5" />
                  </button>
                </dd>
              </div>
              <MetaRow label="Affected page"><code className="font-mono text-primary">{r.page}</code></MetaRow>
              <MetaRow label="Component"><span className="font-mono">{r.component}</span></MetaRow>
              <MetaRow label="Environment">
                <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-1.5 w-1.5 rounded-full bg-success" />Production</span>
              </MetaRow>
              <MetaRow label="Release">
                <span className="inline-flex items-center gap-2">
                  <code className="font-mono">{r.release}</code>
                  <span className="rounded-full bg-info-soft px-1.5 py-0.5 text-[11px] text-[#475569]">{formatRelative(firstSeen, NOW)}</span>
                  <span className="text-primary">View in releases</span>
                </span>
              </MetaRow>
              <MetaRow label="Users impacted"><span className="tnum">{formatNumber(r.usersImpacted)}</span></MetaRow>
              <MetaRow label="Tags">
                <span className="inline-flex flex-wrap justify-end gap-1.5">
                  {r.tags.map((t) => (
                    <span key={t} className="rounded-full bg-info-soft px-2 py-0.5 text-[12px] text-[#475569]">{t}</span>
                  ))}
                </span>
              </MetaRow>
            </dl>
          </Card>

          <Card>
            <Tabs
              aria-label="Error context"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'stack', label: 'Stack trace' },
                { value: 'network', label: 'Network calls (6)' },
                { value: 'breadcrumbs', label: 'Breadcrumbs (12)' },
                { value: 'userdata', label: 'User data' },
                { value: 'related', label: 'Related issues' },
              ]}
            />
            <div className="mt-4">
              {tab === 'stack' ? (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="inline-flex rounded-control border border-line p-0.5" role="group" aria-label="Stack trace view">
                      {['raw', 'original', 'minified'].map((v) => (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={stackView === v}
                          onClick={() => setStackView(v)}
                          className={`rounded-md px-2.5 py-1 text-[12px] font-medium capitalize ${stackView === v ? 'bg-primary-soft text-[#1e40af]' : 'text-ink-3 hover:text-ink-2'}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" icon={Copy}>Copy</Button>
                  </div>
                  <ol className="overflow-x-auto rounded-control bg-sunken font-mono text-[12px] leading-6">
                    {r.stack.map((line, i) => (
                      <li key={i} className={`flex ${i === 0 ? 'bg-critical-soft' : ''}`}>
                        <span aria-hidden className="tnum w-8 shrink-0 select-none px-2 text-right text-ink-3">{i + 1}</span>
                        <code className={`whitespace-pre px-2 ${i === 0 ? 'text-[#991b1b]' : 'text-ink-2'}`}>{line}</code>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <EmptyState title="Not captured in mock telemetry" description="This context is not part of the mock dataset for this build." />
              )}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 xl:col-span-5">
          <Card>
            <Tabs
              aria-label="Session evidence"
              value={replayTab}
              onChange={setReplayTab}
              tabs={[
                { value: 'replay', label: 'Session replay' },
                { value: 'screenshot', label: 'Screenshot' },
              ]}
            />
            <div className="mt-4">
              <div className="flex aspect-video items-center justify-center rounded-control bg-sunken">
                <Button variant="secondary" icon={Play}>Play replay</Button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="tnum text-[12px] text-ink-3">0:12</span>
                <div className="h-1.5 flex-1 rounded-full bg-line">
                  <div className="h-1.5 w-1/4 rounded-full bg-primary" />
                </div>
                <span className="tnum text-[12px] text-ink-3">0:48</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader icon={Monitor} title="Browser & device" />
            <dl className="divide-y divide-line">
              <MetaRow label="Browser"><span className="font-mono">{r.browser}</span></MetaRow>
              <MetaRow label="OS"><span className="font-mono">Windows 11</span></MetaRow>
              <MetaRow label="Device"><span className="font-mono">Desktop</span></MetaRow>
              <MetaRow label="Screen"><span className="font-mono">2560×1440</span></MetaRow>
              <MetaRow label="User agent"><span className="block max-w-xs truncate font-mono text-[12px]">Mozilla/5.0 (Windows NT 10.0; Win64; x64)…</span></MetaRow>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Grouping & fingerprint" />
            <dl className="divide-y divide-line">
              <MetaRow label="Issue ID">
                <span className="inline-flex items-center gap-1.5">
                  <code className="font-mono">{r.id}</code>
                  <button type="button" aria-label="Copy issue ID" className="flex h-5 w-5 items-center justify-center rounded text-ink-3 hover:bg-sunken">
                    <Copy aria-hidden className="h-3 w-3" />
                  </button>
                </span>
              </MetaRow>
              <MetaRow label="Fingerprint"><code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[12px]">{r.fingerprint}</code></MetaRow>
              <MetaRow label="Grouping">By error type + normalized stack</MetaRow>
              <MetaRow label="Similar issues"><span className="tnum">2 open · 5 closed</span></MetaRow>
              <MetaRow label="First seen">{formatRelative(firstSeen, NOW)}</MetaRow>
              <MetaRow label="Last seen">{formatRelative(lastSeen, NOW)}</MetaRow>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}

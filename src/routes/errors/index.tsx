import { createFileRoute } from '@tanstack/react-router'
import { CircleDot, FileWarning, FolderMinus, FolderPlus, MoreHorizontal } from 'lucide-react'
import { PageHeader } from '#/components/shell/PageHeader'
import { StatCard } from '#/components/ui/StatCard'
import { Card, CardHeader } from '#/components/ui/Card'
import { Button } from '#/components/ui/Button'
import { Select } from '#/components/ui/Select'
import { SearchInput } from '#/components/ui/SearchInput'
import { Pill } from '#/components/ui/Pill'
import { DataTable, PaginationFooter, type Column } from '#/components/ui/DataTable'
import { Sparkline } from '#/components/charts/Sparkline'
import { errorReportCounts, errorReportSparks, listErrorReports, type ErrorReport } from '#/lib/mock/errors'
import { NOW, minutesAgo } from '#/lib/mock/clock'
import { formatRelative, formatNumber } from '#/lib/format'
import { useState } from 'react'

export const Route = createFileRoute('/errors/')({
  component: ErrorsPage,
})

const browserDot: Record<ErrorReport['browser'], string> = {
  Chrome: 'bg-primary',
  Safari: 'bg-info',
  Firefox: 'bg-error',
  Edge: 'bg-series-vitals',
}

const typeChip: Record<ErrorReport['type'], string> = {
  JS: 'bg-primary-soft text-[#1e40af]',
  Network: 'bg-warning-soft text-[#92400e]',
  HTTP: 'bg-info-soft text-[#475569]',
}

const columns: Column<ErrorReport>[] = [
  {
    key: 'error',
    header: 'Error',
    render: (r) => (
      <div className="min-w-0 max-w-md">
        <p className="truncate text-[13px] font-medium text-ink">{r.title}</p>
        <p className="truncate font-mono text-[12px] text-ink-3">{r.page}</p>
      </div>
    ),
  },
  { key: 'page', header: 'Page', render: (r) => <code className="font-mono text-[12px] text-ink-2">{r.page}</code> },
  {
    key: 'browser',
    header: 'Browser',
    render: (r) => (
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${browserDot[r.browser]}`} />
        {r.browser}
      </span>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    render: (r) => (
      <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${typeChip[r.type]}`}>{r.type}</span>
    ),
  },
  { key: 'severity', header: 'Severity', render: (r) => <Pill kind="severity" value={r.severity} /> },
  { key: 'status', header: 'Status', render: (r) => <Pill kind="status" value={r.status} /> },
  { key: 'count', header: 'Count', align: 'right', sortable: true, sortValue: (r) => r.count, render: (r) => <span className="tnum">{formatNumber(r.count)}</span> },
  { key: 'first', header: 'First seen', render: (r) => <span className="whitespace-nowrap text-ink-3">{formatRelative(minutesAgo(r.firstSeenMinAgo), NOW)}</span> },
  { key: 'last', header: 'Last seen', render: (r) => <span className="whitespace-nowrap text-ink-3">{formatRelative(minutesAgo(r.lastSeenMinAgo), NOW)}</span> },
  {
    key: 'actions',
    header: '',
    width: '40px',
    render: () => (
      <button type="button" aria-label="Error actions" onClick={(e) => e.stopPropagation()} className="flex h-7 w-7 items-center justify-center rounded-control text-ink-3 hover:bg-surface hover:text-ink-2">
        <MoreHorizontal aria-hidden className="h-4 w-4" />
      </button>
    ),
  },
]

function ErrorsPage() {
  const navigate = Route.useNavigate()
  const counts = errorReportCounts()
  const sparks = errorReportSparks()
  const rows = listErrorReports()
  const [page, setPage] = useState(1)

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <PageHeader
        title="Error Reports"
        description="Browse and investigate issues reported by your users and automated monitoring."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileWarning} label="New reports" value={formatNumber(counts.new)} tone="critical" footnote="awaiting triage">
          <Sparkline data={sparks.newReports} kind="bars" color="var(--color-critical)" label="New reports trend" />
        </StatCard>
        <StatCard icon={FolderPlus} label="Grouped reports" value={formatNumber(counts.grouped)} footnote="merged by fingerprint">
          <Sparkline data={sparks.grouped} kind="line" color="var(--color-primary)" label="Grouped reports trend" />
        </StatCard>
        <StatCard icon={FolderMinus} label="Ignored reports" value={formatNumber(counts.ignored)} footnote="browser noise, bots">
          <Sparkline data={sparks.ignored} kind="line" color="var(--color-info)" label="Ignored reports trend" />
        </StatCard>
        <StatCard icon={CircleDot} label="Resolved reports" value={formatNumber(counts.resolved)} tone="success" footnote="last 30 days" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput className="w-full sm:w-72" placeholder="Search errors by message or page…" aria-label="Search error reports" />
          <Select aria-label="Page" defaultValue="all" options={[{ value: 'all', label: 'All pages' }]} />
          <Select aria-label="Browser" defaultValue="all" options={[{ value: 'all', label: 'All browsers' }]} />
          <Select aria-label="Type" defaultValue="all" options={[{ value: 'all', label: 'All types' }]} />
          <Select aria-label="Severity" defaultValue="all" options={[{ value: 'all', label: 'All severities' }]} />
          <Select aria-label="Status" defaultValue="all" options={[{ value: 'all', label: 'All statuses' }]} />
          <Button variant="secondary">Reset filters</Button>
        </div>
      </Card>

      <Card className="p-0">
        <div className="p-5 pb-0">
          <CardHeader
            title={`${formatNumber(counts.total)} reports`}
            description="Showing recent error reports from your site."
            action={
              <Select aria-label="Sort order" defaultValue="newest" options={[{ value: 'newest', label: 'Newest first' }]} />
            }
          />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          selectable
          onRowClick={(r) => navigate({ to: '/errors/$errorId', params: { errorId: r.id } })}
        />
        <PaginationFooter
          page={page}
          pageSize={10}
          total={rows.length}
          onPageChange={setPage}
          leading={
            <span className="flex items-center gap-2">
              Rows per page
              <Select aria-label="Rows per page" defaultValue="10" className="[&>select]:h-7 [&>select]:text-[12px]" options={[{ value: '10', label: '10' }]} />
            </span>
          }
        />
      </Card>
    </div>
  )
}

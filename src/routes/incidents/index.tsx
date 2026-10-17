import { createFileRoute } from '@tanstack/react-router'
import { Filter, MoreHorizontal, Plus, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '#/components/shell/PageHeader'
import { Card } from '#/components/ui/Card'
import { Button } from '#/components/ui/Button'
import { Select } from '#/components/ui/Select'
import { SearchInput } from '#/components/ui/SearchInput'
import { Pill } from '#/components/ui/Pill'
import { Avatar } from '#/components/ui/Avatar'
import { EmptyState } from '#/components/ui/EmptyState'
import { DataTable, PaginationFooter, type Column } from '#/components/ui/DataTable'
import { incidentCounts, listIncidents, type Incident, type Severity } from '#/lib/mock/incidents'
import { NOW } from '#/lib/mock/clock'
import { formatDuration, formatNumber, formatRelative } from '#/lib/format'

const PAGE_SIZE = 10

const validateSearch = (s: Record<string, unknown>): { page?: number } => ({
  page: typeof s.page === 'number' && s.page > 0 ? Math.floor(s.page) : 1,
})

export const Route = createFileRoute('/incidents/')({
  validateSearch,
  component: IncidentsPage,
})

const SEV_TABS: { value: 'all' | Severity; label: string; dot?: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical', dot: 'bg-critical' },
  { value: 'error', label: 'Error', dot: 'bg-error' },
  { value: 'warning', label: 'Warning', dot: 'bg-warning' },
  { value: 'info', label: 'Info', dot: 'bg-info' },
]

const columns: Column<Incident>[] = [
  {
    key: 'title',
    header: 'Title',
    sortable: true,
    sortValue: (i) => i.title,
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
    sortable: true,
    sortValue: (i) => i.service,
    render: (i) => (
      <span className="whitespace-nowrap rounded-full bg-info-soft px-2 py-0.5 font-mono text-[12px] text-[#475569]">
        {i.service}
      </span>
    ),
  },
  {
    key: 'severity',
    header: 'Severity',
    sortable: true,
    sortValue: (i) => ({ critical: 0, error: 1, warning: 2, info: 3 })[i.severity],
    render: (i) => <Pill kind="severity" value={i.severity} />,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    sortValue: (i) => i.status,
    render: (i) => <Pill kind="status" value={i.status} />,
  },
  {
    key: 'affectedUsers',
    header: 'Affected users',
    align: 'right',
    sortable: true,
    sortValue: (i) => i.affectedUsers,
    render: (i) => <span className="tnum">{formatNumber(i.affectedUsers)}</span>,
  },
  {
    key: 'started',
    header: 'Started',
    sortable: true,
    sortValue: (i) => i.startedAt,
    render: (i) => <span className="text-ink-3">{formatRelative(i.startedAt, NOW)}</span>,
  },
  {
    key: 'duration',
    header: 'Duration',
    sortable: true,
    sortValue: (i) => (i.resolvedAt ? Date.parse(i.resolvedAt) : NOW) - Date.parse(i.startedAt),
    render: (i) => (
      <span className="tnum text-ink-3">
        {formatDuration(
          ((i.resolvedAt ? Date.parse(i.resolvedAt) : NOW) - Date.parse(i.startedAt)) / 1000,
        )}
      </span>
    ),
  },
  {
    key: 'owner',
    header: 'Owner',
    render: (i) => (
      <span className="flex items-center gap-2">
        <Avatar initials={i.owner.initials} size={22} />
        <span className="whitespace-nowrap text-[13px] text-ink-2">{i.owner.name}</span>
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

function IncidentsPage() {
  const page = Route.useSearch().page ?? 1
  const navigate = Route.useNavigate()
  const [query, setQuery] = useState('')
  const [service, setService] = useState('all')
  const [status, setStatus] = useState('all')
  const [sevTab, setSevTab] = useState<'all' | Severity>('all')

  const counts = incidentCounts()
  const all = listIncidents()

  const filtered = useMemo(
    () =>
      all.filter((i) => {
        if (sevTab !== 'all' && i.severity !== sevTab) return false
        if (service !== 'all' && i.service !== service) return false
        if (status !== 'all' && i.status !== status) return false
        if (query) {
          const q = query.toLowerCase()
          if (!`${i.title} ${i.service} ${i.id}`.toLowerCase().includes(q)) return false
        }
        return true
      }),
    [all, sevTab, service, status, query],
  )

  const setPage = (p: number) =>
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, page: p }) })

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const resetFilters = () => {
    setQuery('')
    setService('all')
    setStatus('all')
    setSevTab('all')
    setPage(1)
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <PageHeader
        title="Incidents"
        description={
          <>
            View and manage incidents across all your services.{' '}
            <strong className="font-semibold text-[#991b1b]">
              {counts.active} active incidents
            </strong>{' '}
            need attention.
          </>
        }
        actions={
          <Button icon={Plus} onClick={() => {}}>
            Create incident
          </Button>
        }
      />

      {/* severity chips */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by severity">
        {SEV_TABS.map((t) => {
          const count =
            t.value === 'all' ? counts.total : counts.bySeverity[t.value as Severity]
          const activeChip = sevTab === t.value
          return (
            <button
              key={t.value}
              type="button"
              aria-pressed={activeChip}
              onClick={() => {
                setSevTab(t.value)
                setPage(1)
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                activeChip
                  ? 'border-primary/30 bg-primary-soft text-[#1e40af]'
                  : 'border-line bg-surface text-ink-2 hover:border-line-strong'
              }`}
            >
              {t.dot ? <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${t.dot}`} /> : null}
              {t.label}
              <span className="tnum text-ink-3">{count}</span>
            </button>
          )
        })}
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          className="w-full sm:w-80"
          placeholder="Search incidents by title, service, or ID…"
          aria-label="Search incidents"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
        />
        <Select
          aria-label="Filter by service"
          value={service}
          onChange={(e) => {
            setService(e.target.value)
            setPage(1)
          }}
          options={[
            { value: 'all', label: 'All services' },
            { value: 'checkout-api', label: 'checkout-api' },
            { value: 'user-api', label: 'user-api' },
            { value: 'search-api', label: 'search-api' },
            { value: 'inventory-api', label: 'inventory-api' },
            { value: 'gateway', label: 'gateway' },
          ]}
        />
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'investigating', label: 'Investigating' },
            { value: 'monitoring', label: 'Monitoring' },
            { value: 'resolved', label: 'Resolved' },
          ]}
        />
        <Button variant="secondary" icon={Filter} onClick={() => {}}>
          More filters
        </Button>
      </div>

      <Card className="p-0">
        <DataTable
          columns={columns}
          rows={paged}
          rowKey={(i) => i.id}
          selectable
          onRowClick={(i) => navigate({ to: '/incidents/$incidentId', params: { incidentId: i.id } })}
          empty={
            <EmptyState
              icon={SearchX}
              title="No incidents match these filters"
              description="Try widening the severity, service, or status filters, or clear the search."
              action={
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Reset filters
                </Button>
              }
            />
          }
        />
        <PaginationFooter page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
      </Card>
    </div>
  )
}

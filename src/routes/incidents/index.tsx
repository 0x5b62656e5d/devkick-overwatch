import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '#/components/shell/PageHeader'
import { Card, CardHeader } from '#/components/ui/Card'
import { DataTable, type Column } from '#/components/ui/DataTable'
import { SearchInput } from '#/components/ui/SearchInput'
import { Select } from '#/components/ui/Select'
import { useLiveData } from '#/lib/live-data'
import type { Incident } from '#/lib/incident-state'
import { formatRelative } from '#/lib/format'

export const Route = createFileRoute('/incidents/')({ component: IncidentsPage })

const columns: Column<Incident>[] = [
  { key: 'service', header: 'Service', sortable: true, sortValue: (i) => i.candidate.service, render: (i) => <span className="font-mono">{i.candidate.service}</span> },
  { key: 'status', header: 'Status', sortable: true, sortValue: (i) => i.status, render: (i) => i.status },
  { key: 'signals', header: 'Detected signals', render: (i) => i.candidate.signals.join(', ') },
  { key: 'owner', header: 'KEV owner', render: (i) => i.decision?.owner ?? 'Pending' },
  { key: 'severity', header: 'KEV severity', sortable: true, sortValue: (i) => i.decision?.severity ?? -1, render: (i) => i.decision ? `${i.decision.severity.toFixed(1)} / 4` : 'Pending' },
  { key: 'detected', header: 'Detected', sortable: true, sortValue: (i) => i.createdAt, render: (i) => formatRelative(new Date(i.createdAt).toISOString(), Date.now()) },
]

function IncidentsPage() {
  const { feed, error } = useLiveData()
  const navigate = Route.useNavigate()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const incidents = [...(feed?.incidents ?? [])].sort((a, b) => b.createdAt - a.createdAt)
  const filtered = incidents.filter((incident) =>
    (status === 'all' || incident.status === status) &&
    `${incident.id} ${incident.candidate.service} ${incident.candidate.signals.join(' ')}`.toLowerCase().includes(query.toLowerCase()),
  )
  const active = incidents.filter((incident) => incident.status !== 'resolved').length

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <PageHeader title="Incidents" description={`${active} active incidents detected from server telemetry.`} />
      {error ? <Card><p role="alert" className="text-critical">Backend connection failed: {error}</p></Card> : null}
      <Card>
        <CardHeader title="Detection status" description="The server samples every 15 seconds and requires a continuous two-minute issue." />
        <p className="text-[13px] text-ink-2">{feed?.monitor.sampleCount ?? 0} samples in the current window · KEV {feed?.kev.configured ? 'configured' : 'not configured'} · {incidents.filter((incident) => Boolean(incident.decision)).length} decisions received</p>
      </Card>
      <div className="flex flex-wrap gap-2">
        <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search incidents" placeholder="Search service or signal…" />
        <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} options={[
          { value: 'all', label: 'All statuses' }, { value: 'open', label: 'Open' }, { value: 'acknowledged', label: 'Acknowledged' }, { value: 'resolved', label: 'Resolved' },
        ]} />
      </div>
      <Card className="p-0">
        <DataTable columns={columns} rows={filtered} rowKey={(incident) => incident.id} onRowClick={(incident) => navigate({ to: '/incidents/$incidentId', params: { incidentId: incident.id } })} empty={<p className="p-5 text-[13px] text-ink-3">No incidents match. In a bad scenario, the first incident appears after about two minutes.</p>} />
      </Card>
    </div>
  )
}

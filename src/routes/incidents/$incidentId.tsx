import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { PageHeader } from '#/components/shell/PageHeader'
import { Card, CardHeader } from '#/components/ui/Card'
import { Button } from '#/components/ui/Button'
import { useLiveData } from '#/lib/live-data'

export const Route = createFileRoute('/incidents/$incidentId')({ component: IncidentDetailPage })

function IncidentDetailPage() {
  const { incidentId } = Route.useParams()
  const { feed, error, updateIncident, evaluateIncident } = useLiveData()
  const [actionError, setActionError] = useState<string | null>(null)
  const incident = feed?.incidents.find((item) => item.id === incidentId)

  if (!feed && !error) return <p className="text-[13px] text-ink-3">Loading incident from the server…</p>
  if (!incident) return <Card><p className="text-[13px] text-ink-2">Incident not found in server state. <Link to="/incidents" className="text-primary">Back to incidents</Link></p></Card>

  const candidate = incident.candidate
  const metrics = candidate.snapshot.services.find((item) => item.name === candidate.service)
  const actions = feed?.actionQueue.filter((item) => item.incidentId === incident.id) ?? []

  async function run(operation: () => Promise<void>) {
    setActionError(null)
    try { await operation() } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Request failed') }
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <PageHeader title={`${candidate.service} incident`} description={`${incident.id} · ${incident.status} · detected ${new Date(incident.createdAt).toLocaleString()}`} />
      {actionError || error ? <Card><p role="alert" className="text-critical">{actionError || error}</p></Card> : null}
      <Card>
        <CardHeader title="Incident controls" description="These update the backend in-memory incident record." />
        <div className="flex flex-wrap gap-2">
          {incident.status === 'open' ? <Button variant="secondary" onClick={() => void run(() => updateIncident(incident.id, 'acknowledged'))}>Acknowledge</Button> : null}
          {incident.status !== 'resolved' ? <Button variant="secondary" onClick={() => void run(() => updateIncident(incident.id, 'resolved'))}>Resolve</Button> : null}
          {!incident.decision && incident.status !== 'resolved' && feed?.kev.configured ? <Button variant="secondary" onClick={() => void run(() => evaluateIncident(incident.id))}>Retry KEV decision</Button> : null}
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Detection evidence" description="Sustained metric issue observed by the server" />
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            <div><dt className="text-ink-3">Service</dt><dd className="font-mono">{candidate.service}</dd></div>
            <div><dt className="text-ink-3">Service team</dt><dd>{candidate.team}</dd></div>
            <div><dt className="text-ink-3">Window</dt><dd>{new Date(candidate.windowStart).toLocaleTimeString()}–{new Date(candidate.windowEnd).toLocaleTimeString()}</dd></div>
            <div><dt className="text-ink-3">Samples</dt><dd>{candidate.sampleCount}</dd></div>
            {metrics ? <>
              <div><dt className="text-ink-3">Availability</dt><dd>{(metrics.availability * 100).toFixed(1)}%</dd></div>
              <div><dt className="text-ink-3">Error rate</dt><dd>{(metrics.errorRate * 100).toFixed(1)}%</dd></div>
              <div><dt className="text-ink-3">Request count</dt><dd>{metrics.requestCount}</dd></div>
              <div><dt className="text-ink-3">Latency samples</dt><dd>{metrics.latenciesMs.join(', ')}ms</dd></div>
            </> : null}
          </dl>
          <ul className="mt-4 list-disc pl-5 text-[13px] text-ink-2">{candidate.signals.map((signal) => <li key={signal}>{signal}</li>)}</ul>
        </Card>
        <Card>
          <CardHeader title="KEV decision" description="Remote System One response, when available" />
          {incident.decision ? <dl className="grid grid-cols-2 gap-3 text-[13px]">
            <div><dt className="text-ink-3">Owner</dt><dd>{incident.decision.owner}</dd></div>
            <div><dt className="text-ink-3">Severity</dt><dd>{incident.decision.severity.toFixed(2)} / 4</dd></div>
            <div><dt className="text-ink-3">Next action</dt><dd>{incident.decision.nextAction}</dd></div>
            <div><dt className="text-ink-3">Immediate human intervention</dt><dd>{incident.decision.needsHuman ? 'Yes' : 'No'}</dd></div>
            <div><dt className="text-ink-3">Confidence</dt><dd>{(incident.decision.confidence * 100).toFixed(0)}%</dd></div>
            <div><dt className="text-ink-3">Human probability</dt><dd>{(incident.decision.answers.human.noul * 100).toFixed(0)}%</dd></div>
          </dl> : <p className="text-[13px] text-ink-2">No KEV decision. {incident.evaluationError ?? (feed?.kev.configured ? 'Evaluation pending.' : 'Set KEV_ENDPOINT on the server to enable remote evaluation.')}</p>}
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Corroborating reports" description="Reports from the same simulated telemetry sample" />
          <ul className="space-y-3 text-[13px] text-ink-2">{candidate.snapshot.reports.filter((report) => report.service === candidate.service).map((report, index) => <li key={`${report.source}-${index}`}><strong>{report.source}</strong> · {report.message}</li>)}</ul>
        </Card>
        <Card>
          <CardHeader title="Agent action queue" description="Recommended tasks are queued; no rollback or page is executed automatically" />
          {actions.length ? <ul className="space-y-2 text-[13px] text-ink-2">{actions.map((action) => <li key={action.id}>{action.action} · {action.owner} · {action.status}</li>)}</ul> : <p className="text-[13px] text-ink-3">No queued action until KEV responds.</p>}
        </Card>
      </div>
    </div>
  )
}

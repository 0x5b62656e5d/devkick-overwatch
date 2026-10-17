import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BellRing, Mail, Webhook, MessageSquare, Route as RouteIcon } from 'lucide-react'
import { PageHeader } from '#/components/shell/PageHeader'
import { Card, CardHeader } from '#/components/ui/Card'
import { Select } from '#/components/ui/Select'
import { Toggle } from '#/components/ui/Toggle'
import { Pill } from '#/components/ui/Pill'
import { Tabs } from '#/components/ui/Tabs'
import { useState } from 'react'
import type { Severity } from '#/lib/mock/incidents'

export const Route = createFileRoute('/settings/alerts')({
  component: AlertsPage,
})

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const ROUTING: { sev: Severity; dests: string[] }[] = [
  { sev: 'critical', dests: ['Slack', 'PagerDuty', 'Email'] },
  { sev: 'error', dests: ['Slack', 'Email'] },
  { sev: 'warning', dests: ['Slack'] },
  { sev: 'info', dests: ['Digest'] },
]

const OWNERSHIP = [
  { service: 'checkout-api', team: 'payments', oncall: 'Maya Chen' },
  { service: 'user-api', team: 'identity', oncall: 'Jordan Diaz' },
  { service: 'search-api', team: 'search', oncall: 'Priya Nair' },
  { service: 'inventory-api', team: 'inventory', oncall: 'Lena Fischer' },
  { service: 'gateway', team: 'platform', oncall: 'Tom Okafor' },
]

function AlertsPage() {
  const navigate = useNavigate()
  const [slack, setSlack] = useState(true)
  const [email, setEmail] = useState(true)
  const [webhook, setWebhook] = useState(false)
  const [quiet, setQuiet] = useState(true)
  const [thresholds, setThresholds] = useState([true, true, false])
  const [days, setDays] = useState<Set<number>>(new Set([5, 6]))

  const dests = [
    { name: 'Slack', icon: MessageSquare, on: slack, set: setSlack, field: '#incidents', label: 'Channel' },
    { name: 'Email', icon: Mail, on: email, set: setEmail, field: 'oncall@example.com', label: 'Address' },
    { name: 'Webhook', icon: Webhook, on: webhook, set: setWebhook, field: 'https://hooks.internal/ow', label: 'URL' },
  ]

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <PageHeader title="Alerts & routing" description="Decide who gets notified, for what, and when." />
      <Tabs
        aria-label="Settings sections"
        value="alerts"
        onChange={(v) => {
          if (v === 'site') navigate({ to: '/settings' })
        }}
        tabs={[
          { value: 'site', label: 'Site' },
          { value: 'alerts', label: 'Alerts & routing' },
        ]}
      />

      <Card>
        <CardHeader icon={BellRing} title="Notification destinations" description="Where alerts are delivered" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {dests.map((d) => (
            <div key={d.name} className="rounded-card border border-line p-4">
              <div className="flex items-center gap-2">
                <d.icon aria-hidden className="h-4 w-4 text-ink-3" />
                <span className="text-[13px] font-medium text-ink">{d.name}</span>
                <span className="ml-auto"><Toggle checked={d.on} onChange={d.set} label={`${d.name} notifications`} /></span>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-[12px] text-ink-3">{d.label}</span>
                <input
                  defaultValue={d.field}
                  disabled={!d.on}
                  className="h-8 w-full rounded-control border border-line bg-surface px-2.5 font-mono text-[12px] text-ink-2 disabled:bg-sunken disabled:text-ink-3"
                />
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Alert thresholds" description="Trigger an alert when a metric crosses a threshold" />
        <ul className="divide-y divide-line">
          {[
            { label: 'Error rate', value: '5', unit: '%', period: 'for 5 minutes' },
            { label: 'Latency p95', value: '800', unit: 'ms', period: 'for 10 minutes' },
            { label: 'Uptime', value: '99.9', unit: '%', period: 'for 15 minutes' },
          ].map((t, i) => (
            <li key={t.label} className="flex flex-wrap items-center gap-3 py-3">
              <span className="w-28 text-[13px] font-medium text-ink">{t.label}</span>
              <span className="text-[13px] text-ink-3">&gt;</span>
              <input defaultValue={t.value} aria-label={`${t.label} threshold`} className="tnum h-8 w-20 rounded-control border border-line px-2.5 text-[13px]" />
              <span className="text-[13px] text-ink-3">{t.unit}</span>
              <span className="text-[13px] text-ink-3">for</span>
              <Select aria-label={`${t.label} window`} defaultValue={t.period} options={[{ value: t.period, label: t.period }]} />
              <span className="ml-auto"><Toggle checked={thresholds[i]} onChange={(v) => setThresholds(thresholds.map((x, j) => (j === i ? v : x)))} label={`${t.label} alert`} /></span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader icon={RouteIcon} title="Severity routing" description="Destinations per severity" />
          <ul className="space-y-3">
            {ROUTING.map((r) => (
              <li key={r.sev} className="flex items-center gap-3">
                <span className="w-20"><Pill kind="severity" value={r.sev} /></span>
                <span aria-hidden className="text-ink-3">→</span>
                <span className="flex flex-wrap gap-1.5">
                  {r.dests.map((d) => (
                    <span key={d} className="rounded-full bg-info-soft px-2 py-0.5 text-[12px] text-[#475569]">{d}</span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Quiet hours"
            description="Hold non-critical alerts overnight"
            action={<Toggle checked={quiet} onChange={setQuiet} label="Quiet hours" />}
          />
          <div className={`space-y-3 ${quiet ? '' : 'opacity-50'}`}>
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-ink-3">Timezone</span>
              <Select aria-label="Timezone" defaultValue="pt" options={[{ value: 'pt', label: 'Pacific Time (UTC−7)' }]} disabled={!quiet} />
            </label>
            <div className="flex items-center gap-2">
              <input aria-label="Quiet hours start" defaultValue="22:00" disabled={!quiet} className="tnum h-8 w-24 rounded-control border border-line px-2.5 font-mono text-[13px] disabled:bg-sunken" />
              <span className="text-[13px] text-ink-3">to</span>
              <input aria-label="Quiet hours end" defaultValue="07:00" disabled={!quiet} className="tnum h-8 w-24 rounded-control border border-line px-2.5 font-mono text-[13px] disabled:bg-sunken" />
            </div>
            <div className="flex gap-1.5" role="group" aria-label="Quiet days">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days.has(i)}
                  disabled={!quiet}
                  onClick={() => {
                    const next = new Set(days)
                    if (next.has(i)) next.delete(i)
                    else next.add(i)
                    setDays(next)
                  }}
                  className={`h-8 w-10 rounded-control text-[12px] font-medium ${days.has(i) ? 'bg-primary-soft text-[#1e40af]' : 'border border-line text-ink-3 hover:border-line-strong'} disabled:opacity-50`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="p-5 pb-0"><CardHeader title="Ownership rules" description="Who gets paged for which service" /></div>
        <table className="w-full text-left">
          <thead><tr className="border-b border-line">
            <th scope="col" className="px-5 py-2.5 text-[12px] font-medium text-ink-3">Service</th>
            <th scope="col" className="px-4 py-2.5 text-[12px] font-medium text-ink-3">Team</th>
            <th scope="col" className="px-5 py-2.5 text-right text-[12px] font-medium text-ink-3">On-call</th>
          </tr></thead>
          <tbody>
            {OWNERSHIP.map((o) => (
              <tr key={o.service} className="border-b border-line last:border-0 hover:bg-sunken">
                <td className="px-5 py-3"><code className="font-mono text-[12px] text-ink-2">{o.service}</code></td>
                <td className="px-4 py-3 text-[13px] text-ink-2">{o.team}</td>
                <td className="px-5 py-3 text-right text-[13px] text-ink-2">{o.oncall}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

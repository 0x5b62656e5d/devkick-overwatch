import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Check, Copy, Globe, Pencil, Plug } from 'lucide-react'
import { PageHeader } from '#/components/shell/PageHeader'
import { Card, CardHeader } from '#/components/ui/Card'
import { Button } from '#/components/ui/Button'
import { Select } from '#/components/ui/Select'
import { Pill } from '#/components/ui/Pill'
import { Tabs } from '#/components/ui/Tabs'
import { useState } from 'react'

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
})

const SERVICES = [
  { name: 'Slack', connected: true, detail: '#incidents channel' },
  { name: 'PagerDuty', connected: false, detail: 'Escalation on critical' },
  { name: 'Linear', connected: true, detail: 'Creates issues in ENG' },
  { name: 'Sentry', connected: false, detail: 'Import error grouping' },
]

const MONITORED_PAGES = [
  { page: '/', checks: '12 checks · 5 min' },
  { page: '/checkout', checks: '18 checks · 5 min' },
  { page: '/search', checks: '9 checks · 15 min' },
  { page: '/login', checks: '6 checks · 5 min' },
]

const TARGETS = [
  { name: 'Checkout flow', schedule: 'Every 5 min', status: 'failed' as const },
  { name: 'Login flow', schedule: 'Every 5 min', status: 'passed' as const },
  { name: 'API health', schedule: 'Every 1 min', status: 'passed' as const },
]

function SettingsPage() {
  const navigate = useNavigate()
  const [sdkTab, setSdkTab] = useState('snippet')

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
      <PageHeader
        title="Site settings"
        description="Configure and manage monitoring for your website."
      />
      <Tabs
        aria-label="Settings sections"
        value="site"
        onChange={(v) => {
          if (v === 'alerts') navigate({ to: '/settings/alerts' })
        }}
        tabs={[
          { value: 'site', label: 'Site' },
          { value: 'alerts', label: 'Alerts & routing' },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            icon={Globe}
            title="example.com"
            description="Primary monitored site"
            action={
              <div className="flex items-center gap-2">
                <Pill kind="status" value="passing" />
                <span className="text-[12px] text-ink-3">Monitored</span>
                <Button variant="secondary" size="sm" icon={Pencil}>Edit</Button>
              </div>
            }
          />
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-ink-3">Environment</span>
              <Select aria-label="Environment" defaultValue="production" className="w-full [&>select]:w-full" options={[{ value: 'production', label: 'Production' }, { value: 'staging', label: 'Staging' }]} />
            </label>
            <div>
              <span className="mb-1 block text-[12px] font-medium text-ink-3">Site ID</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-control bg-sunken px-3 py-2 font-mono text-[13px] text-ink-2">site_9f27c41a</code>
                <button type="button" aria-label="Copy site ID" className="flex h-8 w-8 items-center justify-center rounded-control text-ink-3 hover:bg-sunken">
                  <Copy aria-hidden className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-ink-3">App type</span>
              <Select aria-label="App type" defaultValue="spa" className="w-full [&>select]:w-full" options={[{ value: 'spa', label: 'Single-page app' }, { value: 'ssr', label: 'Server-rendered' }]} />
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title="SDK installation" description="Client-side monitoring snippet" />
          <div className="flex items-center gap-2 rounded-control bg-success-soft p-3">
            <Check aria-hidden className="h-4 w-4 text-[#166534]" />
            <span className="text-[13px] font-medium text-[#166534]">SDK detected</span>
            <span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 font-mono text-[11px] text-[#166534]">v1.4.2</span>
          </div>
          <div className="mt-3">
            <Tabs
              aria-label="Install method"
              value={sdkTab}
              onChange={setSdkTab}
              tabs={[
                { value: 'npm', label: 'NPM' },
                { value: 'cdn', label: 'CDN' },
                { value: 'snippet', label: 'Snippet' },
              ]}
            />
            <pre className="mt-3 overflow-x-auto rounded-control bg-[#0f172a] p-4 font-mono text-[12px] leading-5 text-[#e2e8f0]">
              {sdkTab === 'npm'
                ? 'bun add @overwatch/sdk\n\nimport { init } from "@overwatch/sdk"\ninit({ siteId: "site_9f27c41a" })'
                : sdkTab === 'cdn'
                  ? '<script src="https://cdn.overwatch.dev/v1/site_9f27c41a.js" defer></script>'
                  : 'import { init } from "@overwatch/sdk"\n\ninit({\n  siteId: "site_9f27c41a",\n  environment: "production",\n  sampleRate: 1.0,\n})'}
            </pre>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader icon={Plug} title="Connected services" description="Integrations receiving incident and report data" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map((s) => (
            <div key={s.name} className="flex items-center gap-3 rounded-card border border-line p-4">
              <span aria-hidden className={`h-2 w-2 rounded-full ${s.connected ? 'bg-success' : 'bg-line-strong'}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">{s.name}</p>
                <p className="truncate text-[12px] text-ink-3">{s.connected ? `Connected · ${s.detail}` : `Not connected · ${s.detail}`}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-0">
          <div className="p-5 pb-0"><CardHeader title="Monitored pages" /></div>
          <table className="w-full text-left">
            <thead><tr className="border-b border-line">
              <th scope="col" className="px-5 py-2.5 text-[12px] font-medium text-ink-3">Page</th>
              <th scope="col" className="px-5 py-2.5 text-right text-[12px] font-medium text-ink-3">Checks</th>
            </tr></thead>
            <tbody>
              {MONITORED_PAGES.map((p) => (
                <tr key={p.page} className="border-b border-line last:border-0">
                  <td className="px-5 py-3"><code className="font-mono text-[12px] text-ink-2">{p.page}</code></td>
                  <td className="px-5 py-3 text-right text-[13px] text-ink-3">{p.checks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="p-0">
          <div className="p-5 pb-0"><CardHeader title="Verification targets" /></div>
          <table className="w-full text-left">
            <thead><tr className="border-b border-line">
              <th scope="col" className="px-5 py-2.5 text-[12px] font-medium text-ink-3">Test</th>
              <th scope="col" className="px-4 py-2.5 text-[12px] font-medium text-ink-3">Schedule</th>
              <th scope="col" className="px-5 py-2.5 text-right text-[12px] font-medium text-ink-3">Status</th>
            </tr></thead>
            <tbody>
              {TARGETS.map((t) => (
                <tr key={t.name} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 text-[13px] font-medium text-ink">{t.name}</td>
                  <td className="px-4 py-3 text-[13px] text-ink-3">{t.schedule}</td>
                  <td className="px-5 py-3 text-right"><Pill kind="status" value={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

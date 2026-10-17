import { Link } from '@tanstack/react-router'
import {
  Activity,
  BarChart3,
  Bell,
  ChevronDown,
  FileWarning,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLiveData } from '#/lib/live-data'
import { Avatar } from '#/components/ui/Avatar'

function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="var(--color-ink)" strokeWidth="1.6" />
        <circle cx="10" cy="10" r="2.4" fill="var(--color-primary)" />
        <path d="M10 1v3M10 16v3M1 10h3M16 10h3" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[-0.01em]">Overwatch</span>
    </span>
  )
}

const NAV = [
  { label: 'Overview', icon: LayoutDashboard, to: '/' as const },
  { label: 'Incidents', icon: Bell, to: '/incidents' as const, badge: true },
  { label: 'Error Reports', icon: FileWarning },
  { label: 'Telemetry', icon: Activity },
  { label: 'Verification', icon: ShieldCheck },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
]

function NavItems({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { feed } = useLiveData()
  const active = feed?.incidents.filter((incident) => incident.status !== 'resolved').length ?? 0
  return (
    <ul className="space-y-0.5">
      {NAV.map((item) => {
        const inner = (
          <>
            <item.icon aria-hidden className="h-4 w-4 shrink-0" />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
            {!collapsed && item.badge && active > 0 ? (
              <span className="tnum ml-auto rounded-full bg-critical-soft px-1.5 py-0.5 text-[11px] font-medium text-[#991b1b]">
                {active}
              </span>
            ) : null}
          </>
        )
        const cls =
          'flex items-center gap-2.5 rounded-control px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 text-ink-2 hover:bg-sunken hover:text-ink [&.active]:bg-primary-soft [&.active]:text-ink [&.active>svg]:text-primary'
        return (
          <li key={item.label}>
            {item.to ? (
              <Link
                to={item.to}
                title={collapsed ? item.label : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={`${cls} ${collapsed ? 'justify-center px-0' : ''}`}
                activeOptions={{ exact: item.to === '/' }}
                activeProps={{ className: 'active' }}
                onClick={onNavigate}
              >
                {inner}
              </Link>
            ) : (
              <span
                title={collapsed ? item.label : `${item.label} — not in this build`}
                aria-disabled="true"
                className={`${cls} cursor-default text-ink-3 ${collapsed ? 'justify-center px-0' : ''}`}
              >
                {inner}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function SidebarFoot({ scenario, collapsed }: { scenario: string; collapsed?: boolean }) {
  if (collapsed) return null
  return (
    <p className="px-2.5 text-[12px] leading-4 text-ink-3">
      Overwatch · mock telemetry
      <br />
      scenario: {scenario}
    </p>
  )
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 lg:px-6">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={onMenu}
        className="flex h-8 w-8 items-center justify-center rounded-control text-ink-2 hover:bg-sunken md:hidden"
      >
        <Menu aria-hidden className="h-4 w-4" />
      </button>
      <span className="md:hidden">
        <Wordmark />
      </span>
      <div className="hidden items-center gap-2 md:flex">
        <span className="rounded-control border border-line px-2.5 py-1.5 text-[12px] text-ink-2">Simulated environment</span>
        <span className="text-[12px] text-ink-3">Live 3-minute window</span>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Search"
          className="flex h-8 w-8 items-center justify-center rounded-control text-ink-3 hover:bg-sunken hover:text-ink-2"
        >
          <Search aria-hidden className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-control text-ink-3 hover:bg-sunken hover:text-ink-2"
        >
          <Bell aria-hidden className="h-4 w-4" />
          <span aria-hidden className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-critical" />
        </button>
        <button
          type="button"
          className="ml-1 flex items-center gap-2 rounded-control px-1.5 py-1 hover:bg-sunken"
          aria-label="User menu for Jordan Diaz"
        >
          <Avatar initials="JD" size={26} />
          <span className="hidden text-[13px] font-medium text-ink-2 sm:inline">Jordan Diaz</span>
          <ChevronDown aria-hidden className="h-3.5 w-3.5 text-ink-3" />
        </button>
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const { feed } = useLiveData()
  const scenario = feed?.snapshot?.scenario ?? 'loading'

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-surface p-3 lg:flex"
      >
        <div className="px-2.5 pb-4 pt-2">
          <Wordmark />
        </div>
        <NavItems />
        <div className="mt-auto pt-4">
          <SidebarFoot scenario={scenario} />
        </div>
      </nav>
      {/* icon rail */}
      <nav
        aria-label="Primary"
        className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col items-center border-r border-line bg-surface p-2 md:flex lg:hidden"
      >
        <div className="pb-4 pt-2">
          <svg aria-hidden width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke="var(--color-ink)" strokeWidth="1.6" />
            <circle cx="10" cy="10" r="2.4" fill="var(--color-primary)" />
            <path d="M10 1v3M10 16v3M1 10h3M16 10h3" stroke="var(--color-ink)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <NavItems collapsed />
      </nav>
      {/* mobile sheet */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-line bg-surface p-3 shadow-float">
            <div className="flex items-center justify-between px-2.5 pb-4 pt-2">
              <Wordmark />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-control text-ink-2 hover:bg-sunken"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
            <NavItems onNavigate={() => setSheetOpen(false)} />
            <div className="mt-auto pt-4">
              <SidebarFoot scenario={scenario} />
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col md:pl-16 lg:pl-[232px]">
        <TopBar onMenu={() => setSheetOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

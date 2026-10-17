export function formatRelative(iso: string, now: number): string {
  const diffMs = Math.max(0, now - Date.parse(iso))
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${trim1(value / 1_000_000)}M`
  if (value >= 10_000) return `${Math.round(value / 100) / 10}K`
  if (value >= 1_000) return `${trim1(value / 1_000)}K`
  return value.toLocaleString('en-US')
}

function trim1(v: number): string {
  return v.toFixed(1).replace(/\.0$/, '')
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  if (hours < 24) return remMins ? `${hours}h ${remMins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours ? `${days}d ${remHours}h` : `${days}d`
}

export function formatPercent(value: number, digits = 2): string {
  return `${value.toFixed(digits).replace(/\.?0+$/, '')}%`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  })
}

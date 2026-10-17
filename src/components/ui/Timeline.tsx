import { formatTime } from '#/lib/format'

type Tone = 'critical' | 'warning' | 'primary' | 'success' | 'muted'

const dot: Record<Tone, string> = {
  critical: 'bg-critical',
  warning: 'bg-warning',
  primary: 'bg-primary',
  success: 'bg-success',
  muted: 'bg-line-strong',
}

export function Timeline({
  items,
}: {
  items: { at: string; title: string; detail?: string; tone: Tone }[]
}) {
  return (
    <ol className="relative space-y-4">
      <span aria-hidden className="absolute bottom-2 left-[5px] top-2 w-px bg-line" />
      {items.map((item, i) => (
        <li key={i} className="relative pl-6">
          <span
            aria-hidden
            className={`absolute left-0 top-[7px] h-[11px] w-[11px] rounded-full border-2 border-surface ${dot[item.tone]}`}
          />
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-medium text-ink">{item.title}</p>
            <time className="tnum shrink-0 text-[12px] text-ink-3">{formatTime(item.at)}</time>
          </div>
          {item.detail ? <p className="mt-0.5 text-[13px] text-ink-3">{item.detail}</p> : null}
        </li>
      ))}
    </ol>
  )
}

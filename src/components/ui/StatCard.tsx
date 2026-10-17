import { Link } from '@tanstack/react-router'
import { ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Tone = 'neutral' | 'critical' | 'warning' | 'success'

const toneStyles: Record<Tone, { card: string; value: string; sub: string }> = {
  neutral: { card: 'bg-surface', value: 'text-ink', sub: 'text-ink-3' },
  critical: { card: 'bg-critical-soft', value: 'text-[#991b1b]', sub: 'text-[#b91c1c]/80' },
  warning: { card: 'bg-warning-soft', value: 'text-[#92400e]', sub: 'text-[#b45309]/80' },
  success: { card: 'bg-success-soft', value: 'text-[#166534]', sub: 'text-[#15803d]/80' },
}

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  footnote,
  tone = 'neutral',
  href,
  children,
}: {
  icon?: LucideIcon
  label: string
  value: string
  delta?: { value: string; direction: 'up' | 'down'; good: boolean }
  footnote?: string
  tone?: Tone
  href?: string
  children?: ReactNode
}) {
  const t = toneStyles[tone]
  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className={`flex items-center gap-1.5 text-[12px] font-medium ${t.sub}`}>
          {Icon ? <Icon aria-hidden className="h-3.5 w-3.5" /> : null}
          {label}
        </div>
        <div className={`mt-1.5 flex items-baseline gap-2 ${t.value}`}>
          <span className="tnum text-[26px] font-semibold leading-8 tracking-[-0.02em]">{value}</span>
          {delta ? (
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[12px] font-medium ${
                delta.good ? 'bg-success-soft text-[#166534]' : 'bg-critical-soft text-[#991b1b]'
              }`}
            >
              {delta.direction === 'up' ? (
                <TrendingUp aria-hidden className="h-3 w-3" />
              ) : (
                <TrendingDown aria-hidden className="h-3 w-3" />
              )}
              {delta.value}
            </span>
          ) : null}
        </div>
        {footnote ? <div className={`mt-1 text-[12px] ${t.sub}`}>{footnote}</div> : null}
      </div>
      {children ? <div className="w-[104px] shrink-0 self-end">{children}</div> : null}
    </div>
  )

  const cls = `relative block rounded-card border border-line p-5 ${t.card}`

  if (href) {
    return (
      <Link to={href} className={`${cls} group transition-colors hover:border-line-strong`}>
        {inner}
        <ChevronRight
          aria-hidden
          className="absolute right-3 top-3 h-4 w-4 text-ink-3 transition-colors group-hover:text-ink-2"
        />
      </Link>
    )
  }
  return <div className={cls}>{inner}</div>
}

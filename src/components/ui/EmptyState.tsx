import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      {Icon ? (
        <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-card bg-info-soft">
          <Icon aria-hidden className="h-5 w-5 text-[#475569]" />
        </span>
      ) : null}
      <p className="text-[14px] font-medium text-ink">{title}</p>
      {description ? <p className="max-w-sm text-[13px] text-ink-3">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

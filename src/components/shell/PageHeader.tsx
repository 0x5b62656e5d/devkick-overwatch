import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  breadcrumb?: { label: string; to?: string }[]
}) {
  return (
    <div className="mb-4">
      {breadcrumb ? (
        <nav aria-label="Breadcrumb" className="mb-1.5">
          <ol className="flex items-center gap-1 text-[12px] text-ink-3">
            {breadcrumb.map((b, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight aria-hidden className="h-3 w-3" /> : null}
                {b.to ? (
                  <Link to={b.to} className="hover:text-ink-2 hover:underline">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-ink-2">{b.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-[34px] tracking-[-0.02em]">{title}</h1>
          {description ? <p className="mt-1 text-[14px] text-ink-3">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}

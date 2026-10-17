import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

export function Select({
  options,
  className = '',
  'aria-label': ariaLabel,
  ...rest
}: {
  options: { value: string; label: string }[]
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <select
        aria-label={ariaLabel}
        className="h-9 appearance-none rounded-control border border-line bg-surface pl-3 pr-8 text-[13px] font-medium text-ink-2 transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:text-ink-3"
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-ink-3"
      />
    </span>
  )
}

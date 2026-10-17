import { Search } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

export function SearchInput({
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <Search aria-hidden className="pointer-events-none absolute left-3 h-4 w-4 text-ink-3" />
      <input
        type="search"
        className="h-9 w-full rounded-control border border-line bg-surface pl-9 pr-3 text-[13px] text-ink placeholder:text-ink-3 transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-0 [&::-webkit-search-cancel-button]:hidden"
        {...rest}
      />
    </span>
  )
}

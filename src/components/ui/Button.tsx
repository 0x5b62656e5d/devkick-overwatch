import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'contrast'
type Size = 'sm' | 'md'

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover disabled:bg-primary/50',
  secondary:
    'bg-surface text-ink border border-line hover:bg-sunken hover:border-line-strong disabled:text-ink-3',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink disabled:text-ink-3',
  danger:
    'bg-critical text-white hover:bg-[#b91c1c] disabled:bg-critical/50',
  contrast: 'bg-ink text-white hover:bg-ink/85 disabled:bg-ink/40',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-[14px] gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  children,
  className = '',
  ...rest
}: {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  children?: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-control font-medium transition-colors duration-150 ease-out disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {Icon ? <Icon aria-hidden className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> : null}
      {children}
    </button>
  )
}

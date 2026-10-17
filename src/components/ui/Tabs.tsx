import { useRef } from 'react'

export function Tabs({
  tabs,
  value,
  onChange,
  'aria-label': ariaLabel,
}: {
  tabs: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  'aria-label': string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    let next = index
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    else return
    e.preventDefault()
    refs.current[next]?.focus()
    onChange(tabs[next].value)
  }

  return (
    <div role="tablist" aria-label={ariaLabel} className="flex gap-4 border-b border-line">
      {tabs.map((tab, i) => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`-mb-px border-b-2 px-0.5 pb-2.5 pt-1 text-[13px] font-medium transition-colors duration-150 ${
              active
                ? 'border-primary text-ink'
                : 'border-transparent text-ink-3 hover:text-ink-2'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

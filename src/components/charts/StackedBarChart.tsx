import { useElementWidth } from '#/lib/hooks/useElementWidth'
import { formatTime } from '#/lib/format'

const KEYS = [
  { key: 'critical', label: 'Critical', color: 'var(--color-critical)' },
  { key: 'error', label: 'Error', color: 'var(--color-error)' },
  { key: 'warning', label: 'Warning', color: 'var(--color-warning)' },
  { key: 'info', label: 'Info', color: 'var(--color-info)' },
] as const

type Key = (typeof KEYS)[number]['key']

const HEIGHT = 220
const PAD = { top: 10, bottom: 22, left: 8 }

export function StackedBarChart({
  buckets,
  height = HEIGHT,
  every = 4,
  xLabel,
}: {
  buckets: ({ t: string } & Record<Key, number>)[]
  height?: number
  every?: number
  xLabel?: (b: { t: string }) => string
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>(600)
  const maxLabelLen = Math.max(1, ...buckets.map((b) => KEYS.reduce((s, k) => s + b[k.key], 0)))
  const longest = String(Math.round(maxLabelLen * 1.06))
  const padRight = 12 + longest.length * 7 + 4
  const innerW = Math.max(1, width - PAD.left - padRight)
  const innerH = Math.max(1, height - PAD.top - PAD.bottom)
  const max = Math.max(1, ...buckets.map((b) => KEYS.reduce((s, k) => s + b[k.key], 0))) * 1.06
  const bw = Math.max(2, innerW / buckets.length - 2)
  const ticks = Array.from({ length: 4 }, (_, i) => PAD.top + (innerH / 3) * i)

  return (
    <div ref={ref}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Error events grouped by severity"
      >
        <title>Error events grouped by severity</title>
        <desc>
          Stacked bars over {buckets.length} buckets. Stack order: critical, error, warning, info.
        </desc>
        {ticks.map((y, i) => (
          <line key={i} x1={PAD.left} x2={width - padRight + 8} y1={y} y2={y} stroke="var(--color-line)" strokeWidth={1} />
        ))}
        {ticks.map((y, i) => (
          <text key={i} x={width - padRight + 12} y={y + 4} fontSize={11} fill="var(--color-ink-3)" className="tnum">
            {Math.round(max * (1 - i / 3))}
          </text>
        ))}
        {buckets.map((b, i) => {
          const x = PAD.left + (i / buckets.length) * innerW + 1
          let acc = 0
          return (
            <g key={i}>
              {KEYS.map((k) => {
                const v = b[k.key]
                const h = (v / max) * innerH
                const y = PAD.top + innerH - ((acc + v) / max) * innerH
                acc += v
                if (v <= 0) return null
                return (
                  <rect
                    key={k.key}
                    x={x}
                    y={y}
                    width={bw}
                    height={Math.max(1, h)}
                    rx={i === acc ? 2 : 2}
                    fill={k.color}
                  >
                    <title>{`${formatTime(b.t)} — ${k.label}: ${v}`}</title>
                  </rect>
                )
              })}
              {i % every === 0 ? (
                <text
                  x={x + bw / 2}
                  y={height - 6}
                  textAnchor={
                    i === 0 ? 'start' : i >= Math.floor((buckets.length - 1) / every) * every ? 'end' : 'middle'
                  }
                  fontSize={11}
                  fill="var(--color-ink-3)"
                >
                  {xLabel ? xLabel(b) : formatTime(b.t)}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4">
        {KEYS.map((k) => (
          <span key={k.key} className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: k.color }} />
            {k.label}
          </span>
        ))}
      </div>
    </div>
  )
}

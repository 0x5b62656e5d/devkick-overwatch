import { useState } from 'react'
import { useElementWidth } from '#/lib/hooks/useElementWidth'
import { formatTime } from '#/lib/format'

export interface AreaSeries {
  name: string
  data: { t: string; value: number }[]
  color: string
  kind?: 'line' | 'bars'
  axis?: 'left' | 'right'
  format?: (v: number) => string
}

const HEIGHT = 220
const PAD = { top: 10, right: 46, bottom: 22, left: 8 }

export function AreaChart({
  series,
  height = HEIGHT,
  yAxisLabel,
}: {
  series: AreaSeries[]
  height?: number
  yAxisLabel?: string
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>(600)
  const [hover, setHover] = useState<number | null>(null)

  const leftSeries = series.filter((s) => (s.axis ?? 'left') === 'left' && s.kind !== 'bars')
  const rightSeries = series.filter((s) => s.axis === 'right' || s.kind === 'bars')
  const primary = series.find((s) => s.kind !== 'bars') ?? series[0]
  const n = primary?.data.length ?? 0

  const innerW = Math.max(1, width - PAD.left - PAD.right)
  const innerH = Math.max(1, height - PAD.top - PAD.bottom)

  const scaleFor = (list: AreaSeries[]) => {
    const max = Math.max(1, ...list.flatMap((s) => s.data.map((d) => d.value)))
    return (v: number) => PAD.top + innerH - (v / (max * 1.08)) * innerH
  }
  const yL = scaleFor(leftSeries.length ? leftSeries : series)
  const yR = scaleFor(rightSeries.length ? rightSeries : series)
  const x = (i: number) => PAD.left + (i / Math.max(1, n - 1)) * innerW

  const ticks = Array.from({ length: 4 }, (_, i) => PAD.top + (innerH / 3) * i)

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * width
    const i = Math.round(((px - PAD.left) / innerW) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div ref={ref}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={yAxisLabel ?? 'Time series chart'}
      >
        <title>{yAxisLabel ?? 'Time series chart'}</title>
        <desc>
          {series.map((s) => `${s.name}: ${s.data.length} points, latest ${s.data[n - 1]?.value}`).join('. ')}
        </desc>
        {/* horizontal gridlines */}
        {ticks.map((y, i) => (
          <line key={i} x1={PAD.left} x2={width - PAD.right + 8} y1={y} y2={y} stroke="var(--color-line)" strokeWidth={1} />
        ))}
        {/* y labels */}
        {ticks.map((y, i) => {
          const list = leftSeries.length ? leftSeries : series
          const max = Math.max(1, ...list.flatMap((s) => s.data.map((d) => d.value))) * 1.08
          const v = max * (1 - i / 3)
          return (
            <text
              key={i}
              x={width - PAD.right + 12}
              y={y + 4}
              fontSize={11}
              fill="var(--color-ink-3)"
              className="tnum"
            >
              {list[0]?.format ? list[0].format(v) : Math.round(v)}
            </text>
          )
        })}
        {/* x labels every 4th tick */}
        {primary?.data.map((d, i) =>
          i % 4 === 0 ? (
            <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontSize={11} fill="var(--color-ink-3)">
              {formatTime(d.t)}
            </text>
          ) : null,
        )}
        {/* bars (secondary axis) */}
        {series
          .filter((s) => s.kind === 'bars')
          .map((s) => {
            const bw = Math.max(2, innerW / n - 3)
            return s.data.map((d, i) => {
              const top = yR(d.value)
              return (
                <rect
                  key={`${s.name}-${i}`}
                  x={x(i) - bw / 2}
                  y={top}
                  width={bw}
                  height={Math.max(1, PAD.top + innerH - top)}
                  rx={2}
                  fill={s.color}
                  fillOpacity={0.5}
                />
              )
            })
          })}
        {/* line series */}
        {series
          .filter((s) => s.kind !== 'bars')
          .map((s) => {
            const y = (s.axis ?? 'left') === 'right' ? yR : yL
            const pts = s.data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ')
            return (
              <g key={s.name}>
                <path
                  d={`${pts} L${x(n - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`}
                  fill={s.color}
                  fillOpacity={0.12}
                />
                <path d={pts} fill="none" stroke={s.color} strokeWidth={1.5} strokeLinejoin="round" />
              </g>
            )
          })}
        {/* hover */}
        {hover !== null && primary ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--color-line-strong)" />
            {series
              .filter((s) => s.kind !== 'bars')
              .map((s) => {
                const y = (s.axis ?? 'left') === 'right' ? yR : yL
                return <circle key={s.name} cx={x(hover)} cy={y(s.data[hover].value)} r={3} fill={s.color} stroke="var(--color-surface)" strokeWidth={1.5} />
              })}
          </g>
        ) : null}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>
      {hover !== null && primary ? (
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-ink-3" aria-hidden>
          <span className="tnum">{formatTime(primary.data[hover].t)}</span>
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
              <span className="tnum text-ink-2">
                {s.name}: {s.format ? s.format(s.data[hover].value) : s.data[hover].value}
              </span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

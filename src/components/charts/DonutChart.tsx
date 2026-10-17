export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 160,
}: {
  segments: { label: string; value: number; color: string }[]
  centerValue: string
  centerLabel?: string
  size?: number
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0))
  const r = size / 2 - 6
  const circ = 2 * Math.PI * r
  let acc = 0

  return (
    <div className="inline-flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel ?? 'Distribution'}>
        <title>{centerLabel ?? 'Distribution'}</title>
        {segments.map((seg) => {
          const frac = seg.value / total
          const dash = frac * circ
          const offset = -acc * circ
          acc += frac
          return (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={12}
              strokeDasharray={`${Math.max(0, dash - 2)} ${circ - Math.max(0, dash - 2)}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )
        })}
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={600} fill="var(--color-ink)" className="tnum">
          {centerValue}
        </text>
        {centerLabel ? (
          <text x="50%" y="62%" textAnchor="middle" fontSize={11} fill="var(--color-ink-3)">
            {centerLabel}
          </text>
        ) : null}
      </svg>
      <ul className="space-y-1.5">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2 text-[13px] text-ink-2">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: seg.color }} />
            <span>{seg.label}</span>
            <span className="tnum ml-auto pl-4 text-ink-3">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

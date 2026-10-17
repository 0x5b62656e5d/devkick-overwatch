export function Sparkline({
  data,
  kind = 'line',
  color = 'var(--color-primary)',
  height = 36,
  label,
}: {
  data: number[]
  kind?: 'line' | 'bars' | 'area'
  color?: string
  height?: number
  label?: string
}) {
  const W = 100
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const span = max - min || 1
  const pts = data.map((v, i) => [ (i / (data.length - 1)) * W, height - 2 - ((v - min) / span) * (height - 6) ] as const)
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label ?? 'Sparkline'}
    >
      <title>{label ?? 'Sparkline'}</title>
      {kind === 'bars'
        ? data.map((v, i) => {
            const bw = W / data.length - 2
            const h = ((v - min) / span) * (height - 4)
            return (
              <rect
                key={i}
                x={(i * W) / data.length + 1}
                y={height - h}
                width={bw}
                height={Math.max(1, h)}
                rx={1}
                fill={color}
                fillOpacity={0.85}
              />
            )
          })
        : (
          <>
            {kind === 'area' ? (
              <path d={`${line} L${W},${height} L0,${height} Z`} fill={color} fillOpacity={0.12} />
            ) : null}
            <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
    </svg>
  )
}

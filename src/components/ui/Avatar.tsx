export function Avatar({
  initials,
  size = 28,
  className = '',
}: {
  initials: string
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center rounded-full bg-info-soft text-[#475569] font-medium ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  )
}

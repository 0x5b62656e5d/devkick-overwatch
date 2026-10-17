import type { Severity, IncidentStatus } from '#/lib/mock/incidents'

type SeverityPill = { kind: 'severity'; value: Severity }
type StatusPill = {
  kind: 'status'
  value:
    | IncidentStatus
    | 'new'
    | 'grouped'
    | 'ignored'
    | 'passing'
    | 'failing'
    | 'passed'
    | 'failed'
    | 'warning'
}
type PillProps = SeverityPill | StatusPill

const severityStyles: Record<Severity, { bg: string; text: string; dot: string; label: string }> = {
  critical: { bg: 'bg-critical-soft', text: 'text-[#991b1b]', dot: 'bg-critical', label: 'Critical' },
  error: { bg: 'bg-error-soft', text: 'text-[#9a3412]', dot: 'bg-error', label: 'Error' },
  warning: { bg: 'bg-warning-soft', text: 'text-[#92400e]', dot: 'bg-warning', label: 'Warning' },
  info: { bg: 'bg-info-soft', text: 'text-[#475569]', dot: 'bg-info', label: 'Info' },
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  investigating: { bg: 'bg-critical-soft', text: 'text-[#991b1b]', label: 'Investigating' },
  monitoring: { bg: 'bg-warning-soft', text: 'text-[#92400e]', label: 'Monitoring' },
  resolved: { bg: 'bg-success-soft', text: 'text-[#166534]', label: 'Resolved' },
  new: { bg: 'bg-critical-soft', text: 'text-[#991b1b]', label: 'New' },
  grouped: { bg: 'bg-primary-soft', text: 'text-[#1e40af]', label: 'Grouped' },
  ignored: { bg: 'bg-info-soft', text: 'text-[#475569]', label: 'Ignored' },
  passing: { bg: 'bg-success-soft', text: 'text-[#166534]', label: 'Passing' },
  failing: { bg: 'bg-critical-soft', text: 'text-[#991b1b]', label: 'Failing' },
  passed: { bg: 'bg-success-soft', text: 'text-[#166534]', label: 'Passed' },
  failed: { bg: 'bg-critical-soft', text: 'text-[#991b1b]', label: 'Failed' },
  warning: { bg: 'bg-warning-soft', text: 'text-[#92400e]', label: 'Warning' },
}

export function Pill(props: PillProps) {
  if (props.kind === 'severity') {
    const s = severityStyles[props.value]
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ${s.bg} ${s.text}`}
      >
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    )
  }
  const s = statusStyles[props.value] ?? statusStyles.ignored
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  )
}

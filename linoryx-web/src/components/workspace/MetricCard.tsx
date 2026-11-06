import type { IconName } from '../Icon'

interface MetricCardProps {
  label: string
  value: string | number
  icon: IconName
  color: 'accent' | 'info' | 'orange' | 'red' | 'green'
}

export function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <article className={'dashboard-panel metric-card metric-' + color}>
      <div className="metric-top">
        <span>{label}</span>
      </div>
      <strong className="metric-value">{value}</strong>
    </article>
  )
}

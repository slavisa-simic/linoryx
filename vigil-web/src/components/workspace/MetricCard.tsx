import { Icon } from '../Icon'
import type { IconName } from '../Icon'

interface MetricCardProps {
  label: string
  value: string | number
  icon: IconName
  color: 'blue' | 'dark-blue' | 'orange' | 'red' | 'green'
}

export function MetricCard({ label, value, icon, color }: MetricCardProps) {
  return (
    <article className={'dashboard-panel metric-card metric-' + color}>
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">
          <Icon name={icon} size={19} />
        </span>
      </div>
      <strong className="metric-value">{value}</strong>
    </article>
  )
}

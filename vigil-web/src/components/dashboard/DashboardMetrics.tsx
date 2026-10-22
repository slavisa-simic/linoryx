import type { DashboardStatistics } from '../../models/dashboard'
import { MetricCard } from '../workspace/MetricCard'

export function DashboardMetrics({ data }: { data: DashboardStatistics }) {
  let resolution = '—'

  if (data.total > 0) {
    resolution = data.resolutionRate + '%'
  }

  return (
    <section className="metric-grid" aria-label="Incident metrics, all time">
      <MetricCard label="Total incidents" value={data.total} icon="layers" color="blue" />
      <MetricCard label="Active incidents" value={data.active} icon="clock" color="orange" />
      <MetricCard label="Critical incidents" value={data.critical} icon="alert" color="red" />
      <MetricCard label="Resolution rate" value={resolution} icon="check-circle" color="green" />
    </section>
  )
}

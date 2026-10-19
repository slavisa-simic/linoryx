import type { DashboardStatistics } from '../../models/dashboard'
import { Icon } from '../Icon'

export function DashboardMetrics({ data }: { data: DashboardStatistics }) {
  let criticalLabel = 'All clear'
  let criticalClass = 'metric-label label-green'
  let resolution = '—'

  if (data.critical > 0) {
    criticalLabel = 'Needs attention'
    criticalClass = 'metric-label label-red'
  }
  if (data.total > 0) {
    resolution = data.resolutionRate + '%'
  }

  return (
    <section className="metric-grid" aria-label="Incident metrics, all time">
      <article className="dashboard-panel metric-card">
        <div className="metric-top">
          <span>Total incidents</span>
          <span className="metric-icon metric-icon-blue">
            <Icon name="layers" size={19} />
          </span>
        </div>
        <strong className="metric-value">{data.total}</strong>
        <div className="metric-note">
          <span className="metric-label">All time</span>
          <span>Across all categories</span>
        </div>
      </article>

      <article className="dashboard-panel metric-card">
        <div className="metric-top">
          <span>Active incidents</span>
          <span className="metric-icon metric-icon-amber">
            <Icon name="clock" size={19} />
          </span>
        </div>
        <strong className="metric-value">{data.active}</strong>
        <div className="metric-note">
          <span className="metric-label label-amber">{data.status[0].value} open</span>
          <span>{data.status[1].value} in progress</span>
        </div>
      </article>

      <article className="dashboard-panel metric-card">
        <div className="metric-top">
          <span>Critical incidents</span>
          <span className="metric-icon metric-icon-red">
            <Icon name="alert" size={19} />
          </span>
        </div>
        <strong className="metric-value">{data.critical}</strong>
        <div className="metric-note">
          <span className={criticalClass}>{criticalLabel}</span>
          <span>Active critical priority</span>
        </div>
      </article>

      <article className="dashboard-panel metric-card">
        <div className="metric-top">
          <span>Resolution rate</span>
          <span className="metric-icon metric-icon-green">
            <Icon name="check-circle" size={19} />
          </span>
        </div>
        <strong className="metric-value">{resolution}</strong>
        <div className="metric-note">
          <span className="metric-label label-green">{data.completed} completed</span>
          <span>Resolved or closed</span>
        </div>
      </article>
    </section>
  )
}

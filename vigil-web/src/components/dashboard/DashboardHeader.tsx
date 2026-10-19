import { formatDate } from '../../services/dashboardData'
import { Icon } from '../Icon'

interface DashboardHeaderProps {
  loadedAt: number
  restricted: boolean
  loading: boolean
  onRefresh(): void
}

export function DashboardHeader({ loadedAt, restricted, loading, onRefresh }: DashboardHeaderProps) {
  return (
    <div className="dashboard-heading">
      <div>
        <h1>
          Dashboard<span className="heading-period">.</span>
        </h1>
        <p>A clear view of your incidents. A better handle on what’s next.</p>
      </div>
      <div className="dashboard-heading-actions">
        <div className="dashboard-date">
          <Icon name="calendar" size={16} />
          <span>
            {formatDate(loadedAt, { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        {!restricted && (
          <button
            className="dashboard-button button-neutral refresh-button"
            type="button"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh dashboard"
          >
            <Icon name="refresh" size={16} />
            <span>Refresh</span>
          </button>
        )}
      </div>
    </div>
  )
}

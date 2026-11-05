import { formatDate } from '../../services/dashboardData'
import { Icon } from '../Icon'
import { RefreshButton } from '../workspace/RefreshButton'

interface DashboardHeaderProps {
  loadedAt: number
  restricted: boolean
  loading: boolean
  onRefresh(): void
}

export function DashboardHeader({ loadedAt, restricted, loading, onRefresh }: DashboardHeaderProps) {
  return (
    <div className="page-heading dashboard-heading">
      <div>
        <h1>
          Dashboard<span className="heading-period">.</span>
        </h1>
      </div>
      <div className="dashboard-heading-actions">
        <div className="dashboard-date">
          <Icon name="calendar" size={16} />
          <span>
            {formatDate(loadedAt, { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        {!restricted && (
          <RefreshButton onClick={onRefresh} disabled={loading} ariaLabel="Refresh dashboard" />
        )}
      </div>
    </div>
  )
}

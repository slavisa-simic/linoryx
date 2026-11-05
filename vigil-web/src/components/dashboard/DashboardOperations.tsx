import type { DashboardStatistics } from '../../models/dashboard'
import type { Technician } from '../../models/users'
import { formatDuration } from '../../services/dashboardData'
import { Icon } from '../Icon'

interface DashboardOperationsProps {
  data: DashboardStatistics
  technicians: Technician[]
  canManageIncidents: boolean
}

export function DashboardOperations({ data, technicians, canManageIncidents }: DashboardOperationsProps) {
  let teamLabel = 'Your workload'
  let teamCount = 0
  for (const workload of data.workload) {
    teamCount += workload.value
  }
  let teamIcon: 'shield' | 'users' = 'shield'

  if (canManageIncidents) {
    teamLabel = 'Enabled technicians'
    teamCount = technicians.length
    teamIcon = 'users'
  }

  return (
    <section className="operations-strip" aria-label="Additional operational metrics">
      <div>
        <span className="strip-icon">
          <Icon name="clock" size={20} />
        </span>
        <div>
          <span>Average incident closure</span>
          <strong>
            {formatDuration(data.averageResolutionHours)}
          </strong>
        </div>
      </div>
      <div>
        <span className="strip-icon">
          <Icon name="assign" size={20} />
        </span>
        <div>
          <span>Reports awaiting assignment</span>
          <strong>
            {data.unassigned}
          </strong>
        </div>
      </div>
      <div>
        <span className="strip-icon">
          <Icon name={teamIcon} size={20} />
        </span>
        <div>
          <span>{teamLabel}</span>
          <strong>
            {teamCount}
          </strong>
        </div>
      </div>
    </section>
  )
}

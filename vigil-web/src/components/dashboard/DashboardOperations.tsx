import type { DashboardStatistics } from '../../models/dashboard'
import type { User } from '../../models/users'
import { formatDuration } from '../../services/dashboardData'
import { Icon } from '../Icon'

interface DashboardOperationsProps {
  data: DashboardStatistics
  users: User[]
  admin: boolean
}

export function DashboardOperations({ data, users, admin }: DashboardOperationsProps) {
  let availableTechnicians = 0
  for (const user of users) {
    if (user.enabled && user.role === 'TECHNICIAN') {
      availableTechnicians = availableTechnicians + 1
    }
  }

  let teamLabel = 'Your workload'
  let teamCount = data.active
  let teamIcon: 'shield' | 'users' = 'shield'

  if (admin) {
    teamLabel = 'Available technicians'
    teamCount = availableTechnicians
    teamIcon = 'users'
  }

  return (
    <section className="operations-strip" aria-label="Additional operational metrics">
      <div>
        <span className="strip-icon">
          <Icon name="clock" size={20} />
        </span>
        <div>
          <span>Average resolution</span>
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
          <span>Awaiting assignment</span>
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

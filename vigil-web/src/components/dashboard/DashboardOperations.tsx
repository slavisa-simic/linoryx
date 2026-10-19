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
  let teamDescription = 'active incidents assigned to you'
  let teamIcon: 'shield' | 'users' = 'shield'
  let resolutionDescription = 'No resolved incidents yet'

  if (admin) {
    teamLabel = 'Available technicians'
    teamCount = availableTechnicians
    teamDescription = 'enabled technician accounts'
    teamIcon = 'users'
  }
  if (data.resolutionSampleSize > 0) {
    resolutionDescription = 'across ' + data.resolutionSampleSize + ' timed resolutions'
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
            <small>{resolutionDescription}</small>
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
            <small>active incidents without a technician</small>
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
            <small>{teamDescription}</small>
          </strong>
        </div>
      </div>
    </section>
  )
}

import type { AuditEntry } from '../../models/audit'
import type { Incident } from '../../models/incidents'
import { formatDate } from '../../services/dashboardData'
import { Icon } from '../Icon'

interface DashboardActivityProps {
  activity: AuditEntry[]
  incidents: Incident[]
  onOpen(incident: Incident): void
}

const activityLabels = {
  CREATED: 'reported an incident',
  ASSIGNED: 'assigned an incident',
  STARTED: 'started working on an incident',
  RESOLVED: 'resolved an incident',
  CLOSED: 'closed an incident',
  COMMENT_ADDED: 'commented on an incident',
  USER_ROLE_CHANGED: 'changed a user role',
  USER_DISABLED: 'disabled an account',
  USER_ENABLED: 'enabled an account'
}

const roleLabels = {
  ADMIN: 'Administrator',
  TECHNICIAN: 'Technician',
  USER: 'User'
}

export function DashboardActivity({
  activity,
  incidents,
  onOpen
}: DashboardActivityProps) {
  return (
    <section className="dashboard-panel activity-panel">
      <header className="panel-heading">
        <div>
          <h2>Recent activity</h2>
          <p>The latest across your workspace</p>
        </div>
        <span className="activity-header-icon">
          <Icon name="history" size={18} />
        </span>
      </header>

      {activity.length === 0 && (
        <div className="activity-empty">
          <Icon name="history" size={28} />
          <p>No activity yet. Incident updates will appear here.</p>
        </div>
      )}

      <ol className="activity-list">
        {activity.map(function (entry) {
          const incident = incidents.find(
            (item) => item.id === entry.incidentId
          )
          let icon: 'layers' | 'check' | 'assign' | 'clock' | 'users' = 'layers'
          let userDetail = ''
          if (entry.incidentId === null) {
            icon = 'users'
            userDetail =
              entry.targetUserFirstName + ' ' + entry.targetUserLastName
            if (entry.previousRole && entry.newRole) {
              userDetail =
                userDetail +
                ' · ' +
                roleLabels[entry.previousRole] +
                ' → ' +
                roleLabels[entry.newRole]
            }
          }

          if (entry.action === 'RESOLVED' || entry.action === 'CLOSED') {
            icon = 'check'
          } else if (entry.action === 'ASSIGNED') {
            icon = 'assign'
          } else if (entry.action === 'STARTED') {
            icon = 'clock'
          }

          return (
            <li key={entry.id}>
              <span
                className={
                  'activity-dot activity-' + entry.action.toLowerCase()
                }
              >
                <Icon name={icon} size={14} />
              </span>
              <div>
                <p>
                  <strong>
                    {entry.actorFirstName} {entry.actorLastName}
                  </strong>{' '}
                  {activityLabels[entry.action]}.
                </p>
                {incident && (
                  <button
                    className="activity-incident"
                    type="button"
                    onClick={() => onOpen(incident)}
                  >
                    INC-{entry.incidentId}
                    <Icon name="arrow-up-right" size={12} />
                  </button>
                )}
                {!incident && entry.incidentId !== null && (
                  <span className="incident-reference">
                    INC-{entry.incidentId}
                  </span>
                )}
                {userDetail && (
                  <span className="incident-reference">{userDetail}</span>
                )}
                <time dateTime={entry.createdAt}>
                  {formatDate(entry.createdAt, {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </time>
              </div>
            </li>
          )
        })}
      </ol>

      <footer className="activity-footer">
        <Icon name="shield" size={14} />
        <span>Every update leaves a trace.</span>
      </footer>
    </section>
  )
}

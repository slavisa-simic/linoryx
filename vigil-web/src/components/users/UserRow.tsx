import { useState } from 'react'
import type { UserRole } from '../../models/users'
import type { User } from '../../models/users'
import { formatDate, userName } from '../../services/dashboardData'
import { Icon } from '../Icon'

interface UserRowProps {
  user: User
  currentUserId: number
  busy: boolean
  onRoleChange(user: User, role: UserRole): void
  onAccessChange(user: User): void
  serviceStatus: string
  servicesAvailable: boolean
  onAssignService(user: User): void
  onViewServices(user: User): void
}

const roleIcons = {
  ADMIN: 'shield',
  DISPATCHER: 'headset',
  TECHNICIAN: 'wrench',
  USER: 'user'
} as const

export function UserRow({
  user,
  currentUserId,
  busy,
  onRoleChange,
  onAccessChange,
  serviceStatus,
  servicesAvailable,
  onAssignService,
  onViewServices
}: UserRowProps) {
  const [role, setRole] = useState(user.role)
  const ownAccount = user.id === currentUserId
  const name = userName(user)
  let status = 'Disabled'
  let statusClass = 'user-status user-disabled'
  let accessLabel = 'Enable'
  if (user.enabled) {
    status = 'Active'
    statusClass = 'user-status user-active'
    accessLabel = 'Disable'
  }

  return (
    <tr>
      <td>
        <div className="user-table-name">
          <Icon name={roleIcons[user.role]} size={19} />
          <div>
            <strong>{name}</strong>
            {ownAccount && <span>Your account</span>}
          </div>
        </div>
      </td>
      <td className="user-table-email">{user.email}</td>
      <td>
        <form
          className="user-role-form"
          onSubmit={(event) => {
            event.preventDefault()
            onRoleChange(user, role)
          }}
        >
          <label className="sr-only" htmlFor={'user-role-' + user.id}>
            Role for {name}
          </label>
          <select
            id={'user-role-' + user.id}
            value={role}
            disabled={busy || ownAccount}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            <option value="USER">User</option>
            <option value="TECHNICIAN">Technician</option>
            <option value="DISPATCHER">Dispatcher</option>
            <option value="ADMIN">Administrator</option>
          </select>
          <button
            className="user-save-button"
            type="submit"
            disabled={busy || ownAccount || role === user.role}
            aria-label={'Save role for ' + name}
          >
            Save
          </button>
        </form>
      </td>
      <td>
        <span className={statusClass}>
          <span className="status-dot" />
          {status}
        </span>
      </td>
      <td>{user.role === 'USER' ? serviceStatus : '—'}</td>
      <td className="table-date">
        {formatDate(user.createdAt, {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })}
      </td>
      <td>
        <button
          className="user-access-button"
          type="button"
          disabled={busy || ownAccount}
          onClick={() => onAccessChange(user)}
          aria-label={accessLabel + ' account for ' + name}
        >
          {accessLabel}
        </button>
      </td>
      <td>{user.role === 'USER' && <div className="user-service-actions">
        <button className="user-save-button" type="button" disabled={busy || !servicesAvailable}
          onClick={() => onAssignService(user)}>Assign service</button>
        <button className="user-access-button" type="button" disabled={busy || !servicesAvailable}
          onClick={() => onViewServices(user)}>View services</button>
      </div>}</td>
    </tr>
  )
}

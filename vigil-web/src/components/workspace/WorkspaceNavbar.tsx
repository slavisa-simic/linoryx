import type { WorkspacePage } from '../../models/navigation'
import { useUser } from '../../context/UserContext'
import { userName } from '../../services/dashboardData'
import type { MouseEvent } from 'react'
import { BrandLogo } from '../auth/BrandLogo'
import { Icon } from '../Icon'

interface WorkspaceNavbarProps {
  page: WorkspacePage
  onNavigate(page: WorkspacePage): void
}

const roleLabels = {
  ADMIN: 'Administrator',
  DISPATCHER: 'Dispatcher',
  TECHNICIAN: 'Technician',
  USER: 'User'
}
const roleIcons = {
  ADMIN: 'shield',
  DISPATCHER: 'headset',
  TECHNICIAN: 'wrench',
  USER: 'user'
} as const

export function WorkspaceNavbar({
  page,
  onNavigate
}: WorkspaceNavbarProps) {
  const { session, user, onLogout } = useUser()
  let name = session.email
  if (user) {
    name = userName(user)
  }
  const admin = session.role === 'ADMIN'
  const canViewAudit = admin || session.role === 'DISPATCHER'
  let reportsLabel = 'Reports'
  if (session.role === 'USER') reportsLabel = 'My reports'
  if (session.role === 'TECHNICIAN') reportsLabel = 'Assigned reports'
  let homePage: 'dashboard' | 'services' = 'dashboard'
  if (session.role === 'USER') {
    homePage = 'services'
  }
  let dashboardClass = 'workspace-nav-item'
  let incidentsClass = 'workspace-nav-item'
  let usersClass = 'workspace-nav-item'
  let auditClass = 'workspace-nav-item'
  let dashboardCurrent: 'page' | undefined
  let incidentsCurrent: 'page' | undefined
  let usersCurrent: 'page' | undefined
  let auditCurrent: 'page' | undefined
  if (page === 'dashboard') {
    dashboardClass = dashboardClass + ' is-active'
    dashboardCurrent = 'page'
  }
  if (page === 'incidents') {
    incidentsClass = incidentsClass + ' is-active'
    incidentsCurrent = 'page'
  }
  if (page === 'users') {
    usersClass = usersClass + ' is-active'
    usersCurrent = 'page'
  }
  if (page === 'audit') {
    auditClass = auditClass + ' is-active'
    auditCurrent = 'page'
  }

  function navigate(
    event: MouseEvent<HTMLAnchorElement>,
    nextPage: WorkspacePage
  ) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return
    }
    event.preventDefault()
    onNavigate(nextPage)
  }

  return (
    <header className="workspace-header">
      <div className="workspace-navbar">
        <a
          className="workspace-brand"
          href={'/' + homePage}
          aria-label="Vigil home"
          onClick={(event) => navigate(event, homePage)}
        >
          <BrandLogo />
        </a>

        <nav className="workspace-navigation" aria-label="Main navigation">
          <span className="workspace-nav-label">Workspace</span>
          {session.role !== 'USER' && (
            <a
              className={dashboardClass}
              href="/dashboard"
              aria-current={dashboardCurrent}
              onClick={(event) => navigate(event, 'dashboard')}
            >
              <Icon name="dashboard" size={17} />
              Dashboard
            </a>
          )}
          {session.role !== 'USER' && <a
            className={incidentsClass}
            href="/incidents"
            aria-current={incidentsCurrent}
            onClick={(event) => navigate(event, 'incidents')}
          >
            <Icon name="layers" size={17} />
            Incidents
          </a>}
          <a className={page === 'reports' ? 'workspace-nav-item is-active' : 'workspace-nav-item'}
            href="/reports" aria-current={page === 'reports' ? 'page' : undefined} onClick={event => navigate(event, 'reports')}>
            <Icon name="inbox" size={17} />{reportsLabel}
          </a>
          {admin && (
            <a
              className={usersClass}
              href="/users"
              aria-current={usersCurrent}
              onClick={(event) => navigate(event, 'users')}
            >
              <Icon name="users" size={17} />
              Users
            </a>
          )}
          {(admin || session.role === 'TECHNICIAN') && (
            <a className={page === 'network' ? 'workspace-nav-item is-active' : 'workspace-nav-item'}
              href="/network" aria-current={page === 'network' ? 'page' : undefined}
              onClick={(event) => navigate(event, 'network')}>
              <Icon name="network" size={17} />Network
            </a>
          )}
          {session.role === 'TECHNICIAN' && <a className={page === 'profile' ? 'workspace-nav-item is-active' : 'workspace-nav-item'}
            href="/profile" aria-current={page === 'profile' ? 'page' : undefined} onClick={event => navigate(event, 'profile')}>
            <Icon name="user" size={17} />My Profile</a>}
          {canViewAudit && <a className={page === 'technicians' ? 'workspace-nav-item is-active' : 'workspace-nav-item'}
            href="/technicians" aria-current={page === 'technicians' ? 'page' : undefined} onClick={event => navigate(event, 'technicians')}>
            <Icon name="wrench" size={17} />Technicians</a>}
          {session.role === 'USER' && (
            <a className={page === 'services' ? 'workspace-nav-item is-active' : 'workspace-nav-item'}
              href="/services" aria-current={page === 'services' ? 'page' : undefined}
              onClick={(event) => navigate(event, 'services')}>
              <Icon name="router" size={17} />My services
            </a>
          )}
          {canViewAudit && (
            <a
              className={auditClass}
              href="/audit"
              aria-current={auditCurrent}
              onClick={(event) => navigate(event, 'audit')}
            >
              <Icon name="history" size={17} />
              Audit logs
            </a>
          )}
        </nav>

        <div className="workspace-account">
          <div className="account-profile">
            <Icon
              name={roleIcons[session.role]}
              size={22}
              className="account-role-icon"
            />
            <div className="account-identity" title={session.email}>
              <span className="account-name">{name}</span>
              <span className="account-role">{roleLabels[session.role]}</span>
            </div>
          </div>
          <button
            className="logout-button"
            type="button"
            onClick={onLogout}
            aria-label="Logout"
            title="Logout"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}

import { useUser } from '../../context/UserContext'
import { userName } from '../../services/dashboardData'
import type { MouseEvent } from 'react'
import { BrandLogo } from '../auth/BrandLogo'
import { Icon } from '../Icon'

interface WorkspaceNavbarProps {
  page: 'dashboard' | 'incidents'
  onNavigate(page: 'dashboard' | 'incidents'): void
}

const roleLabels = {
  ADMIN: 'Administrator',
  TECHNICIAN: 'Technician',
  USER: 'User'
}
const roleIcons = {
  ADMIN: 'shield',
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
  let dashboardClass = 'workspace-nav-item'
  let incidentsClass = 'workspace-nav-item'
  let dashboardCurrent: 'page' | undefined
  let incidentsCurrent: 'page' | undefined
  if (page === 'dashboard') {
    dashboardClass = dashboardClass + ' is-active'
    dashboardCurrent = 'page'
  }
  if (page === 'incidents') {
    incidentsClass = incidentsClass + ' is-active'
    incidentsCurrent = 'page'
  }

  function navigate(
    event: MouseEvent<HTMLAnchorElement>,
    nextPage: 'dashboard' | 'incidents'
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
          href="/dashboard"
          aria-label="Vigil dashboard"
          onClick={(event) => navigate(event, 'dashboard')}
        >
          <BrandLogo />
        </a>

        <nav className="workspace-navigation" aria-label="Main navigation">
          <a
            className={dashboardClass}
            href="/dashboard"
            aria-current={dashboardCurrent}
            onClick={(event) => navigate(event, 'dashboard')}
          >
            <Icon name="dashboard" size={17} />
            Dashboard
          </a>
          <a
            className={incidentsClass}
            href="/incidents"
            aria-current={incidentsCurrent}
            onClick={(event) => navigate(event, 'incidents')}
          >
            <Icon name="layers" size={17} />
            Incidents
          </a>
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
      {session.role === 'TECHNICIAN' && (
        <div className="workspace-scope">
          Technician workspace · Showing incidents assigned to you
        </div>
      )}
    </header>
  )
}

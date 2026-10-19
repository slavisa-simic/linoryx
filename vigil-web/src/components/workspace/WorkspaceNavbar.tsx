import { useUser } from '../../context/UserContext'
import { userName } from '../../services/dashboardData'
import { BrandLogo } from '../auth/BrandLogo'
import { Icon } from '../Icon'



const roleLabels = { ADMIN: 'Administrator', TECHNICIAN: 'Technician', USER: 'User' }
const roleIcons = { ADMIN: 'shield', TECHNICIAN: 'wrench', USER: 'user' } as const

export function WorkspaceNavbar() {
  const { session, user, onLogout } = useUser()
  let name = session.email
  if (user) {
    name = userName(user)
  }
  const admin = session.role === 'ADMIN'

  return (
    <header className="workspace-header">
      <div className="workspace-navbar">
        <a className="workspace-brand" href="/dashboard" aria-label="Vigil dashboard">
          <BrandLogo />
        </a>

        <nav className="workspace-navigation" aria-label="Main navigation">
          <a className="workspace-nav-item is-active" href="/dashboard" aria-current="page">
            <Icon name="dashboard" size={17} />
            Dashboard
          </a>
          <span className="nav-upcoming">
            <button
              className="workspace-nav-item"
              type="button"
              disabled
              aria-label="Incidents — coming soon"
            >
              <Icon name="layers" size={17} />
              Incidents
            </button>
            <span className="nav-upcoming-label">Coming soon</span>
          </span>
          {admin && (
            <>
              <span className="nav-upcoming">
                <button
                  className="workspace-nav-item"
                  type="button"
                  disabled
                  aria-label="Assign — coming soon"
                >
                  <Icon name="assign" size={17} />
                  Assign
                </button>
                <span className="nav-upcoming-label">Coming soon</span>
              </span>
              <span className="nav-upcoming">
                <button
                  className="workspace-nav-item"
                  type="button"
                  disabled
                  aria-label="Users — coming soon"
                >
                  <Icon name="users" size={17} />
                  Users
                </button>
                <span className="nav-upcoming-label">Coming soon</span>
              </span>
              <span className="nav-upcoming">
                <button
                  className="workspace-nav-item"
                  type="button"
                  disabled
                  aria-label="Audit log — coming soon"
                >
                  <Icon name="history" size={17} />
                  Audit log
                </button>
                <span className="nav-upcoming-label">Coming soon</span>
              </span>
            </>
          )}
        </nav>

        <div className="workspace-account">
          <div className="account-profile">
            <Icon name={roleIcons[session.role]} size={22} className="account-role-icon" />
            <div className="account-identity" title={session.email}>
              <span className="account-name">{name}</span>
              <span className="account-role">{roleLabels[session.role]}</span>
            </div>
          </div>
          <button className="logout-button" type="button" onClick={onLogout} aria-label="Logout" title="Logout">
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

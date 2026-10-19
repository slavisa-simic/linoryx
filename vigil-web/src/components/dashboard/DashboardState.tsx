import { Icon } from '../Icon'

interface DashboardStateProps {
  name: string
  restricted: boolean
  loading: boolean
  error: string
  onRetry(): void
}

export function DashboardState({ name, restricted, loading, error, onRetry }: DashboardStateProps) {
  return (
    <>
      {restricted && (
        <section className="dashboard-panel dashboard-state">
          <div className="state-icon">
            <Icon name="shield" size={28} />
          </div>
          <h2>Welcome to your workspace, {name}.</h2>
          <p>
            The incident analytics overview is available to administrators and
            technicians. Your account has the User role.
          </p>
        </section>
      )}
      {loading && (
        <div className="dashboard-panel dashboard-state" role="status">
          Loading dashboard…
        </div>
      )}
      {error && error !== 'SESSION_EXPIRED' && (
        <div className="dashboard-error" role="alert">
          <Icon name="alert" size={19} />
          <p>{error}</p>
          <button
            className="dashboard-button button-neutral"
            type="button"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      )}
    </>
  )
}

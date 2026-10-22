import { Icon } from '../Icon'

interface DashboardStateProps {
  restricted: boolean
  error: string
  onRetry(): void
}

export function DashboardState({ restricted, error, onRetry }: DashboardStateProps) {
  return (
    <>
      {restricted && (
        <section className="dashboard-panel dashboard-state">
          <div className="state-icon">
            <Icon name="shield" size={28} />
          </div>
          <h2>Access restricted</h2>
          <p>
            Available to administrators and technicians.
          </p>
        </section>
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

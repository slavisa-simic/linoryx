import { Icon } from '../Icon'
import { RefreshButton } from '../workspace/RefreshButton'

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
            Available to administrators, dispatchers and technicians.
          </p>
        </section>
      )}
      {error && error !== 'SESSION_EXPIRED' && (
        <div className="dashboard-error" role="alert">
          <Icon name="alert" size={19} />
          <p>{error}</p>
          <RefreshButton onClick={onRetry} label="Try again" />
        </div>
      )}
    </>
  )
}

import type { WorkspacePage } from '../models/navigation'
import { useUser } from '../context/UserContext'
import { useEffect, useState } from 'react'
import { getDashboard } from '../api/dashboardApi'
import type { DashboardSnapshot } from '../models/dashboard'
import type { Incident } from '../models/incidents'
import type { Technician } from '../models/users'
import { buildDashboard } from '../services/dashboardData'
import { WorkspaceNavbar } from '../components/workspace/WorkspaceNavbar'
import { DashboardMetrics } from '../components/dashboard/DashboardMetrics'
import { DashboardCharts } from '../components/dashboard/DashboardCharts'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardState } from '../components/dashboard/DashboardState'
import { DashboardOperations } from '../components/dashboard/DashboardOperations'

interface DashboardPageProps {
  onNavigate(
    page: WorkspacePage,
    incidentId?: number
  ): void
}

export default function DashboardPage({
  onNavigate
}: DashboardPageProps) {
  const { session, onSessionExpired } = useUser()
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(session.role !== 'USER')
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [days, setDays] = useState(30)
  const [openedAt] = useState(() => Date.now())

  // Ucitamo podatke pri otvaranju stranice i posle klika na Refresh.
  useEffect(
    function () {
      async function loadDashboard() {
        try {
          const result = await getDashboard(session)
          setSnapshot(result)
        } catch (error) {
          if (error instanceof Error) {
            setError(error.message)
          } else {
            setError('The overview could not be loaded. Please try again.')
          }
        } finally {
          setLoading(false)
        }
      }

      if (session.role !== 'USER') {
        loadDashboard()
      }
    },
    [session, refresh]
  )

  useEffect(
    function () {
      if (error === 'SESSION_EXPIRED') {
        onSessionExpired()
      }
    },
    [error, onSessionExpired]
  )

  let incidents: Incident[] = []
  let technicians: Technician[] = []
  let loadedAt = openedAt

  if (snapshot) {
    incidents = snapshot.incidents
    technicians = snapshot.technicians
    loadedAt = snapshot.loadedAt
  }

  const data = buildDashboard(incidents, technicians, days, new Date(loadedAt), snapshot?.reports || [])
  const canManageIncidents = session.role === 'ADMIN' || session.role === 'DISPATCHER'
  const restricted = session.role === 'USER'

  function refreshDashboard() {
    setLoading(true)
    setError('')
    setSnapshot(null)
    setRefresh(refresh + 1)
  }

  return (
    <div className="workspace">
      <a className="skip-link" href="#dashboard-main">
        Skip to dashboard
      </a>
      <WorkspaceNavbar
        page="dashboard"
        onNavigate={onNavigate}
      />

      <main className="dashboard-main" id="dashboard-main">
        <DashboardHeader
          loadedAt={loadedAt}
          restricted={restricted}
          loading={loading}
          onRefresh={refreshDashboard}
        />

        <DashboardState
          restricted={restricted}
          error={error}
          onRetry={refreshDashboard}
        />

        {!restricted && !loading && !error && snapshot && (
          <>
            <DashboardMetrics data={data} />
            <DashboardCharts
              data={data}
              days={days}
              onDaysChange={setDays}
            />

            <DashboardOperations
              data={data}
              technicians={technicians}
              canManageIncidents={canManageIncidents}
            />
          </>
        )}
      </main>
    </div>
  )
}

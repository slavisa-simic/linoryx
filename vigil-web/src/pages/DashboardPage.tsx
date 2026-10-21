import { useUser } from '../context/UserContext'
import { useEffect, useState } from 'react'
import { getDashboard } from '../api/dashboardApi'
import type { AuditEntry } from '../models/audit'
import type { DashboardSnapshot } from '../models/dashboard'
import type { Incident, IncidentStatus } from '../models/incidents'
import type { User } from '../models/users'
import { buildDashboard, userName } from '../services/dashboardData'
import { WorkspaceNavbar } from '../components/workspace/WorkspaceNavbar'
import { IncidentDialog } from '../components/workspace/IncidentDialog'
import { DashboardMetrics } from '../components/dashboard/DashboardMetrics'
import { DashboardActivity } from '../components/dashboard/DashboardActivity'
import { DashboardCharts } from '../components/dashboard/DashboardCharts'
import { IncidentsTable } from '../components/dashboard/IncidentsTable'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { DashboardState } from '../components/dashboard/DashboardState'
import { DashboardOperations } from '../components/dashboard/DashboardOperations'
import { DashboardFooter } from '../components/dashboard/DashboardFooter'
import '../Dashboard.css'

interface DashboardPageProps {
  onNavigate(
    page: 'dashboard' | 'incidents',
    incidentId?: number
  ): void
}

export default function DashboardPage({
  onNavigate
}: DashboardPageProps) {
  const { session, user: profile, onSessionExpired } = useUser()
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(session.role !== 'USER')
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [days, setDays] = useState(30)
  const [status, setStatus] = useState<IncidentStatus | 'ALL'>('ALL')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null
  )
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
  let users: User[] = []
  let activity: AuditEntry[] = []
  let loadedAt = openedAt

  if (snapshot) {
    incidents = snapshot.incidents
    users = snapshot.users
    activity = snapshot.activity
    loadedAt = snapshot.loadedAt
  }

  let name = session.email
  let currentUser = profile
  if (!currentUser) {
    const matchingUser = users.find((user) => user.id === session.userId)
    if (matchingUser) {
      currentUser = matchingUser
    }
  }
  if (currentUser) {
    name = userName(currentUser)
  }

  const data = buildDashboard(incidents, users, days, new Date(loadedAt))
  const admin = session.role === 'ADMIN'
  const restricted = session.role === 'USER'
  let bottomClass = 'dashboard-bottom-grid without-activity'
  if (admin) {
    bottomClass = 'dashboard-bottom-grid'
  }

  function refreshDashboard() {
    setLoading(true)
    setError('')
    setSnapshot(null)
    setRefresh(refresh + 1)
  }

  function selectStatus(nextStatus: IncidentStatus) {
    setStatus(nextStatus)
    const table = document.getElementById('incident-list')
    if (table) {
      table.scrollIntoView({ block: 'start' })
    }
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
          name={name}
          restricted={restricted}
          loading={loading}
          error={error}
          onRetry={refreshDashboard}
        />

        {!restricted && !loading && !error && snapshot && (
          <>
            <DashboardMetrics data={data} />
            <div className="dashboard-section-label">
              <span>INCIDENT INSIGHTS</span>
              <span>
                <span className="data-scope-dot" />
                Current snapshot · all incidents
              </span>
            </div>
            <DashboardCharts
              data={data}
              days={days}
              onDaysChange={setDays}
              onStatusSelect={selectStatus}
            />

            <DashboardOperations data={data} users={users} admin={admin} />

            <div className={bottomClass}>
              <IncidentsTable
                incidents={incidents}
                status={status}
                onStatusChange={setStatus}
                onOpen={setSelectedIncident}
              />
              {admin && (
                <DashboardActivity
                  activity={activity}
                  incidents={incidents}
                  onOpen={setSelectedIncident}
                />
              )}
            </div>

            <DashboardFooter loadedAt={loadedAt} incidents={incidents} admin={admin} />
          </>
        )}

        <footer className="workspace-footer">
          <span>© {new Date(openedAt).getFullYear()} Vigil</span>
          <span>Stay aware. Stay ahead.</span>
        </footer>
      </main>

      {selectedIncident && (
        <IncidentDialog
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onManage={() => onNavigate('incidents', selectedIncident.id)}
        />
      )}
    </div>
  )
}

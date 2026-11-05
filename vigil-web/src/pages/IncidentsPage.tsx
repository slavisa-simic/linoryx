import type { WorkspacePage } from '../models/navigation'
import { useUser } from '../context/UserContext'
import { useEffect, useState } from 'react'
import type { Incident, IncidentStatus } from '../models/incidents'
import type { Technician } from '../models/users'
import { getIncident, listIncidents } from '../api/incidentsApi'
import { getTechnicians } from '../api/techniciansApi'
import { WorkspaceNavbar } from '../components/workspace/WorkspaceNavbar'
import { RefreshButton } from '../components/workspace/RefreshButton'
import { MetricCard } from '../components/workspace/MetricCard'
import { IncidentsTable } from '../components/incidents/IncidentsTable'
import { ExportIncidentsButton } from '../components/incidents/ExportIncidentsButton'
import { IncidentDetails } from '../components/incidents/IncidentDetails'
import { FormMessage } from '../components/auth/FormMessage'
import { Icon } from '../components/Icon'

interface IncidentsPageProps {
  onNavigate(
    page: WorkspacePage,
    incidentId?: number
  ): void
}

export function IncidentsPage({
  onNavigate
}: IncidentsPageProps) {
  const { session, onSessionExpired } = useUser()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [status, setStatus] = useState<IncidentStatus | 'ALL'>('ALL')
  const [selected, setSelected] = useState<Incident | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const items = await listIncidents(session)
        let team: Technician[] = []
        if (session.role === 'ADMIN' || session.role === 'DISPATCHER') {
          team = await getTechnicians(session)
        }
        if (!active) {
          return
        }
        setIncidents(items)
        setTechnicians(team)
        const incidentId = Number(
          new URLSearchParams(window.location.search).get('incident')
        )
        if (incidentId > 0) {
          const incident = await getIncident(session, incidentId)
          if (active) {
            setSelected(incident)
          }
        }
      } catch (error) {
        if (active) {
          if (error instanceof Error) {
            setError(error.message)
          } else {
            setError('Incidents could not be loaded.')
          }
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [session, refresh])

  useEffect(() => {
    if (error === 'SESSION_EXPIRED') {
      onSessionExpired()
    }
  }, [error, onSessionExpired])

  const open = incidents.filter((incident) => incident.status === 'OPEN').length
  const inProgress = incidents.filter(
    (incident) => incident.status === 'IN_PROGRESS'
  ).length
  const completed = incidents.filter(
    (incident) => incident.status === 'CLOSED'
  ).length

  function updateIncident(updated: Incident) {
    setIncidents(
      incidents.map(function (incident) {
        if (incident.id === updated.id) {
          return updated
        }
        return incident
      })
    )
  }

  function closeDetails() {
    setSelected(null)
    window.history.replaceState(null, '', '/incidents')
  }

  return (
    <div className="workspace">
      <a className="skip-link" href="#incidents-main">
        Skip to incidents
      </a>
      <WorkspaceNavbar
        page="incidents"
        onNavigate={onNavigate}
      />
      <main className="dashboard-main incidents-main" id="incidents-main">
        <div className="page-heading incidents-page-heading">
          <div>
            <h1>
              Incidents<span className="heading-period">.</span>
            </h1>
          </div>
          <div className="incidents-page-actions">
            <RefreshButton disabled={loading} onClick={() => setRefresh(refresh + 1)} ariaLabel="Refresh incidents" />
            {session.role !== 'TECHNICIAN' && (
              <button
                className="dashboard-button"
                type="button"
                onClick={() => onNavigate('reports')}
              >
                <Icon name="plus" size={17} /> Create from reports
              </button>
            )}
          </div>
        </div>

        {error && error !== 'SESSION_EXPIRED' && (
          <div className="page-message">
            <FormMessage message={error} />
            <RefreshButton label="Try again" disabled={loading} onClick={() => setRefresh(refresh + 1)} />
          </div>
        )}
        {!loading && !error && (
          <>
            <section className="metric-grid" aria-label="Incident counts">
              <MetricCard label="Total incidents" value={incidents.length} icon="layers" color="blue" />
              <MetricCard label="Open" value={open} icon="inbox" color="dark-blue" />
              <MetricCard label="In progress" value={inProgress} icon="clock" color="orange" />
              <MetricCard label="Completed" value={completed} icon="check-circle" color="green" />
            </section>
            <IncidentsTable
              incidents={incidents}
              status={status}
              onStatusChange={setStatus}
              onOpen={setSelected}
            />
            <div className="incidents-export">
              <ExportIncidentsButton
                incidents={incidents}
                disabled={incidents.length === 0}
              />
            </div>
          </>
        )}
      </main>
      {selected && (
        <IncidentDetails
          key={selected.id}
          incident={selected}
          technicians={technicians}
          onUpdate={updateIncident}
          onClose={closeDetails}
        />
      )}
    </div>
  )
}

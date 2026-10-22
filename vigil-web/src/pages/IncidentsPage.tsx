import { useUser } from '../context/UserContext'
import { useEffect, useState } from 'react'
import type { Incident, IncidentStatus } from '../models/incidents'
import type { User } from '../models/users'
import { getIncident, listIncidents } from '../api/incidentsApi'
import { getTechnicians } from '../api/usersApi'
import { WorkspaceNavbar } from '../components/workspace/WorkspaceNavbar'
import { MetricCard } from '../components/workspace/MetricCard'
import { IncidentsTable } from '../components/incidents/IncidentsTable'
import { ExportIncidentsButton } from '../components/incidents/ExportIncidentsButton'
import { CreateIncidentDialog } from '../components/incidents/CreateIncidentDialog'
import { IncidentDetails } from '../components/incidents/IncidentDetails'
import { FormMessage } from '../components/auth/FormMessage'
import { Icon } from '../components/Icon'
import '../Dashboard.css'
import '../Incidents.css'

interface IncidentsPageProps {
  onNavigate(
    page: 'dashboard' | 'incidents' | 'users' | 'audit',
    incidentId?: number
  ): void
}

export function IncidentsPage({
  onNavigate
}: IncidentsPageProps) {
  const { session, onSessionExpired } = useUser()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [technicians, setTechnicians] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [status, setStatus] = useState<IncidentStatus | 'ALL'>('ALL')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Incident | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const items = await listIncidents(session)
        let team: User[] = []
        if (session.role === 'ADMIN') {
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
    (incident) => incident.status === 'RESOLVED' || incident.status === 'CLOSED'
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

  function incidentCreated(incident: Incident) {
    setIncidents([incident, ...incidents])
    setCreating(false)
    setStatus('ALL')
    setNotice('Incident INC-' + incident.id + ' created.')
    setSelected(incident)
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
            <button
              className="dashboard-button button-neutral"
              type="button"
              disabled={loading}
              onClick={() => setRefresh(refresh + 1)}
              aria-label="Refresh incidents"
            >
              <Icon name="refresh" size={16} />
              <span>Refresh</span>
            </button>
            {session.role !== 'TECHNICIAN' && (
              <button
                className="dashboard-button"
                type="button"
                onClick={() => setCreating(true)}
              >
                <Icon name="plus" size={17} /> New incident
              </button>
            )}
          </div>
        </div>

        {notice && (
          <div className="page-message">
            <FormMessage message={notice} type="success" />
          </div>
        )}
        {error && error !== 'SESSION_EXPIRED' && (
          <div className="page-message">
            <FormMessage message={error} />
            <button
              className="export-button"
              type="button"
              onClick={() => setRefresh(refresh + 1)}
            >
              Try again
            </button>
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
      {creating && (
        <CreateIncidentDialog
          onCreated={incidentCreated}
          onClose={() => setCreating(false)}
        />
      )}
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

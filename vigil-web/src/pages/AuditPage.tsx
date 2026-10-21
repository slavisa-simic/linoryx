import { useUser } from '../context/UserContext'
import { useEffect, useState } from 'react'
import type { AuditEntry } from '../models/audit'
import { listAuditLogs } from '../api/auditApi'
import { WorkspaceNavbar } from '../components/workspace/WorkspaceNavbar'
import { AuditTable } from '../components/audit/AuditTable'
import { FormMessage } from '../components/auth/FormMessage'
import { Icon } from '../components/Icon'
import '../Dashboard.css'
import '../Audit.css'

interface AuditPageProps {
  onNavigate(
    page: 'dashboard' | 'incidents' | 'users' | 'audit',
    incidentId?: number
  ): void
}

const currentYear = new Date().getFullYear()

export function AuditPage({
  onNavigate
}: AuditPageProps) {
  const { session, onSessionExpired } = useUser()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const logs = await listAuditLogs(session)
        if (active) {
          setEntries(logs)
        }
      } catch (error) {
        if (active) {
          if (error instanceof Error) {
            setError(error.message)
          } else {
            setError('Audit logs could not be loaded.')
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


  return (
    <div className="workspace">
      <a className="skip-link" href="#audit-main">
        Skip to audit logs
      </a>
      <WorkspaceNavbar
        page="audit"
        onNavigate={onNavigate}
      />
      <main className="dashboard-main audit-main" id="audit-main">
        <div className="audit-page-heading">
          <div>
            <h1>
              Audit logs<span className="heading-period">.</span>
            </h1>
            <p>Review incident updates and user changes.</p>
          </div>
          <button
            className="dashboard-button button-neutral"
            type="button"
            disabled={loading}
            onClick={() => setRefresh(refresh + 1)}
          >
            <Icon name="refresh" size={15} /> Refresh
          </button>
        </div>
        {error && error !== 'SESSION_EXPIRED' && (
          <div className="audit-message">
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
        {loading && (
          <div className="dashboard-panel audit-loading" role="status">
            <Icon name="loader" className="loading-icon" /> Loading audit logs…
          </div>
        )}
        {!loading && !error && (
          <AuditTable entries={entries} onNavigate={onNavigate} />
        )}
        <footer className="workspace-footer">
          <span>© {currentYear} Vigil</span>
          <span>Stay aware. Stay ahead.</span>
        </footer>
      </main>
    </div>
  )
}

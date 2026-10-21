import { useState } from 'react'
import type { AuditEntry } from '../../models/audit'
import {
  auditActionLabels,
  auditActorName,
  auditRoleLabels,
  auditTargetName
} from '../../services/auditData'
import { formatDate } from '../../services/dashboardData'
import { Icon } from '../Icon'

interface AuditTableProps {
  entries: AuditEntry[]
  onNavigate(
    page: 'dashboard' | 'incidents' | 'users' | 'audit',
    incidentId?: number
  ): void
}

const pageSize = 8

export function AuditTable({ entries, onNavigate }: AuditTableProps) {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('ALL')
  const [scope, setScope] = useState('ALL')
  const [page, setPage] = useState(0)

  function matchesFilters(entry: AuditEntry) {
    if (action !== 'ALL' && entry.action !== action) {
      return false
    }
    if (scope === 'INCIDENTS' && entry.incidentId === null) {
      return false
    }
    if (scope === 'USERS' && entry.incidentId !== null) {
      return false
    }
    let text =
      auditActorName(entry) +
      ' ' +
      auditTargetName(entry) +
      ' ' +
      auditActionLabels[entry.action]
    if (entry.incidentId !== null) {
      text = text + ' INC-' + entry.incidentId
    }
    if (entry.previousRole && entry.newRole) {
      text =
        text +
        ' ' +
        auditRoleLabels[entry.previousRole] +
        ' ' +
        auditRoleLabels[entry.newRole]
    }
    return text.toLowerCase().includes(search.trim().toLowerCase())
  }

  const filtered = entries.filter(matchesFilters)
  const pages = Math.ceil(filtered.length / pageSize)
  let currentPage = page
  if (currentPage >= pages) {
    currentPage = Math.max(0, pages - 1)
  }
  const start = currentPage * pageSize
  const visible = filtered.slice(start, start + pageSize)
  let pageLabel = '0 events'
  let displayedPage = 0
  let emptyTitle = 'No audit logs yet'
  let emptyMessage = 'Incident updates and user changes will appear here.'
  if (filtered.length > 0) {
    pageLabel =
      start +
      1 +
      '–' +
      Math.min(start + pageSize, filtered.length) +
      ' of ' +
      filtered.length +
      ' events'
    displayedPage = currentPage + 1
  }
  if (entries.length > 0) {
    emptyTitle = 'No matching events'
    emptyMessage = 'Try a different search or filter.'
  }

  function clearFilters() {
    setSearch('')
    setAction('ALL')
    setScope('ALL')
    setPage(0)
  }

  return (
    <section
      className="dashboard-panel audit-panel"
      aria-labelledby="audit-title"
    >
      <header className="panel-heading">
        <div className="heading-with-count">
          <h2 id="audit-title">Activity history</h2>
          <span className="count-badge">{entries.length}</span>
        </div>
      </header>
      <div className="table-toolbar">
        <label className="incident-search">
          <Icon name="search" size={16} />
          <span className="sr-only">Search audit logs</span>
          <input
            type="search"
            placeholder="Search name, action or incident…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(0)
            }}
          />
        </label>
        <div className="status-filter">
          <label className="sr-only" htmlFor="audit-action">
            Filter audit logs by action
          </label>
          <select
            id="audit-action"
            value={action}
            onChange={(event) => {
              setAction(event.target.value)
              setPage(0)
            }}
          >
            <option value="ALL">All actions</option>
            <option value="CREATED">Incident created</option>
            <option value="ASSIGNED">Technician assigned</option>
            <option value="STARTED">Work started</option>
            <option value="RESOLVED">Incident resolved</option>
            <option value="CLOSED">Incident closed</option>
            <option value="COMMENT_ADDED">Comment added</option>
            <option value="USER_ROLE_CHANGED">Role changed</option>
            <option value="USER_DISABLED">Account disabled</option>
            <option value="USER_ENABLED">Account enabled</option>
          </select>
          <Icon name="chevron-down" size={14} />
        </div>
        <div className="status-filter">
          <label className="sr-only" htmlFor="audit-scope">
            Filter audit logs by type
          </label>
          <select
            id="audit-scope"
            value={scope}
            onChange={(event) => {
              setScope(event.target.value)
              setPage(0)
            }}
          >
            <option value="ALL">All types</option>
            <option value="INCIDENTS">Incidents</option>
            <option value="USERS">Users</option>
          </select>
          <Icon name="chevron-down" size={14} />
        </div>
      </div>
      <div className="incident-table-scroll">
        <table className="incident-table audit-table">
          <caption className="sr-only">Audit logs, newest first</caption>
          <thead>
            <tr>
              <th scope="col" aria-sort="descending">
                Date and time
              </th>
              <th scope="col">Performed by</th>
              <th scope="col">Action</th>
              <th scope="col">Affected record</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(function (entry) {
              let details = '—'
              if (entry.action === 'ASSIGNED' && entry.targetUserId !== null) {
                details = 'Assigned to ' + auditTargetName(entry)
              }
              if (entry.previousRole && entry.newRole) {
                details =
                  auditRoleLabels[entry.previousRole] +
                  ' → ' +
                  auditRoleLabels[entry.newRole]
              }
              return (
                <tr key={entry.id}>
                  <td>
                    <time className="audit-date" dateTime={entry.createdAt}>
                      <span>
                        {formatDate(entry.createdAt, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <span>
                        {formatDate(entry.createdAt, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </time>
                  </td>
                  <td className="audit-actor">{auditActorName(entry)}</td>
                  <td>
                    <span
                      className={
                        'audit-action audit-action-' +
                        entry.action.toLowerCase()
                      }
                    >
                      {auditActionLabels[entry.action]}
                    </span>
                  </td>
                  <td>
                    {entry.incidentId !== null && (
                      <a
                        className="audit-incident-link"
                        href={'/incidents?incident=' + entry.incidentId}
                        onClick={(event) => {
                          if (
                            event.ctrlKey ||
                            event.metaKey ||
                            event.shiftKey ||
                            event.altKey
                          ) {
                            return
                          }
                          event.preventDefault()
                          if (entry.incidentId !== null) {
                            onNavigate('incidents', entry.incidentId)
                          }
                        }}
                      >
                        INC-{entry.incidentId}
                        <Icon name="arrow-up-right" size={13} />
                      </a>
                    )}
                    {entry.incidentId === null && (
                      <span className="audit-target">
                        {auditTargetName(entry)}
                      </span>
                    )}
                  </td>
                  <td className="audit-details">{details}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && (
        <div className="table-empty">
          <Icon name="history" size={25} />
          <strong>{emptyTitle}</strong>
          <p>{emptyMessage}</p>
          {(search || action !== 'ALL' || scope !== 'ALL') && (
            <button
              className="dashboard-button button-neutral"
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      <footer className="table-pagination">
        <span aria-live="polite">{pageLabel}</span>
        <div>
          <button
            className="icon-button"
            type="button"
            disabled={currentPage === 0}
            aria-label="Previous page of audit logs"
            onClick={() => setPage(currentPage - 1)}
          >
            <Icon name="chevron-left" size={16} />
          </button>
          <span>
            {displayedPage} / {pages}
          </span>
          <button
            className="icon-button"
            type="button"
            disabled={currentPage >= pages - 1}
            aria-label="Next page of audit logs"
            onClick={() => setPage(currentPage + 1)}
          >
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </footer>
    </section>
  )
}

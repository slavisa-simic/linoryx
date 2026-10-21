import { useState } from 'react'
import type { Incident, IncidentStatus, IncidentCategory, Severity } from '../../models/incidents'
import {
  categoryLabels,
  formatDate,
  severityLabels,
  statusLabels
} from '../../services/dashboardData'
import { Icon } from '../Icon'

interface IncidentsTableProps {
  incidents: Incident[]
  status: IncidentStatus | 'ALL'
  onStatusChange(status: IncidentStatus | 'ALL'): void
  onOpen(incident: Incident): void
  fullFilters?: boolean
}

const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
const pageSize = 6

export function IncidentsTable({
  incidents,
  status,
  onStatusChange,
  onOpen,
  fullFilters = false
}: IncidentsTableProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(0)
  const [severity, setSeverity] = useState<Severity | 'ALL'>('ALL')
  const [category, setCategory] = useState<IncidentCategory | 'ALL'>('ALL')
  let dateSort: 'descending' | 'none' = 'none'
  let prioritySort: 'descending' | 'none' = 'none'
  if (sort === 'newest') {
    dateSort = 'descending'
  }
  if (sort === 'priority') {
    prioritySort = 'descending'
  }

  function matchesFilters(incident: Incident): boolean {
    if (status !== 'ALL' && incident.status !== status) {
      return false
    }
    if (severity !== 'ALL' && incident.severity !== severity) {
      return false
    }
    if (category !== 'ALL' && incident.category !== category) {
      return false
    }

    let text =
      incident.title +
      ' INC-' +
      incident.id +
      ' ' +
      categoryLabels[incident.category]
    if (incident.assignedToEmail) {
      text = text + ' ' + incident.assignedToEmail
    }
    return text.toLowerCase().includes(search.trim().toLowerCase())
  }

  function compareIncidents(first: Incident, second: Incident): number {
    if (sort === 'priority') {
      const difference =
        priorityOrder[second.severity] - priorityOrder[first.severity]
      if (difference !== 0) {
        return difference
      }
    }
    return (
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    )
  }

  const filtered = incidents.filter(matchesFilters)
  filtered.sort(compareIncidents)

  const pages = Math.ceil(filtered.length / pageSize)
  let currentPage = page
  if (currentPage >= pages) {
    currentPage = Math.max(0, pages - 1)
  }

  const start = currentPage * pageSize
  const visible = filtered.slice(start, start + pageSize)
  let pageLabel = '0 incidents'
  let displayedPage = 0
  let emptyTitle = 'No incidents yet'
  let emptyMessage = 'Reported incidents will appear here.'

  if (filtered.length > 0) {
    pageLabel =
      start +
      1 +
      '–' +
      Math.min(start + pageSize, filtered.length) +
      ' of ' +
      filtered.length +
      ' incidents'
    displayedPage = currentPage + 1
  }
  if (incidents.length > 0) {
    emptyTitle = 'No matching incidents'
    emptyMessage = 'Try a different search or status filter.'
  }

  function changeSearch(value: string) {
    setSearch(value)
    setPage(0)
  }

  function changeSort(value: string) {
    setSort(value)
    setPage(0)
  }

  function changeStatus(value: IncidentStatus | 'ALL') {
    onStatusChange(value)
    setPage(0)
  }

  function clearFilters() {
    setSearch('')
    setSeverity('ALL')
    setCategory('ALL')
    onStatusChange('ALL')
    setPage(0)
  }

  return (
    <section
      className="dashboard-panel incidents-panel"
      id="incident-list"
      aria-labelledby="incidents-title"
    >
      <header className="panel-heading">
        <div className="heading-with-count">
          <h2 id="incidents-title">Incident overview</h2>
          <span className="count-badge">{incidents.length}</span>
        </div>
        <label className="sort-control">
          <span className="sr-only">Sort incidents</span>
          <select
            value={sort}
            onChange={(event) => changeSort(event.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="priority">Highest priority</option>
          </select>
          <Icon name="chevron-down" size={15} />
        </label>
      </header>

      <div className="table-toolbar">
        <label className="incident-search">
          <Icon name="search" size={17} />
          <span className="sr-only">Search incidents</span>
          <input
            type="search"
            placeholder="Search incidents…"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
          />
        </label>
        <label className="status-filter">
          <span className="sr-only">Filter incidents by status</span>
          <select
            value={status}
            onChange={(event) =>
              changeStatus(event.target.value as IncidentStatus | 'ALL')
            }
          >
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <Icon name="chevron-down" size={15} />
        </label>
        {fullFilters && (
          <>
            <label className="status-filter">
              <span className="sr-only">Filter incidents by priority</span>
              <select
                value={severity}
                onChange={(event) => {
                  setSeverity(event.target.value as Severity | 'ALL')
                  setPage(0)
                }}
              >
                <option value="ALL">All priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <Icon name="chevron-down" size={15} />
            </label>
            <label className="status-filter">
              <span className="sr-only">Filter incidents by category</span>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value as IncidentCategory | 'ALL')
                  setPage(0)
                }}
              >
                <option value="ALL">All categories</option>
                <option value="SECURITY">Security</option>
                <option value="NETWORK">Network</option>
                <option value="APPLICATION">Application</option>
                <option value="CLOUD">Cloud</option>
                <option value="DATABASE">Database</option>
                <option value="OTHER">Other</option>
              </select>
              <Icon name="chevron-down" size={15} />
            </label>
          </>
        )}
      </div>

      <div className="incident-table-scroll">
        <table className="incident-table">
          <caption className="sr-only">Incident overview</caption>
          <thead>
            <tr>
              <th scope="col" aria-sort={dateSort}>
                Incident
              </th>
              <th scope="col">Status</th>
              <th scope="col" aria-sort={prioritySort}>
                Priority
              </th>
              <th scope="col">Assigned to</th>
              <th scope="col">Reported</th>
              <th scope="col">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map(function (incident) {
              let assignee = 'Unassigned'
              let initial = ''
              if (incident.assignedToEmail) {
                assignee = incident.assignedToEmail.split('@')[0]
                initial = assignee.charAt(0).toUpperCase()
              }

              return (
                <tr key={incident.id}>
                  <td>
                    <button
                      className="incident-title-button"
                      type="button"
                      onClick={() => onOpen(incident)}
                    >
                      <span className="incident-reference">
                        INC-{incident.id}
                        <span>·</span>
                        {categoryLabels[incident.category]}
                      </span>
                      <span className="incident-title">{incident.title}</span>
                    </button>
                  </td>
                  <td>
                    <span
                      className={
                        'status-badge status-' + incident.status.toLowerCase()
                      }
                    >
                      <span className="status-dot" />
                      {statusLabels[incident.status]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        'severity-badge severity-' +
                        incident.severity.toLowerCase()
                      }
                    >
                      <span className="severity-mark" />
                      {severityLabels[incident.severity]}
                    </span>
                  </td>
                  <td>
                    {incident.assignedToEmail && (
                      <span
                        className="table-assignee"
                        title={incident.assignedToEmail}
                      >
                        <span className="assignee-avatar" aria-hidden="true">
                          {initial}
                        </span>
                        <span>{assignee}</span>
                      </span>
                    )}
                    {!incident.assignedToEmail && (
                      <span className="unassigned-label">Unassigned</span>
                    )}
                  </td>
                  <td className="table-date">
                    {formatDate(incident.createdAt)}
                  </td>
                  <td>
                    <button
                      className="icon-button table-open-button"
                      type="button"
                      aria-label={'View incident INC-' + incident.id}
                      onClick={() => onOpen(incident)}
                    >
                      <Icon name="arrow-up-right" size={17} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <div className="table-empty">
          <Icon name="search" size={26} />
          <strong>{emptyTitle}</strong>
          <p>{emptyMessage}</p>
          {(search ||
            status !== 'ALL' ||
            severity !== 'ALL' ||
            category !== 'ALL') && (
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
            aria-label="Previous page of incidents"
            onClick={() => setPage(currentPage - 1)}
          >
            <Icon name="chevron-left" size={17} />
          </button>
          <span>
            {displayedPage} / {pages}
          </span>
          <button
            className="icon-button"
            type="button"
            disabled={currentPage >= pages - 1}
            aria-label="Next page of incidents"
            onClick={() => setPage(currentPage + 1)}
          >
            <Icon name="chevron-right" size={17} />
          </button>
        </div>
      </footer>
    </section>
  )
}

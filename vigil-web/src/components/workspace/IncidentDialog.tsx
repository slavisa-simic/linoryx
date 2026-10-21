import { useEffect } from 'react'
import type { Incident } from '../../models/incidents'
import {
  categoryLabels,
  formatDate,
  statusLabels
} from '../../services/dashboardData'
import { Icon } from '../Icon'

export function IncidentDialog({
  incident,
  onClose,
  onManage
}: {
  incident: Incident
  onClose(): void
  onManage(): void
}) {
  useEffect(() => {
    const dialog = document.getElementById(
      'incident-dialog'
    ) as HTMLDialogElement
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = ''
    }
  }, [])

  let assignedTo = 'Unassigned'
  let resolvedAt = 'Not yet resolved'
  if (incident.assignedToEmail) {
    assignedTo = incident.assignedToEmail
  }
  if (incident.resolvedAt) {
    resolvedAt = formatDate(incident.resolvedAt, {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  return (
    <dialog
      id="incident-dialog"
      className="incident-dialog"
      aria-labelledby="incident-dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="incident-dialog-content">
        <div className="dialog-heading">
          <span className="eyebrow">INC-{incident.id}</span>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close incident details"
            autoFocus
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <h2 id="incident-dialog-title">{incident.title}</h2>
        <div className="dialog-badges">
          <span
            className={'status-badge status-' + incident.status.toLowerCase()}
          >
            <span className="status-dot" />
            {statusLabels[incident.status]}
          </span>
          <span
            className={
              'severity-badge severity-' + incident.severity.toLowerCase()
            }
          >
            {incident.severity.toLowerCase()}
          </span>
        </div>
        <p className="incident-description">{incident.description}</p>
        <dl className="incident-facts">
          <div>
            <dt>Category</dt>
            <dd>{categoryLabels[incident.category]}</dd>
          </div>
          <div>
            <dt>Assigned to</dt>
            <dd>{assignedTo}</dd>
          </div>
          <div>
            <dt>Reported by</dt>
            <dd>{incident.createdByEmail}</dd>
          </div>
          <div>
            <dt>Reported</dt>
            <dd>
              {formatDate(incident.createdAt, {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>
              {formatDate(incident.updatedAt, {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </dd>
          </div>
          <div>
            <dt>Resolved</dt>
            <dd>{resolvedAt}</dd>
          </div>
        </dl>
        <div className="dialog-footer">
          <button className="dashboard-button" type="button" onClick={onManage}>
            Open in Incidents <Icon name="arrow-up-right" size={16} />
          </button>
          <button
            className="dashboard-button button-neutral"
            type="button"
            onClick={onClose}
          >
            Close details
          </button>
        </div>
      </div>
    </dialog>
  )
}

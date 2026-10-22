import { useUser } from '../../context/UserContext'
import { useEffect, useState } from 'react'
import type { ReactNode, SubmitEvent } from 'react'
import type {
  Incident,
  IncidentAction,
  IncidentComment,
  IncidentStatus
} from '../../models/incidents'
import type { User } from '../../models/users'
import {
  addComment as postComment,
  assignIncident,
  getComments,
  getIncident,
  progressIncident
} from '../../api/incidentsApi'
import {
  categoryLabels,
  formatDate,
  severityLabels,
  statusLabels,
  userName
} from '../../services/dashboardData'
import { FormMessage } from '../auth/FormMessage'
import { Icon } from '../Icon'

interface IncidentDetailsProps {
  incident: Incident
  technicians: User[]
  onUpdate(incident: Incident): void
  onClose(): void
}

const steps: IncidentStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

export function IncidentDetails({
  incident,
  technicians,
  onUpdate,
  onClose
}: IncidentDetailsProps) {
  const { session, onSessionExpired } = useUser()
  let initialTechnicianId = ''
  if (incident.assignedToId) {
    initialTechnicianId = String(incident.assignedToId)
  }
  const [item, setItem] = useState(incident)
  const [comments, setComments] = useState<IncidentComment[]>([])
  const [comment, setComment] = useState('')
  const [technicianId, setTechnicianId] = useState(initialTechnicianId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const dialog = document.getElementById(
      'incident-details'
    ) as HTMLDialogElement
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setLoadError('')
      try {
        const current = await getIncident(session, incident.id)
        const discussion = await getComments(session, incident.id)
        if (active) {
          setItem(current)
          let assignedId = ''
          if (current.assignedToId) {
            assignedId = String(current.assignedToId)
          }
          setTechnicianId(assignedId)
          setComments(discussion)
        }
      } catch (error) {
        if (active) {
          if (error instanceof Error) {
            setLoadError(error.message)
          } else {
            setLoadError('Incident details could not be loaded.')
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
  }, [session, incident.id, refresh])

  useEffect(() => {
    if (loadError === 'SESSION_EXPIRED' || error === 'SESSION_EXPIRED') {
      onSessionExpired()
    }
  }, [loadError, error, onSessionExpired])

  const admin = session.role === 'ADMIN'
  let canWork = false
  if (admin) {
    canWork = true
  }
  if (session.role === 'TECHNICIAN' && item.assignedToId === session.userId) {
    canWork = true
  }
  const active = item.status === 'OPEN' || item.status === 'IN_PROGRESS'
  const currentStep = steps.indexOf(item.status)
  const disabled = loading || saving || loadError !== ''

  function showError(error: unknown, defaultMessage: string) {
    if (error instanceof Error) {
      setError(error.message)
    } else {
      setError(defaultMessage)
    }
  }

  function updated(result: Incident) {
    setItem(result)
    onUpdate(result)
    setNotice('Incident updated.')
  }

  async function progress(action: IncidentAction) {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await progressIncident(
        session,
        item.id,
        action
      )
      updated(result)
    } catch (error) {
      showError(error, 'The status could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  async function assign(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!technicianId || saving) {
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await assignIncident(
        session,
        item.id,
        Number(technicianId)
      )
      updated(result)
    } catch (error) {
      showError(error, 'The technician could not be assigned.')
    } finally {
      setSaving(false)
    }
  }

  async function addComment(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!comment.trim() || saving) {
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const added = await postComment(
        session,
        item.id,
        comment.trim()
      )
      setComments([...comments, added])
      setComment('')
      setNotice('Comment added.')
    } catch (error) {
      showError(error, 'The comment could not be added.')
    } finally {
      setSaving(false)
    }
  }

  async function exportPdf() {
    setExporting(true)
    setError('')
    try {
      // PDF biblioteku ucitamo tek kada je potrebna.
      const pdfModule = await import('../../services/exportIncidentPdf')
      await pdfModule.downloadIncidentPdf(item, comments)
    } catch {
      setError('The PDF could not be generated. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  let assignedEmail = 'Unassigned'
  if (item.assignedToEmail) {
    assignedEmail = item.assignedToEmail
  }
  return (
    <dialog
      id="incident-details"
      className="incident-dialog incident-detail-modal"
      aria-labelledby="detail-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving && !exporting) {
          onClose()
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving && !exporting) {
          onClose()
        }
      }}
    >
      <div className="incident-dialog-content">
        <div className="incident-modal-heading">
          <span className="detail-reference">
            INC-{item.id} <span>· {categoryLabels[item.category]}</span>
          </span>
          <button
            className="icon-button"
            type="button"
            disabled={saving || exporting}
            onClick={onClose}
            aria-label="Close incident details"
            autoFocus
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <h2 id="detail-title" className="detail-title">
          {item.title}
        </h2>
        <div className="detail-status-row">
          <span className={'status-badge status-' + item.status.toLowerCase()}>
            <span className="status-dot" />
            {statusLabels[item.status]}
          </span>
          <span
            className={'severity-badge severity-' + item.severity.toLowerCase()}
          >
            <span className="severity-mark" />
            {severityLabels[item.severity]} priority
          </span>
          <button
            className="export-button"
            type="button"
            onClick={exportPdf}
            disabled={disabled || exporting}
          >
            <Icon name="pdf" size={17} />
            Export PDF
          </button>
        </div>

        <ol className="incident-steps" aria-label="Incident progress">
          {steps.map(function (step, index) {
            let stepClass = ''
            let current: 'step' | undefined
            let indicator: ReactNode = index + 1
            if (index <= currentStep) {
              stepClass = 'step-complete'
            }
            if (index === currentStep) {
              current = 'step'
            }
            if (index < currentStep) {
              indicator = <Icon key={step} name="check" size={13} />
            }
            return (
              <li key={step} className={stepClass} aria-current={current}>
                <span>{indicator}</span>
                {statusLabels[step]}
              </li>
            )
          })}
        </ol>
        <section className="detail-section">
          <h3>Description</h3>
          <p className="detail-description">{item.description}</p>
        </section>
        <dl className="incident-facts detail-facts">
          <div>
            <dt>Reported by</dt>
            <dd>{item.createdByEmail}</dd>
          </div>
          <div>
            <dt>Assigned to</dt>
            <dd>{assignedEmail}</dd>
          </div>
          <div>
            <dt>Reported</dt>
            <dd>
              {formatDate(item.createdAt, {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>
              {formatDate(item.updatedAt, {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </dd>
          </div>
          {item.resolvedAt && (
            <div>
              <dt>Resolved</dt>
              <dd>
                {formatDate(item.resolvedAt, {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </dd>
            </div>
          )}
        </dl>

        {loadError && (
          <div className="incident-error">
            <FormMessage message={loadError} />
            <button
              className="export-button"
              type="button"
              onClick={() => setRefresh(refresh + 1)}
            >
              Try again
            </button>
          </div>
        )}
        <FormMessage message={error} />
        {notice && (
          <p className="incident-success" role="status">
            <Icon name="check-circle" size={16} />
            {notice}
          </p>
        )}

        {admin && active && (
          <section className="detail-section assignment-section">
            <h3>
              <Icon name="assign" size={17} />
              Assignment
            </h3>
            <form className="assignment-form" onSubmit={assign}>
              <label className="sr-only" htmlFor="assigned-technician">
                Assign technician
              </label>
              <select
                id="assigned-technician"
                className="field-input"
                value={technicianId}
                onChange={(event) => setTechnicianId(event.target.value)}
                disabled={disabled}
                required
              >
                <option value="">Select a technician</option>
                {technicians.map((user) => (
                  <option key={user.id} value={user.id}>
                    {userName(user)}
                  </option>
                ))}
              </select>
              <button
                className="dashboard-button button-neutral"
                type="submit"
                disabled={
                  disabled ||
                  !technicianId ||
                  Number(technicianId) === item.assignedToId
                }
              >
                Assign technician
              </button>
            </form>
            {technicians.length === 0 && (
              <p className="incident-muted">
                No enabled technicians are available.
              </p>
            )}
          </section>
        )}

        {canWork && item.status !== 'CLOSED' && (
          <div className="incident-workflow-actions">
            {item.status === 'OPEN' && (
              <>
                <button
                  className="dashboard-button"
                  type="button"
                  onClick={() => progress('start')}
                  disabled={disabled || !item.assignedToId}
                >
                  <Icon name="play" size={16} />
                  Start work
                </button>
                {!item.assignedToId && (
                  <p className="incident-muted">
                    Assign a technician before starting work.
                  </p>
                )}
              </>
            )}
            {item.status === 'IN_PROGRESS' && (
              <button
                className="dashboard-button"
                type="button"
                onClick={() => progress('resolve')}
                disabled={disabled}
              >
                <Icon name="check-circle" size={16} />
                Mark as resolved
              </button>
            )}
            {item.status === 'RESOLVED' && (
              <button
                className="dashboard-button button-neutral"
                type="button"
                onClick={() => progress('close')}
                disabled={disabled}
              >
                <Icon name="archive" size={16} />
                Close incident
              </button>
            )}
          </div>
        )}

        <section className="detail-section comments-section">
          <h3>
            <Icon name="comment" size={17} />
            Comments <span className="count-badge">{comments.length}</span>
          </h3>
          {!loading && !loadError && comments.length === 0 && (
            <p className="comments-empty">No comments yet.</p>
          )}
          <ul className="incident-comments">
            {comments.map((entry) => (
              <li key={entry.id}>
                <div className="comment-heading">
                  <strong>
                    {entry.authorFirstName} {entry.authorLastName}
                  </strong>
                  <time dateTime={entry.createdAt}>
                    {formatDate(entry.createdAt, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </time>
                </div>
                <p>{entry.content}</p>
              </li>
            ))}
          </ul>
          {canWork && (
            <form
              className="incident-comment-form"
              onSubmit={addComment}
              aria-busy={saving}
            >
              <label htmlFor="incident-comment">Add a comment</label>
              <textarea
                id="incident-comment"
                className="field-input incident-textarea"
                rows={3}
                maxLength={2000}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add an investigation note or update…"
                required
                disabled={disabled}
              />
              <button
                className="dashboard-button"
                type="submit"
                disabled={disabled || !comment.trim()}
              >
                <Icon name="send" size={16} />
                Post comment
              </button>
            </form>
          )}
        </section>
      </div>
    </dialog>
  )
}

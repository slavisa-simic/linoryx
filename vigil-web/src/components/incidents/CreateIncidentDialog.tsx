import { useUser } from '../../context/UserContext'
import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import type { Incident, IncidentCategory, Severity } from '../../models/incidents'
import { createIncident } from '../../api/incidentsApi'
import { FormMessage } from '../auth/FormMessage'
import { Icon } from '../Icon'

interface CreateIncidentDialogProps {
  onCreated(incident: Incident): void
  onClose(): void
}

export function CreateIncidentDialog({
  onCreated,
  onClose
}: CreateIncidentDialogProps) {
  const { session, onSessionExpired } = useUser()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<IncidentCategory>('OTHER')
  const [severity, setSeverity] = useState<Severity>('MEDIUM')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = document.getElementById(
      'create-incident-dialog'
    ) as HTMLDialogElement
    dialog.showModal()
    const titleInput = document.getElementById(
      'new-incident-title'
    ) as HTMLInputElement
    titleInput.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = ''
    }
  }, [])

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) {
      return
    }
    if (!title.trim() || !description.trim()) {
      setError('Enter a title and description.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const incident = await createIncident(session, {
        title: title.trim(),
        description: description.trim(),
        category: category,
        severity: severity
      })
      onCreated(incident)
    } catch (error) {
      if (error instanceof Error && error.message === 'SESSION_EXPIRED') {
        onSessionExpired()
      } else {
        if (error instanceof Error) {
          setError(error.message)
        } else {
          setError('The incident could not be created.')
        }
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      id="create-incident-dialog"
      className="incident-dialog incident-create-modal"
      aria-labelledby="create-incident-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!saving) {
          onClose()
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose()
        }
      }}
    >
      <div className="incident-dialog-content">
        <div className="incident-modal-heading">
          <div>
            <h2 id="create-incident-title">New incident</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Close new incident"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <form className="incident-form" onSubmit={submit} aria-busy={saving}>
          <div className="incident-form-field">
            <label htmlFor="new-incident-title">Title</label>
            <input
              id="new-incident-title"
              className="field-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="A short description of the problem"
              required
              maxLength={150}
              disabled={saving}
              autoFocus
            />
          </div>
          <div className="incident-form-field">
            <label htmlFor="new-incident-description">Description</label>
            <textarea
              id="new-incident-description"
              className="field-input incident-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What happened? When did it start? Who is affected?"
              required
              maxLength={2000}
              rows={5}
              disabled={saving}
            />
          </div>
          <div className="incident-form-row">
            <div className="incident-form-field">
              <label htmlFor="new-incident-category">Category</label>
              <select
                id="new-incident-category"
                className="field-input"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as IncidentCategory)
                }
                disabled={saving}
              >
                <option value="SECURITY">Security</option>
                <option value="NETWORK">Network</option>
                <option value="APPLICATION">Application</option>
                <option value="CLOUD">Cloud</option>
                <option value="DATABASE">Database</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="incident-form-field">
              <label htmlFor="new-incident-priority">Priority</label>
              <select
                id="new-incident-priority"
                className="field-input"
                value={severity}
                onChange={(event) =>
                  setSeverity(event.target.value as Severity)
                }
                disabled={saving}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
          {severity === 'CRITICAL' && (
            <p className="critical-incident-note">
              <Icon name="alert" size={17} />
              Critical incidents immediately alert administrators by email.
            </p>
          )}
          <FormMessage message={error} />
          <div className="incident-form-actions">
            <button
              className="dashboard-button button-neutral"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="dashboard-button"
              type="submit"
              disabled={saving}
            >
              <Icon name="plus" size={16} />
              Create incident
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}

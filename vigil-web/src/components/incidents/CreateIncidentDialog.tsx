import type { CustomerReport } from '../../models/reports'
import { useUser } from '../../context/UserContext'
import { useState } from 'react'
import type { SubmitEvent } from 'react'
import type { Incident, IncidentCategory, Severity } from '../../models/incidents'
import { incidentCategories } from '../../models/incidents'
import { categoryLabels } from '../../services/dashboardData'
import { createIncident } from '../../api/incidentsApi'
import { FormMessage } from '../auth/FormMessage'
import { Icon } from '../Icon'
import { FormDialog } from '../workspace/FormDialog'

interface CreateIncidentDialogProps {
  reports: CustomerReport[]
  onCreated(incident: Incident): void
  onClose(): void
}

export function CreateIncidentDialog({
  reports,
  onCreated,
  onClose
}: CreateIncidentDialogProps) {
  const { session, onSessionExpired } = useUser()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<IncidentCategory>('UNDETERMINED')
  const [severity, setSeverity] = useState<Severity>('MEDIUM')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
        reportIds: reports.map(report => report.id),
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
    <FormDialog
      id="create-incident-dialog"
      title="New incident"
      busy={saving}
      onClose={onClose}
      description={'Selected reports: ' + reports.map(report => 'REP-' + report.id).join(', ')}
      footer={<div className="dialog-actions">
        <button className="dashboard-button button-neutral" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="dashboard-button" type="submit" form="create-incident-form" disabled={saving}>
          <Icon name="plus" size={16} />{saving ? 'Creating…' : 'Create incident'}
        </button>
      </div>}
    >
      <form id="create-incident-form" className="incident-form" onSubmit={submit} aria-busy={saving}>
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
              data-autofocus
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
                {incidentCategories.map(value => <option key={value} value={value}>{categoryLabels[value]}</option>)}
              </select>
              <p className="incident-muted">Leave undetermined until the cause is diagnosed.</p>
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
      </form>
    </FormDialog>
  )
}

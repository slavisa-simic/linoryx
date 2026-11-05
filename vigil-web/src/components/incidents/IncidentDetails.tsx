import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { useUser } from '../../context/UserContext'
import type { Incident, IncidentAction, IncidentCategory, IncidentComment } from '../../models/incidents'
import { incidentCategories } from '../../models/incidents'
import type { Technician } from '../../models/users'
import type { CustomerReport } from '../../models/reports'
import { addComment, changeIncidentCategory, getComments, getIncident, progressIncident } from '../../api/incidentsApi'
import { listReports } from '../../api/reportsApi'
import { categoryLabels, formatDate, severityLabels, statusLabels } from '../../services/dashboardData'
import { FormDialog } from '../workspace/FormDialog'
import { RefreshButton } from '../workspace/RefreshButton'
import { FormMessage } from '../auth/FormMessage'
import { ReportsTable } from '../reports/ReportsTable'
import { Icon } from '../Icon'
import '../../Reports.css'

interface Props {
  incident: Incident
  technicians: Technician[]
  onUpdate(incident: Incident): void
  onClose(): void
}

export function IncidentDetails({ incident, onUpdate, onClose }: Props) {
  const { session, onSessionExpired } = useUser()
  const [item, setItem] = useState(incident)
  const [category, setCategory] = useState(incident.category)
  const [reports, setReports] = useState<CustomerReport[]>([])
  const [comments, setComments] = useState<IncidentComment[]>([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const operator = session.role === 'ADMIN' || session.role === 'DISPATCHER'

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const current = await getIncident(session, incident.id)
        const discussion = await getComments(session, incident.id)
        const linked = await listReports(session, incident.id)
        if (active) {
          setItem(current)
          setCategory(current.category)
          setComments(discussion)
          setReports(linked)
        }
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'Incident details could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [session, incident.id, refresh])

  useEffect(() => {
    if (error === 'SESSION_EXPIRED') onSessionExpired()
  }, [error, onSessionExpired])

  async function progress(action: IncidentAction) {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const updated = await progressIncident(session, item.id, action)
      setItem(updated)
      onUpdate(updated)
      setNotice('Incident updated.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The incident could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  async function saveCategory(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || saving || category === item.category) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const updated = await changeIncidentCategory(session, item.id, category)
      setItem(updated)
      setCategory(updated.category)
      onUpdate(updated)
      setNotice('Incident category updated.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The category could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  async function postComment(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !comment.trim()) return
    setSaving(true)
    setError('')
    try {
      const added = await addComment(session, item.id, comment.trim())
      setComments([...comments, added])
      setComment('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The comment could not be added.')
    } finally {
      setSaving(false)
    }
  }

  async function exportPdf() {
    if (loading || saving) return
    setSaving(true)
    setError('')
    try {
      const pdf = await import('../../services/exportIncidentPdf')
      await pdf.downloadIncidentPdf(item, comments)
    } catch {
      setError('The PDF could not be generated.')
    } finally {
      setSaving(false)
    }
  }

  async function updateReport(updated: CustomerReport) {
    setReports(reports.map(report => report.id === updated.id ? updated : report))
    setLoading(true)
    try {
      const current = await getIncident(session, item.id)
      setItem(current)
      onUpdate(current)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Incident totals could not be refreshed.')
    } finally {
      setLoading(false)
    }
  }

  const canClose = item.status === 'IN_PROGRESS' && item.reportCount > 0 && item.reportCount === item.closedReportCount
  const disabled = loading || saving
  const showWorkflow = operator && !item.legacy && item.status !== 'CLOSED'

  return <FormDialog wide id="incident-details" reference={'INC-' + item.id} title={item.title} busy={saving} onClose={onClose}
    footer={<>
      {showWorkflow && <p className="dialog-footer-note">{item.status === 'OPEN' ? 'Start the incident to begin work on its reports.' :
        canClose ? 'All associated reports are closed. This incident is ready to close.' : 'Close every associated report before closing the incident.'}</p>}
      <div className="dialog-actions">
        <button className="dashboard-button button-neutral" disabled={disabled} onClick={exportPdf}><Icon name="pdf" size={18} />Export PDF</button>
        {showWorkflow && <button className="dashboard-button" disabled={disabled || (item.status === 'IN_PROGRESS' && !canClose)}
          onClick={() => progress(item.status === 'OPEN' ? 'start' : 'close')}>
          <Icon name={item.status === 'OPEN' ? 'play' : 'check-circle'} size={18} />
          {item.status === 'OPEN' ? 'Start incident' : 'Close incident'}</button>}
      </div>
    </>}>
    <div className="detail-status-row">
      <span className={'status-badge status-' + item.status.toLowerCase()}><span className="status-dot" />{statusLabels[item.status]}</span>
      <span className={'severity-badge severity-' + item.severity.toLowerCase()}><span className="severity-mark" />{severityLabels[item.severity]} priority</span>
      <RefreshButton disabled={disabled} onClick={() => setRefresh(refresh + 1)} ariaLabel="Refresh details" />
    </div>
    <p className="detail-description">{item.description}</p>
    <dl className="detail-facts">
      <div><dt>Created by</dt><dd>{item.createdByEmail}</dd></div>
      <div><dt>Category</dt><dd>{categoryLabels[item.category]}</dd></div>
      <div><dt>Created</dt><dd>{formatDate(item.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
      <div><dt>Reports closed</dt><dd><strong>{item.closedReportCount}</strong> / {item.reportCount}</dd></div>
      {item.closedAt && <div><dt>Closed</dt><dd>{formatDate(item.closedAt, { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>}
    </dl>
    {item.legacy && <p className="incident-muted">Historical incident · read-only. Original status: {item.legacyStatus || item.status}.
      {item.assignedToEmail && ' Historical technician: ' + item.assignedToEmail + '.'}
      {' '}Customer reports were not created for historical records.</p>}
    <FormMessage message={error} />
    {notice && <FormMessage message={notice} type="success" />}
    {loading && <p role="status">Loading incident details…</p>}
    {operator && !item.legacy && <section className="dialog-section"><h3>Incident cause</h3>
      <form className="incident-form" onSubmit={saveCategory} aria-busy={saving}>
        <div className="incident-form-field">
          <label htmlFor="incident-category">Category</label>
          <select id="incident-category" className="field-input" value={category} disabled={disabled}
            onChange={event => setCategory(event.target.value as IncidentCategory)}>
            {incidentCategories.map(value => <option key={value} value={value}>{categoryLabels[value]}</option>)}
          </select>
        </div>
        <p className="incident-muted">Choose the cause after diagnosis. Customer report categories describe symptoms.</p>
        <div className="dialog-actions">
          <button className="dashboard-button button-neutral" type="submit" disabled={disabled || category === item.category}>Save category</button>
        </div>
      </form>
    </section>}
    <section className="dialog-section"><h3>Associated reports</h3>
      {session.role === 'TECHNICIAN' && <p className="incident-muted">Only your assigned reports are shown.</p>}
      {!loading && <ReportsTable reports={reports} onUpdated={updateReport} />}
    </section>
    <section className="dialog-section comments-section"><h3>Internal comments <span className="count-badge">{comments.length}</span></h3>
      {!loading && comments.length === 0 && <p className="comments-empty">No comments yet</p>}
      <ul className="incident-comments">{comments.map(entry => <li key={entry.id}>
        <header className="comment-heading">
          <strong>{entry.authorFirstName} {entry.authorLastName}</strong>
          <time dateTime={entry.createdAt}>{formatDate(entry.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</time>
        </header>
        <p>{entry.content}</p>
      </li>)}</ul>
      <form className="incident-comment-form" onSubmit={postComment}>
        <label htmlFor="incident-comment">Add a comment</label>
        <textarea id="incident-comment" className="field-input incident-textarea" required rows={3} maxLength={2000}
          value={comment} onChange={event => setComment(event.target.value)} disabled={disabled} />
        <button className="dashboard-button" type="submit" disabled={disabled || !comment.trim()}>Post comment</button>
      </form>
    </section>
  </FormDialog>
}

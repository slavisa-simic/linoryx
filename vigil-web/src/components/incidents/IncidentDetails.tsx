import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { useUser } from '../../context/UserContext'
import type { Incident, IncidentAction, IncidentComment } from '../../models/incidents'
import type { Technician } from '../../models/users'
import type { CustomerReport } from '../../models/reports'
import { addComment, getComments, getIncident, progressIncident } from '../../api/incidentsApi'
import { listReports } from '../../api/reportsApi'
import { categoryLabels, formatDate, severityLabels, statusLabels } from '../../services/dashboardData'
import { FormDialog } from '../workspace/FormDialog'
import { FormMessage } from '../auth/FormMessage'
import { ReportsTable } from '../reports/ReportsTable'
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
    setSaving(true)
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

  return <FormDialog wide id="incident-details" title={'INC-' + item.id + ' · ' + item.title} busy={saving} onClose={onClose}>
    <div className="detail-status-row">
      <span className={'status-badge status-' + item.status.toLowerCase()}>{statusLabels[item.status]}</span>
      <span className={'severity-badge severity-' + item.severity.toLowerCase()}>{severityLabels[item.severity]} priority</span>
      <button className="export-button" disabled={disabled} onClick={exportPdf}>Export PDF</button>
    </div>
    <p className="detail-description">{item.description}</p>
    <dl className="incident-facts detail-facts">
      <div><dt>Created by</dt><dd>{item.createdByEmail}</dd></div>
      <div><dt>Category</dt><dd>{categoryLabels[item.category]}</dd></div>
      <div><dt>Created</dt><dd>{formatDate(item.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
      <div><dt>Reports closed</dt><dd>{item.closedReportCount}/{item.reportCount}</dd></div>
      {item.closedAt && <div><dt>Closed</dt><dd>{formatDate(item.closedAt, { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>}
    </dl>
    {item.legacy && <p className="incident-muted">Historical incident · read-only. Original status: {item.legacyStatus || item.status}.
      {item.assignedToEmail && ' Historical technician: ' + item.assignedToEmail + '.'}
      {' '}Customer reports were not created for historical records.</p>}
    <FormMessage message={error} />
    {notice && <FormMessage message={notice} type="success" />}
    <button className="export-button" disabled={disabled} onClick={() => setRefresh(refresh + 1)}>Refresh details</button>
    {loading && <p role="status">Loading incident details…</p>}
    {operator && !item.legacy && item.status !== 'CLOSED' && <div className="incident-workflow-actions">
      {item.status === 'OPEN' && <button className="dashboard-button" disabled={disabled} onClick={() => progress('start')}>Start incident</button>}
      {item.status === 'IN_PROGRESS' && <>
        <button className="dashboard-button" disabled={disabled || !canClose} onClick={() => progress('close')}>Close incident</button>
        {!canClose && <p className="incident-muted">Close every associated report before closing the incident.</p>}
      </>}
    </div>}
    <section className="detail-section"><h3>Associated reports</h3>
      {session.role === 'TECHNICIAN' && <p className="incident-muted">Only your assigned reports are shown.</p>}
      {!loading && <ReportsTable reports={reports} onUpdated={updateReport} />}
    </section>
    <section className="detail-section comments-section"><h3>Internal comments</h3>
      <ul className="incident-comments">{comments.map(entry => <li key={entry.id}>
        <div className="comment-heading"><strong>{entry.authorFirstName} {entry.authorLastName}</strong><time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time></div>
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

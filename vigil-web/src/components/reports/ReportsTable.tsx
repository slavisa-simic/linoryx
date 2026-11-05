import { useState } from 'react'
import { useUser } from '../../context/UserContext'
import type { CustomerReport, ReportAction } from '../../models/reports'
import { reportCategoryLabels, reportStatusLabels } from '../../models/reports'
import { reportAction } from '../../api/reportsApi'
import { formatDate } from '../../services/dashboardData'
import { serviceTypeLabels } from '../../services/customerServiceData'
import { FormMessage } from '../auth/FormMessage'
import { AssignTechnicianDialog } from './AssignTechnicianDialog'

interface Props {
  reports: CustomerReport[]
  selected?: number[]
  onSelect?(id: number): void
  onUpdated(report: CustomerReport): void
  onIncident?(id: number): void
}

export function ReportsTable({ reports, selected = [], onSelect, onUpdated, onIncident }: Props) {
  const { session, onSessionExpired } = useUser()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [assigning, setAssigning] = useState<CustomerReport | null>(null)
  const operator = session.role === 'ADMIN' || session.role === 'DISPATCHER'

  async function act(report: CustomerReport, action: ReportAction) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const updated = await reportAction(session, report.id, action)
      onUpdated(updated)
    } catch (error) {
      if (error instanceof Error && error.message === 'SESSION_EXPIRED') onSessionExpired()
      else setError(error instanceof Error ? error.message : 'The report could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <FormMessage message={error} />
    <div className="incident-table-scroll"><table className="incident-table reports-table">
      <caption className="sr-only">Customer reports</caption>
      <thead><tr>{onSelect && <th scope="col">Select</th>}<th scope="col">Report</th><th scope="col">Service</th>
        {operator && <th scope="col">Customer / network</th>}
        <th scope="col">Status</th>{session.role !== 'USER' && <th scope="col">Assignment / incident</th>}
        <th scope="col">Actions</th></tr></thead>
      <tbody>{reports.map(report => <tr key={report.id}>
        {onSelect && <td><input type="checkbox" aria-label={'Select REP-' + report.id} checked={selected.includes(report.id)}
          disabled={busy || !!report.incidentId || report.status === 'CLOSED'} onChange={() => onSelect(report.id)} /></td>}
        <td><strong>REP-{report.id}</strong><div>{reportCategoryLabels[report.category]}</div>
          <p className="report-description">{report.description}</p><time dateTime={report.createdAt}>{formatDate(report.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</time></td>
        <td>{serviceTypeLabels[report.serviceType]} #{report.customerServiceId}<div className="location-cell">{report.serviceAddress}</div></td>
        {operator && <td>{report.customerName}<div className="incident-muted">{report.customerEmail}</div>
          <div>{report.networkNodeCode}</div><span className="incident-muted">{report.networkNodeName}</span></td>}
        <td><span className={'status-badge status-' + report.status.toLowerCase()}>{reportStatusLabels[report.status]}</span>
          {report.status === 'RESOLVED' && <p className="incident-muted">{report.userConfirmed ? 'Customer confirmed · ready to close' : 'Awaiting customer confirmation'}</p>}
          {report.customerReportedUnfixed && report.status === 'IN_PROGRESS' && <p className="report-attention">Customer: still not working</p>}</td>
        {session.role !== 'USER' && <td>{report.assignedTechnicianName || 'Unassigned'}
          <div>{report.incidentId ? <button className="export-button" type="button" onClick={() => { if (onIncident && report.incidentId) onIncident(report.incidentId) }}
            disabled={!onIncident}>INC-{report.incidentId}</button> : <strong className="report-attention">Unlinked</strong>}</div></td>}
        <td><div className="report-actions">
          {operator && report.incidentId && report.status !== 'CLOSED' &&
            <button className="user-save-button" disabled={busy} onClick={() => setAssigning(report)}>
              {report.assignedTechnicianId ? 'Reassign technician' : 'Assign technician'}</button>}
          {session.role === 'TECHNICIAN' && report.assignedTechnicianId === session.userId && report.status === 'OPEN' &&
            <button className="user-save-button" disabled={busy || report.incidentStatus !== 'IN_PROGRESS'} title={report.incidentStatus !== 'IN_PROGRESS' ? 'The dispatcher must start the incident first.' : undefined} onClick={() => act(report, 'start')}>Start work</button>}
          {session.role === 'TECHNICIAN' && report.assignedTechnicianId === session.userId && report.status === 'IN_PROGRESS' &&
            <button className="user-save-button" disabled={busy} onClick={() => act(report, 'resolve')}>Mark resolved</button>}
          {session.role === 'USER' && report.status === 'RESOLVED' && <>
            <button className="user-save-button" disabled={busy || report.userConfirmed} onClick={() => act(report, 'confirm-fixed')}>Problem Fixed</button>
            <button className="user-access-button" disabled={busy} onClick={() => act(report, 'still-not-working')}>Still Not Working</button>
          </>}
          {operator && report.status === 'RESOLVED' && <>
            <button className="user-save-button" disabled={busy || !report.userConfirmed} onClick={() => act(report, 'close')}>Close report</button>
            {!report.userConfirmed && <span className="incident-muted">The customer must confirm the fix first.</span>}
          </>}
          {report.status === 'CLOSED' && <span className="incident-muted">Closed {report.closedAt && formatDate(report.closedAt)}</span>}
        </div></td>
      </tr>)}</tbody>
    </table></div>
    {reports.length === 0 && <p className="table-empty">No reports found.</p>}
    {assigning && <AssignTechnicianDialog report={assigning} onAssigned={onUpdated} onClose={() => setAssigning(null)} />}
  </>
}

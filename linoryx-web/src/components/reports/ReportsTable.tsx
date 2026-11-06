import { useState } from 'react'
import { useUser } from '../../context/UserContext'
import type { CustomerReport, ReportAction } from '../../models/reports'
import { reportCategoryLabels, reportStatusLabels } from '../../models/reports'
import { reportAction } from '../../api/reportsApi'
import { formatDate } from '../../services/dashboardData'
import { serviceTypeLabels } from '../../services/customerServiceData'
import { Icon } from '../Icon'
import { FormMessage } from '../auth/FormMessage'
import { AssignTechnicianDialog } from './AssignTechnicianDialog'

interface Props {
  reports: CustomerReport[]
  selected?: number[]
  onSelect?(id: number): void
  onUpdated(report: CustomerReport): void
  onIncident?(id: number): void
  onOpen?(id: number): void
}

export function ReportsTable({ reports, selected = [], onSelect, onUpdated, onIncident, onOpen }: Props) {
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
    <div className="incident-table-scroll reports-table-scroll"><table className="incident-table reports-table">
      <caption className="sr-only">Customer reports</caption>
      <thead><tr>{onSelect && <th className="report-select-cell" scope="col"><span className="sr-only">Select reports</span></th>}<th className="report-summary-cell" scope="col">Report</th>
        <th scope="col">Service</th>
        {operator && <th scope="col">Customer / network</th>}
        <th className="report-status-cell" scope="col">Status</th><th scope="col" className="table-category">Category</th>
        {session.role !== 'USER' && <th className="report-assignment-cell" scope="col">Assignment / incident</th>}</tr></thead>
      <tbody>{reports.map(report => {
        const heading = <span className="incident-title-row">
          <span className="incident-reference">REP-{report.id}</span>
          {onOpen && <Icon name="arrow-up-right" size={14} />}
        </span>
        const actions = <div className="report-actions">
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
        </div>

        return <tr key={report.id} aria-selected={onSelect ? selected.includes(report.id) : undefined}>
          {onSelect && <td className="report-select-cell"><label className="report-select-control">
            <input type="checkbox" aria-label={'Select REP-' + report.id} checked={selected.includes(report.id)}
              disabled={busy || !!report.incidentId || report.status === 'CLOSED'} onChange={() => onSelect(report.id)} />
          </label></td>}
          <td data-label="Report" className="report-summary-cell">
            {onOpen ? <button className="incident-title-button" type="button" aria-label={'Open report REP-' + report.id}
              onClick={() => onOpen(report.id)}>{heading}</button> : <div className="report-heading">{heading}</div>}
            <p className={'report-description' + (onOpen ? ' report-description-preview' : '')}>{report.description}</p>
            <time dateTime={report.createdAt}>{formatDate(report.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</time>
          </td>
          <td data-label="Service"><strong>{serviceTypeLabels[report.serviceType]} <span className="incident-reference">#{report.customerServiceId}</span></strong>
            <div className="incident-muted">{report.serviceAddress}</div></td>
          {operator && <td data-label="Customer / network"><strong>{report.customerName || '—'}</strong>
            {report.customerEmail && <div className="incident-muted">{report.customerEmail}</div>}
            <div className="report-network"><span className="report-network-code">{report.networkNodeCode || '—'}</span>
              {report.networkNodeName && <span className="incident-muted">{report.networkNodeName}</span>}</div></td>}
          <td data-label="Status"><span className={'status-badge status-' + report.status.toLowerCase()}>
            <span className="status-dot" />{reportStatusLabels[report.status]}</span>
            {report.status === 'RESOLVED' && <p className="incident-muted">{report.userConfirmed ? 'Customer confirmed · ready to close' : 'Awaiting customer confirmation'}</p>}
            {report.customerReportedUnfixed && report.status === 'IN_PROGRESS' && <p className="report-attention">Customer: still not working</p>}
            {session.role === 'USER' && actions}</td>
          <td data-label="Category" className="table-category">{reportCategoryLabels[report.category]}</td>
          {session.role !== 'USER' && <td data-label="Assignment / incident">
            <div className="table-assignee"><Icon name="wrench" size={14} />
              <span className={report.assignedTechnicianName ? undefined : 'unassigned-label'}>{report.assignedTechnicianName || 'Unassigned'}</span></div>
            <div className="report-incident">{report.incidentId ? <button className="export-button" type="button"
              onClick={() => { if (onIncident && report.incidentId) onIncident(report.incidentId) }} disabled={!onIncident}>
              INC-{report.incidentId}{onIncident && <Icon name="arrow-up-right" size={14} />}</button> : <span className="report-attention">Unlinked</span>}</div>
            {actions}</td>}
        </tr>
      })}</tbody>
    </table></div>
    {reports.length === 0 && <p className="table-empty">No reports found.</p>}
    {assigning && <AssignTechnicianDialog report={assigning} onAssigned={onUpdated} onClose={() => setAssigning(null)} />}
  </>
}

import type { WorkspacePage } from '../models/navigation'
import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext'
import { listReports, attachReports } from '../api/reportsApi'
import { listIncidents } from '../api/incidentsApi'
import type { CustomerReport } from '../models/reports'
import { reportCategoryLabels, reportStatusLabels } from '../models/reports'
import type { Incident } from '../models/incidents'
import { WorkspaceNavbar } from '../components/workspace/WorkspaceNavbar'
import { ReportsTable } from '../components/reports/ReportsTable'
import { CreateIncidentDialog } from '../components/incidents/CreateIncidentDialog'
import { FormMessage } from '../components/auth/FormMessage'
import { FormDialog } from '../components/workspace/FormDialog'
import { RefreshButton } from '../components/workspace/RefreshButton'
import { TablePagination, pageSize } from '../components/workspace/TablePagination'
import '../Reports.css'

interface Props {
  onNavigate(page: WorkspacePage, incidentId?: number): void
}

export function ReportsPage({ onNavigate }: Props) {
  const { session, onSessionExpired } = useUser()
  const [reports, setReports] = useState<CustomerReport[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [detailId, setDetailId] = useState(() => Number(new URLSearchParams(window.location.search).get('report')))
  const [selected, setSelected] = useState<number[]>([])
  const [incidentId, setIncidentId] = useState('')
  const [creating, setCreating] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [category, setCategory] = useState('ALL')
  const [unlinked, setUnlinked] = useState(false)
  const [page, setPage] = useState(0)
  const operator = session.role === 'ADMIN' || session.role === 'DISPATCHER'

  useEffect(() => {
    function readReportLink() {
      setDetailId(Number(new URLSearchParams(window.location.search).get('report')))
    }
    window.addEventListener('popstate', readReportLink)
    return () => window.removeEventListener('popstate', readReportLink)
  }, [])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const items = await listReports(session)
        let incidents: Incident[] = []
        if (operator) {
          incidents = await listIncidents(session)
        }
        if (active) {
          setReports(items)
          setIncidents(incidents.filter(incident => !incident.legacy && incident.status !== 'CLOSED'))
          setSelected([])
        }
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'Reports could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [session, operator, refresh])

  useEffect(() => {
    if (error === 'SESSION_EXPIRED') onSessionExpired()
  }, [error, onSessionExpired])

  function toggle(id: number) {
    if (selected.includes(id)) setSelected(selected.filter(value => value !== id))
    else setSelected([...selected, id])
  }

  function resetPageAndSelection() {
    setPage(0)
    setSelected([])
  }

  async function attach() {
    if (saving || !incidentId || selected.length === 0) return
    setSaving(true)
    setError('')
    try {
      await attachReports(session, Number(incidentId), selected)
      setNotice('Reports attached to INC-' + incidentId + '.')
      setAttaching(false)
      setIncidentId('')
      setSelected([])
      setRefresh(refresh + 1)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Reports could not be attached.')
    } finally {
      setSaving(false)
    }
  }

  function update(updated: CustomerReport) {
    setReports(reports.map(report => report.id === updated.id ? updated : report))
    setSelected(selected.filter(id => id !== updated.id))
    setNotice('Report REP-' + updated.id + ' updated.')
  }

  const filtered = reports.filter(report => {
    if (status !== 'ALL' && report.status !== status) return false
    if (category !== 'ALL' && report.category !== category) return false
    if (unlinked && report.incidentId) return false
    const text = ['REP-' + report.id, report.description, report.serviceAddress, report.customerName,
      report.customerEmail, report.networkNodeCode, report.assignedTechnicianName, report.incidentTitle].join(' ')
    return text.toLowerCase().includes(search.trim().toLowerCase())
  })
  const pages = Math.ceil(filtered.length / pageSize)
  const currentPage = Math.min(page, Math.max(0, pages - 1))
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  let title = 'Reports'
  if (session.role === 'USER') title = 'My reports'
  if (session.role === 'TECHNICIAN') title = 'My assigned reports'

  return <div className="workspace">
    <a className="skip-link" href="#reports-main">Skip to reports</a>
    <WorkspaceNavbar page="reports" onNavigate={onNavigate} />
    <main className="dashboard-main" id="reports-main">
      <div className="page-heading"><h1>{title}<span className="heading-period">.</span></h1>
        <div className="report-toolbar"><RefreshButton disabled={loading || saving} onClick={() => setRefresh(refresh + 1)} />
          {session.role === 'USER' && <button className="dashboard-button" onClick={() => onNavigate('services')}>Report a problem</button>}</div></div>
      {notice && <FormMessage message={notice} type="success" />}
      <FormMessage message={error} />
      <section className="dashboard-panel table-panel">
        <div className="report-toolbar">
          <label className="report-search">Search<input className="field-input" value={search} onChange={event => { setSearch(event.target.value); resetPageAndSelection() }} placeholder="Search reports" /></label>
          <label>Status<select className="field-input" value={status} onChange={event => { setStatus(event.target.value); resetPageAndSelection() }}><option value="ALL">All statuses</option>
            {Object.entries(reportStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Category<select className="field-input" value={category} onChange={event => { setCategory(event.target.value); resetPageAndSelection() }}><option value="ALL">All categories</option>
            {Object.entries(reportCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {operator && <label className="report-toggle"><input type="checkbox" checked={unlinked} onChange={event => { setUnlinked(event.target.checked); resetPageAndSelection() }} /> Unlinked only</label>}
        </div>
        {operator && !loading && selected.length > 0 && <div className="report-selection" role="group" aria-label="Selected report actions">
          <span aria-live="polite">{selected.length} selected</span>
          <button className="export-button" type="button" disabled={saving} onClick={() => setSelected([])}>Clear selection</button>
          <div className="report-selection-actions">
            <button className="dashboard-button button-neutral" disabled={saving} onClick={() => {
              setIncidentId('')
              setError('')
              setAttaching(true)
            }}>Attach to incident</button>
            <button className="dashboard-button" disabled={saving} onClick={() => setCreating(true)}>Create incident</button>
          </div>
        </div>}
        {loading && <p role="status" className="table-empty">Loading reports…</p>}
        {!loading && <ReportsTable reports={visible} selected={selected}
          onSelect={operator ? toggle : undefined} onUpdated={update} onIncident={id => onNavigate('incidents', id)}
          onOpen={id => {
            setDetailId(id)
            window.history.replaceState(null, '', '/reports?report=' + id)
          }} />}
        {!loading && <TablePagination page={currentPage} total={filtered.length} label="reports" onPageChange={setPage} />}
      </section>
    </main>
    {creating && <CreateIncidentDialog reports={reports.filter(report => selected.includes(report.id))}
      onClose={() => setCreating(false)} onCreated={incident => { setCreating(false); onNavigate('incidents', incident.id) }} />}
    {attaching && <FormDialog id="attach-reports" title="Attach to incident" busy={saving} onClose={() => setAttaching(false)}
      footer={<>
        <span className="dialog-footer-note">{selected.length} selected</span>
        <button className="dashboard-button button-neutral" type="button" disabled={saving} onClick={() => setAttaching(false)}>Cancel</button>
        <button className="dashboard-button" type="submit" form="attach-reports-form" disabled={saving || !incidentId}>
          {saving ? 'Attaching…' : 'Attach reports'}
        </button>
      </>}>
      <form id="attach-reports-form" className="incident-form" onSubmit={event => { event.preventDefault(); attach() }}>
        <FormMessage message={error} />
        <p className="incident-muted">{selected.map(id => 'REP-' + id).join(', ')}</p>
        <label>Existing incident
          <select className="field-input" value={incidentId} onChange={event => setIncidentId(event.target.value)} disabled={saving} required data-autofocus>
            <option value="">Choose an incident</option>
            {incidents.map(incident => <option key={incident.id} value={incident.id}>INC-{incident.id} · {incident.title}</option>)}
          </select>
        </label>
        {incidents.length === 0 && <p className="incident-muted">No open incidents.</p>}
      </form>
    </FormDialog>}
    {!loading && detailId > 0 && <FormDialog wide id="report-details" title={'REP-' + detailId} busy={false} onClose={() => {
      setDetailId(0)
      window.history.replaceState(null, '', '/reports')
    }}>
      <ReportsTable reports={reports.filter(report => report.id === detailId)} onUpdated={update} onIncident={id => onNavigate('incidents', id)} />
    </FormDialog>}
  </div>
}

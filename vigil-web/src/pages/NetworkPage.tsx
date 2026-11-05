import type { WorkspacePage } from '../models/navigation'
import { useEffect, useState } from 'react'
import { deleteNetworkNode, listNetworkNodes } from '../api/networkApi'
import { useUser } from '../context/UserContext'
import type { NetworkNode } from '../models/network'
import { WorkspaceNavbar } from '../components/workspace/WorkspaceNavbar'
import { NetworkMap } from '../components/network/NetworkMap'
import { NodesTable } from '../components/network/NodesTable'
import { NodeDialog } from '../components/network/NodeDialog'
import { FormMessage } from '../components/auth/FormMessage'
import { Icon } from '../components/Icon'
import { getMyAssignmentLocations } from '../api/techniciansApi'
import type { AssignmentLocation } from '../models/technicians'
import { OperationalMap } from '../components/network/OperationalMap'
import { reportCategoryLabels, reportStatusLabels } from '../models/reports'
import { serviceTypeLabels } from '../services/customerServiceData'
import { hasCoordinates } from '../services/technicianData'

interface NetworkPageProps {
  onNavigate(page: WorkspacePage, reportId?: number): void
}

export function NetworkPage({ onNavigate }: NetworkPageProps) {
  const { session, onSessionExpired } = useUser()
  const [nodes, setNodes] = useState<NetworkNode[]>([])
  const [assignments, setAssignments] = useState<AssignmentLocation[]>([])
  const technician = session.role === 'TECHNICIAN'
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('ALL')
  const [status, setStatus] = useState('ALL')
  const [editing, setEditing] = useState<NetworkNode | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        if (technician) {
          const results = await getMyAssignmentLocations(session)
          if (active) setAssignments(results)
        } else {
          const results = await listNetworkNodes(session)
          if (active) setNodes(results)
        }
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'Network nodes could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [session, refresh, technician])

  useEffect(() => {
    if (error === 'SESSION_EXPIRED') onSessionExpired()
  }, [error, onSessionExpired])

  function edit(node: NetworkNode) {
    setEditing(node)
    setDialogOpen(true)
  }

  function saved(node: NetworkNode) {
    setDialogOpen(false)
    setNotice('Node saved: ' + node.code + '.')
    setRefresh(refresh + 1)
  }

  async function remove(node: NetworkNode) {
    if (busy || !window.confirm('Delete node ' + node.code + '?')) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await deleteNetworkNode(session, node.id)
      setNodes(nodes.filter((item) => item.id !== node.id))
      setNotice('Node ' + node.code + ' deleted.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The node could not be deleted.')
    } finally {
      setBusy(false)
    }
  }

  const filtered = nodes.filter(function (node) {
    if (type !== 'ALL' && node.nodeType !== type) return false
    if (status !== 'ALL' && node.status !== status) return false
    return (node.name + ' ' + node.code).toLowerCase().includes(search.trim().toLowerCase())
  })
  const markers = assignments.filter(location => hasCoordinates(location.latitude, location.longitude)).map(location => ({
    id: location.locationId, latitude: location.latitude, longitude: location.longitude, title: location.address,
    content: <><strong>{location.address}</strong><p>Assigned reports</p><ul>{location.reports.map(report => <li key={report.id}>
      <a href={'/reports?report=' + report.id} onClick={event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onNavigate('reports', report.id)
      }}>REP-{report.id}</a> · {serviceTypeLabels[report.serviceType]} · {reportCategoryLabels[report.category]} · {reportStatusLabels[report.status]}
    </li>)}</ul></>
  }))

  return (
    <div className="workspace">
      <a className="skip-link" href="#network-main">Skip to network</a>
      <WorkspaceNavbar page="network" onNavigate={onNavigate} />
      <main className="dashboard-main" id="network-main">
        <div className="page-heading"><h1>{technician ? 'Network — My Assignments' : 'Network'}<span className="heading-period">.</span></h1>
          <div className="incidents-page-actions">
            <button className="dashboard-button button-neutral" type="button" disabled={loading || busy}
              onClick={() => setRefresh(refresh + 1)}><Icon name="refresh" size={16} />Refresh</button>
            {!technician && <button className="dashboard-button" type="button" onClick={() => { setEditing(null); setDialogOpen(true) }}>
              <Icon name="plus" size={16} />Add node</button>}
          </div>
        </div>
        {notice && <div className="page-message"><FormMessage message={notice} type="success" /></div>}
        {error && error !== 'SESSION_EXPIRED' && <div className="page-message"><FormMessage message={error} />
          <button className="export-button" type="button" onClick={() => setRefresh(refresh + 1)}>Try again</button></div>}
        {loading && <p className="incident-muted" role="status">{technician ? 'Loading your assigned locations…' : 'Loading network nodes…'}</p>}
        {technician && !loading && !error && <>
          <p className="incident-muted">Service installation locations for your Open, In progress and Resolved assigned reports.</p>
          {assignments.length === 0 ? <p className="table-empty">No active assigned reports. Assigned service locations will appear here.</p>
            : <OperationalMap markers={markers} label="My assigned service locations" legend="Locations are grouped by service installation. Open a report from its marker." />}
        </>}
        {!technician && !loading && (!error || nodes.length > 0) && <>
          <div className="dashboard-panel network-filters">
            <label className="incident-search"><Icon name="search" size={17} /><span className="sr-only">Search nodes</span>
              <input type="search" value={search} placeholder="Search by node name or code…"
                onChange={(event) => setSearch(event.target.value)} /></label>
            <label className="status-filter"><span className="sr-only">Filter nodes by type</span>
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="ALL">All types</option><option value="GPON_OLT">GPON OLT</option><option value="ROUTER">Router</option>
                <option value="SWITCH">Switch</option><option value="WIRELESS_BASE_STATION">Wireless base station</option>
              </select><Icon name="chevron-down" size={15} /></label>
            <label className="status-filter"><span className="sr-only">Filter nodes by status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="ALL">All statuses</option><option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option><option value="MAINTENANCE">Maintenance</option>
              </select><Icon name="chevron-down" size={15} /></label>
          </div>
          <NetworkMap nodes={filtered} onEdit={edit} />
          <NodesTable nodes={filtered} busy={busy} onEdit={edit} onDelete={remove} />
          <p className="incident-muted">Node statuses are managed manually.</p>
          <p className="location-attribution">Addresses by <a href="https://www.geoapify.com/">Geoapify</a>
            {' · '}<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a></p>
        </>}
      </main>
      {dialogOpen && <NodeDialog node={editing} onSaved={saved} onClose={() => setDialogOpen(false)} />}
    </div>
  )
}

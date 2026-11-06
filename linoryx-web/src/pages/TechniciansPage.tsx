import { useEffect, useState } from 'react'
import { getTechnicianOverview } from '../api/techniciansApi'
import { useUser } from '../context/UserContext'
import type { WorkspacePage } from '../models/navigation'
import type { TechnicianProfile } from '../models/technicians'
import { availabilityLabels, specializations } from '../models/technicians'
import { formatDate } from '../services/dashboardData'
import { hasCoordinates } from '../services/technicianData'
import { FormMessage } from '../components/auth/FormMessage'
import { WorkspaceNavbar } from '../components/workspace/WorkspaceNavbar'
import { RefreshButton } from '../components/workspace/RefreshButton'
import { TablePagination, pageSize } from '../components/workspace/TablePagination'
import { OperationalMap } from '../components/network/OperationalMap'
import '../Technicians.css'

export function TechniciansPage({ onNavigate }: { onNavigate(page: WorkspacePage): void }) {
  const { session, onSessionExpired } = useUser()
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState('ALL')
  const [specialization, setSpecialization] = useState('ALL')
  const [refresh, setRefresh] = useState(0)
  const [page, setPage] = useState(0)
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const items = await getTechnicianOverview(session)
        if (active) setTechnicians(items)
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'Technicians could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [session, refresh])
  useEffect(() => {
    if (error === 'SESSION_EXPIRED') onSessionExpired()
  }, [error, onSessionExpired])

  const filtered = technicians.filter(technician => {
    if (!technician.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    if (availability === 'UNCONFIGURED' && technician.availability !== null) return false
    if (availability !== 'ALL' && availability !== 'UNCONFIGURED' && technician.availability !== availability) return false
    if (specialization === 'UNCONFIGURED') return technician.specializations.length === 0
    return specialization === 'ALL' || technician.specializations.some(skill => skill === specialization)
  })
  const pages = Math.ceil(filtered.length / pageSize)
  const currentPage = Math.min(page, Math.max(0, pages - 1))
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  const markers = filtered.filter(technician => hasCoordinates(technician.latitude, technician.longitude)).map(technician => ({
    id: technician.userId, latitude: technician.latitude!, longitude: technician.longitude!, title: technician.name,
    content: <><strong>{technician.name}</strong><p>{technician.availability ? availabilityLabels[technician.availability] : 'Availability not configured'}</p>
      <p>{technician.specializations.join(', ') || 'No specializations configured'}</p><p>{technician.activeReportCount} active reports</p>
      <p>Last location update: {technician.locationUpdatedAt ? formatDate(technician.locationUpdatedAt, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set'}</p></>
  }))

  return <div className="workspace">
    <a className="skip-link" href="#technicians-main">Skip to technicians</a>
    <WorkspaceNavbar page="technicians" onNavigate={onNavigate} />
    <main className="dashboard-main" id="technicians-main">
      <div className="page-heading"><h1>Technician Overview<span className="heading-period">.</span></h1>
        <RefreshButton disabled={loading} onClick={() => setRefresh(refresh + 1)} /></div>
      <FormMessage message={error} />
      {loading && <p role="status">Loading technicians…</p>}
      {!loading && <>
        <div className="dashboard-panel network-filters technician-filters">
          <label>Technician name<input className="field-input" type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} /></label>
          <label>Availability<select className="field-input" value={availability} onChange={event => { setAvailability(event.target.value); setPage(0) }}>
            <option value="ALL">All availability</option><option value="UNCONFIGURED">Not configured</option>
            {Object.entries(availabilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Specialization<select className="field-input" value={specialization} onChange={event => { setSpecialization(event.target.value); setPage(0) }}>
            <option value="ALL">All specializations</option><option value="UNCONFIGURED">Not configured</option>
            {specializations.map(skill => <option key={skill}>{skill}</option>)}
          </select></label>
        </div>
        <OperationalMap markers={markers} label="Technician locations" />
        <section className="dashboard-panel table-panel"><div className="incident-table-scroll"><table className="incident-table">
          <caption className="sr-only">Active technician accounts and operational information</caption>
          <thead><tr><th scope="col">Technician</th><th scope="col">Availability</th><th scope="col">Specializations</th>
            <th scope="col">Latitude / Longitude</th><th scope="col">Location Updated At</th><th scope="col">Active assigned Reports</th></tr></thead>
          <tbody>{visible.map(technician => <tr key={technician.userId}>
            <td><strong>{technician.name}</strong></td><td>{technician.availability ? availabilityLabels[technician.availability] : 'Availability not configured'}</td>
            <td>{technician.specializations.join(', ') || 'No specializations configured'}</td>
            <td>{hasCoordinates(technician.latitude, technician.longitude) ? technician.latitude + ' / ' + technician.longitude : 'Location not set'}</td>
            <td>{technician.locationUpdatedAt ? formatDate(technician.locationUpdatedAt, { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set'}</td>
            <td>{technician.activeReportCount}</td>
          </tr>)}</tbody>
        </table></div>{visible.length === 0 && <p className="table-empty">No matching technicians.</p>}
          <TablePagination page={currentPage} total={filtered.length} label="technicians" onPageChange={setPage} />
        </section>
      </>}
    </main>
  </div>
}

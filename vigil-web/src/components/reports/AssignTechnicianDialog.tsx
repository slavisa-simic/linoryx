import { useEffect, useState } from 'react'
import { getTechnicianRecommendations } from '../../api/techniciansApi'
import { assignReport } from '../../api/reportsApi'
import { useUser } from '../../context/UserContext'
import type { CustomerReport } from '../../models/reports'
import type { TechnicianRecommendation } from '../../models/technicians'
import { availabilityLabels } from '../../models/technicians'
import { FormDialog } from '../workspace/FormDialog'
import { RefreshButton } from '../workspace/RefreshButton'
import { FormMessage } from '../auth/FormMessage'
import { Icon } from '../Icon'
import { serviceTypeLabels } from '../../services/customerServiceData'
import '../../Technicians.css'

export function AssignTechnicianDialog({ report, onAssigned, onClose }: {
  report: CustomerReport
  onAssigned(report: CustomerReport): void
  onClose(): void
}) {
  const { session, onSessionExpired } = useUser()
  const [candidates, setCandidates] = useState<TechnicianRecommendation[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const items = await getTechnicianRecommendations(session, report.id)
        if (active) setCandidates(items)
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'Recommendations could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [session, report.id, refresh])
  useEffect(() => {
    if (error === 'SESSION_EXPIRED') onSessionExpired()
  }, [error, onSessionExpired])

  async function assign() {
    if (saving || loading || !choice?.assignable) return
    setSaving(true)
    setError('')
    try {
      onAssigned(await assignReport(session, report.id, Number(selected)))
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The technician could not be assigned.')
    } finally {
      setSaving(false)
    }
  }

  const choice = candidates.find(candidate => candidate.technician.userId === Number(selected))
  const recommended = candidates.filter(candidate => candidate.recommended)
  const other = candidates.filter(candidate => !candidate.recommended)

  function candidateList(items: TechnicianRecommendation[], ranked = false) {
    return <ul className="technician-candidates">{items.map((candidate, index) => {
      const technician = candidate.technician
      return <li key={technician.userId}>
        <label className={'technician-choice' + (selected === String(technician.userId) ? ' is-selected' : '') + (!candidate.assignable ? ' is-unavailable' : '')}>
          <input type="radio" name="technician" value={technician.userId} checked={selected === String(technician.userId)}
            disabled={saving || !candidate.assignable} onChange={event => setSelected(event.target.value)} />
          <span className="technician-identity">
            <span className="technician-name">{ranked && <span className="technician-rank">{index + 1}.</span>}<strong>{technician.name}</strong></span>
            <span className={'technician-availability availability-' + (technician.availability || 'unknown').toLowerCase()}>
              <span className="status-dot" />{technician.availability ? availabilityLabels[technician.availability] : 'Availability not configured'}
            </span>
            <span className="technician-specializations">{technician.specializations.join(' · ') || 'No specializations configured'}</span>
            {candidate.warnings.length > 0 && <span className="technician-warnings">{candidate.warnings.join(' ')}</span>}
          </span>
          <span className="technician-metric"><strong>{technician.activeReportCount}</strong><span>active reports</span></span>
          <span className="technician-metric"><strong>{candidate.distanceKm === null ? '—' : candidate.distanceKm.toFixed(1) + ' km'}</strong>
            <span>{candidate.distanceKm === null ? 'Distance unavailable' : 'straight-line'}</span></span>
        </label>
      </li>
    })}</ul>
  }

  return <FormDialog id="assign-technician" title="Assign technician" reference={'REP-' + report.id} busy={saving} onClose={onClose}
    description="Choose a technician. Recommendations consider skills, workload and distance."
    footer={<>
      {choice && choice.warnings.length > 0 && <div className="dialog-footer-message"><FormMessage type="warning" message={'Manual assignment: ' + choice.warnings.join(' ')} /></div>}
      <p className="dialog-footer-note" role="status">{choice ? <><strong>{choice.technician.name}</strong>Selected technician</> : 'Select a technician to continue'}</p>
      <div className="dialog-actions">
        <button className="dashboard-button button-neutral" disabled={saving} onClick={onClose}>Cancel</button>
        <button className="dashboard-button" disabled={saving || loading || !choice?.assignable} onClick={assign}>
          <Icon name="check" size={16} />{saving ? 'Assigning…' : 'Confirm assignment'}</button>
      </div>
    </>}>
    <div className="assignment-context"><Icon name="map-pin" size={18} /><div>
      <strong>{serviceTypeLabels[report.serviceType]} · Service #{report.customerServiceId}</strong>
      <span>{report.serviceAddress}</span>
    </div></div>
    <FormMessage message={error} />
    <section className="dialog-section" aria-labelledby="recommended-technicians">
      <div className="dialog-section-heading">
        <h3 id="recommended-technicians">Recommended technicians {!loading && <span className="count-badge">{recommended.length}</span>}</h3>
        <RefreshButton disabled={saving || loading} onClick={() => setRefresh(refresh + 1)} ariaLabel="Refresh recommendations" />
      </div>
      {loading ? <p className="incident-muted" role="status">Loading recommendations…</p> : <>
        {candidateList(recommended, true)}
        {recommended.length === 0 && <p className="incident-muted">No eligible recommendations. Review available technicians below.</p>}
      </>}
    </section>
    {!loading && other.length > 0 && <details className="technician-other" open={recommended.length === 0 ? true : undefined}>
      <summary>Other technicians / incomplete profiles <span className="count-badge">{other.length}</span><Icon name="chevron-down" size={16} /></summary>
      {candidateList(other)}
    </details>}
  </FormDialog>
}

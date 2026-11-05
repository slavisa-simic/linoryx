import { useEffect, useState } from 'react'
import { getTechnicianRecommendations } from '../../api/techniciansApi'
import { assignReport } from '../../api/reportsApi'
import { useUser } from '../../context/UserContext'
import type { CustomerReport } from '../../models/reports'
import type { TechnicianRecommendation } from '../../models/technicians'
import { availabilityLabels } from '../../models/technicians'
import { FormDialog } from '../workspace/FormDialog'
import { FormMessage } from '../auth/FormMessage'
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
    if (saving || !selected) return
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
  return <FormDialog wide id="assign-technician" title={'Assign technician · REP-' + report.id} busy={saving} onClose={onClose}>
    <p className="incident-muted">Ranked by specialization match, active workload, straight-line distance, then technician ID. You make the final decision.</p>
    <FormMessage message={error} />
    {loading && <p role="status">Loading recommendations…</p>}
    {!loading && <>
      <button className="export-button" disabled={saving} onClick={() => setRefresh(refresh + 1)}>Refresh recommendations</button>
      {[true, false].map(recommended => <section className="detail-section" key={String(recommended)}>
        <h3>{recommended ? 'Recommended technicians' : 'Other technicians / incomplete profiles'}</h3>
        <ul className="technician-candidates">{candidates.filter(candidate => candidate.recommended === recommended).map((candidate, index) =>
          <li key={candidate.technician.userId}><label>
            <input type="radio" name="technician" value={candidate.technician.userId} checked={selected === String(candidate.technician.userId)}
              disabled={saving || !candidate.assignable} onChange={event => setSelected(event.target.value)} />
            <span><strong>{recommended && (index + 1) + '. '}{candidate.technician.name}</strong>
              <span>{candidate.technician.availability ? availabilityLabels[candidate.technician.availability] : 'Availability not configured'}
                {' · '}{candidate.technician.specializations.join(', ') || 'No specializations configured'}</span>
              <span>{candidate.technician.activeReportCount} active reports · {candidate.distanceKm === null ? 'Distance unavailable' : candidate.distanceKm.toFixed(1) + ' km straight-line'}</span>
              {candidate.warnings.map(warning => <span className="report-attention" key={warning}>{warning}</span>)}
            </span>
          </label></li>)}</ul>
        {!candidates.some(candidate => candidate.recommended === recommended) && <p className="incident-muted">{recommended ? 'No eligible recommendations. Review available technicians below.' : 'No other technicians.'}</p>}
      </section>)}
      {choice && choice.warnings.length > 0 && <FormMessage type="warning" message={'Manual assignment: ' + choice.warnings.join(' ')} />}
      <button className="dashboard-button" disabled={saving || !choice?.assignable} onClick={assign}>{saving ? 'Assigning…' : 'Confirm assignment'}</button>
    </>}
  </FormDialog>
}

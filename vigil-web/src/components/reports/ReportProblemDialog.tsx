import { useState } from 'react'
import type { SubmitEvent } from 'react'
import type { CustomerService } from '../../models/customerServices'
import type { CustomerReport, ReportCategory } from '../../models/reports'
import { reportCategoryLabels } from '../../models/reports'
import { createReport } from '../../api/reportsApi'
import { useUser } from '../../context/UserContext'
import { FormDialog } from '../workspace/FormDialog'
import { FormMessage } from '../auth/FormMessage'
import { serviceTypeLabels } from '../../services/customerServiceData'

interface Props {
  service: CustomerService
  onCreated(report: CustomerReport): void
  onClose(): void
}

export function ReportProblemDialog({ service, onCreated, onClose }: Props) {
  const { session, onSessionExpired } = useUser()
  const [category, setCategory] = useState<ReportCategory>('NO_INTERNET')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !description.trim()) return
    setSaving(true)
    setError('')
    try {
      onCreated(await createReport(session, service.id, category, description.trim()))
    } catch (error) {
      if (error instanceof Error && error.message === 'SESSION_EXPIRED') onSessionExpired()
      else setError(error instanceof Error ? error.message : 'The report could not be submitted.')
    } finally {
      setSaving(false)
    }
  }

  return <FormDialog id="report-problem" title="Report a problem" busy={saving} onClose={onClose}>
    <p>{serviceTypeLabels[service.serviceType]} · Service #{service.id}</p>
    <p>{service.serviceLocation.formattedAddress}</p>
    <form className="incident-form" onSubmit={submit} aria-busy={saving}>
      <div className="incident-form-field"><label htmlFor="report-category">Problem category</label>
        <select id="report-category" className="field-input" value={category} disabled={saving}
          onChange={event => setCategory(event.target.value as ReportCategory)}>
          {Object.entries(reportCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></div>
      <div className="incident-form-field"><label htmlFor="report-description">Short description</label>
        <textarea id="report-description" className="field-input incident-textarea" rows={4} required maxLength={500}
          value={description} onChange={event => setDescription(event.target.value)} disabled={saving} />
        <span className="incident-muted">{description.length}/500</span></div>
      <FormMessage message={error} />
      <div className="incident-form-actions"><button className="dashboard-button button-neutral" type="button" disabled={saving} onClick={onClose}>Cancel</button>
        <button className="dashboard-button" type="submit" disabled={saving || !description.trim()}>Submit report</button></div>
    </form>
  </FormDialog>
}

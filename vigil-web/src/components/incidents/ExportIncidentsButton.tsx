import type { Incident } from '../../models/incidents'
import { incidentsCsv } from '../../services/dashboardData'
import { Icon } from '../Icon'

interface ExportIncidentsButtonProps {
  incidents: Incident[]
  disabled: boolean
}

export function ExportIncidentsButton({ incidents, disabled }: ExportIncidentsButtonProps) {
  function exportIncidents() {
    const csv = incidentsCsv(incidents)
    const file = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = 'vigil-incidents.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      className="dashboard-button button-neutral"
      type="button"
      disabled={disabled}
      onClick={exportIncidents}
      aria-label="Export incidents"
      title="Export incidents as CSV"
    >
      <Icon name="download" size={16} />
      Export incidents
    </button>
  )
}

import type { Incident } from '../../models/incidents'
import { formatDate, incidentsCsv } from '../../services/dashboardData'
import { Icon } from '../Icon'

interface DashboardFooterProps {
  loadedAt: number
  incidents: Incident[]
  admin: boolean
}

export function DashboardFooter({ loadedAt, incidents, admin }: DashboardFooterProps) {
  let scope = 'Your assigned incidents'
  if (admin) {
    scope = 'All workspace incidents'
  }

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
    <div className="dashboard-data-footer">
      <span role="status">
        <span className="data-scope-dot" />
        Last updated{' '}
        {formatDate(loadedAt, { hour: '2-digit', minute: '2-digit' })} · {scope}
      </span>
      <button className="export-button" type="button" onClick={exportIncidents}>
        <Icon name="download" size={15} />
        Export incidents
      </button>
    </div>
  )
}

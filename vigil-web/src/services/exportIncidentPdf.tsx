import { pdf } from '@react-pdf/renderer'
import type { Incident, IncidentComment } from '../models/incidents'
import { IncidentPdf } from '../components/incidents/IncidentPdf'

export async function downloadIncidentPdf(
  incident: Incident,
  comments: IncidentComment[]
) {
  const blob = await pdf(
    <IncidentPdf incident={incident} comments={comments} />
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'vigil-incident-' + incident.id + '.pdf'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

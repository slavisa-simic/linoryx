import type { AuthSession } from '../models/auth'
import type { Incident, IncidentPage } from '../models/incidents'
import { apiRequest } from './apiRequest'

export async function listIncidents(session: AuthSession): Promise<Incident[]> {
  let incidents: Incident[] = []
  let pageNumber = 0
  let totalPages = 1

  // Backend vraca stranice. Ucitavamo ih redom da bi zbir bio tacan.
  while (pageNumber < totalPages) {
    const page: IncidentPage = await apiRequest(
      '/incidents?size=200&sort=id,asc&page=' + pageNumber,
      session.token
    )
    incidents = incidents.concat(page.content)
    totalPages = page.totalPages
    pageNumber = pageNumber + 1
  }

  return incidents
}

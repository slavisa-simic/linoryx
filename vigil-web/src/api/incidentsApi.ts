import type { AuthSession } from '../models/auth'
import type {
  CommentPage,
  CreateIncidentRequest,
  Incident,
  IncidentAction,
  IncidentComment,
  IncidentPage
} from '../models/incidents'
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

export async function getIncident(session: AuthSession, id: number): Promise<Incident> {
  return apiRequest('/incidents/' + id, session.token)
}

export async function createIncident(
  session: AuthSession,
  data: CreateIncidentRequest
): Promise<Incident> {
  return apiRequest('/incidents', session.token, 'POST', data)
}

export async function assignIncident(
  session: AuthSession,
  id: number,
  technicianId: number
): Promise<Incident> {
  return apiRequest('/incidents/' + id + '/assign', session.token, 'PATCH', {
    technicianId: technicianId
  })
}

export async function progressIncident(
  session: AuthSession,
  id: number,
  action: IncidentAction
): Promise<Incident> {
  return apiRequest('/incidents/' + id + '/' + action, session.token, 'PATCH')
}

export async function getComments(session: AuthSession, id: number): Promise<IncidentComment[]> {
  let comments: IncidentComment[] = []
  let pageNumber = 0
  let totalPages = 1
  while (pageNumber < totalPages) {
    const page: CommentPage = await apiRequest(
      '/incidents/' + id + '/comments?size=200&sort=createdAt,asc&page=' + pageNumber,
      session.token
    )
    comments = comments.concat(page.content)
    totalPages = page.totalPages
    pageNumber = pageNumber + 1
  }
  return comments
}

export async function addComment(
  session: AuthSession,
  id: number,
  content: string
): Promise<IncidentComment> {
  return apiRequest('/incidents/' + id + '/comments', session.token, 'POST', {
    content: content
  })
}

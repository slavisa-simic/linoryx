export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED'

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type IncidentCategory =
  'SECURITY' | 'NETWORK' | 'APPLICATION' | 'CLOUD' | 'DATABASE' | 'OTHER'

export interface Incident {
  id: number
  title: string
  description: string
  severity: Severity
  status: IncidentStatus
  category: IncidentCategory
  createdById: number
  createdByEmail: string
  assignedToId: number | null
  assignedToEmail: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  closedAt: string | null
  legacy: boolean
  legacyStatus: string | null
  reportCount: number
  closedReportCount: number
}

export interface CreateIncidentRequest {
  reportIds: number[]
  title: string
  description: string
  severity: Severity
  category: IncidentCategory
}

export interface IncidentComment {
  id: number
  incidentId: number
  authorId: number
  authorFirstName: string
  authorLastName: string
  content: string
  createdAt: string
}

export interface CommentPage {
  content: IncidentComment[]
  totalPages: number
}

export type IncidentAction = 'start' | 'close'

export interface IncidentPage {
  content: Incident[]
  totalPages: number
}

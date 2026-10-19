export interface AuditEntry {
  id: number
  incidentId: number
  actorId: number
  actorFirstName: string
  actorLastName: string
  targetUserId: number | null
  targetUserFirstName: string | null
  targetUserLastName: string | null
  action: 'CREATED' | 'ASSIGNED' | 'STARTED' | 'RESOLVED' | 'CLOSED' | 'COMMENT_ADDED'
  createdAt: string
}

export interface AuditPage {
  content: AuditEntry[]
}

import type { UserRole } from './users'

export interface AuditEntry {
  id: number
  incidentId: number | null
  reportId: number | null
  actorId: number | null
  actorFirstName: string | null
  actorLastName: string | null
  targetUserId: number | null
  targetUserFirstName: string | null
  targetUserLastName: string | null
  action:
    | 'REPORT_CREATED'
    | 'REPORT_LINKED'
    | 'REPORT_ASSIGNED'
    | 'REPORT_STARTED'
    | 'REPORT_RESOLVED'
    | 'CUSTOMER_CONFIRMED'
    | 'CUSTOMER_STILL_NOT_WORKING'
    | 'REPORT_CLOSED'
    | 'CREATED'
    | 'CATEGORY_CHANGED'
    | 'ASSIGNED'
    | 'STARTED'
    | 'RESOLVED'
    | 'CLOSED'
    | 'COMMENT_ADDED'
    | 'USER_ROLE_CHANGED'
    | 'USER_DISABLED'
    | 'USER_ENABLED'
  previousRole: UserRole | null
  newRole: UserRole | null
  createdAt: string
}

export interface AuditPage {
  content: AuditEntry[]
  totalPages: number
}

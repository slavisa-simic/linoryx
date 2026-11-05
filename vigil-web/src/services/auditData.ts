import type { AuditEntry } from '../models/audit'

export const auditActionLabels = {
  REPORT_CREATED: 'Report created',
  REPORT_LINKED: 'Report linked to incident',
  REPORT_ASSIGNED: 'Report technician assigned',
  REPORT_STARTED: 'Report work started',
  REPORT_RESOLVED: 'Report resolved',
  CUSTOMER_CONFIRMED: 'Customer confirmed fix',
  CUSTOMER_STILL_NOT_WORKING: 'Customer: still not working',
  REPORT_CLOSED: 'Report closed',
  CREATED: 'Incident created',
  CATEGORY_CHANGED: 'Incident category changed',
  ASSIGNED: 'Technician assigned',
  STARTED: 'Work started',
  RESOLVED: 'Incident resolved',
  CLOSED: 'Incident closed',
  COMMENT_ADDED: 'Comment added',
  USER_ROLE_CHANGED: 'Role changed',
  USER_DISABLED: 'Account disabled',
  USER_ENABLED: 'Account enabled'
}

export const auditRoleLabels = {
  ADMIN: 'Administrator',
  DISPATCHER: 'Dispatcher',
  TECHNICIAN: 'Technician',
  USER: 'User'
}

export function auditActorName(entry: AuditEntry): string {
  let name = ''
  if (entry.actorFirstName) {
    name = entry.actorFirstName
  }
  if (entry.actorLastName) {
    name = name + ' ' + entry.actorLastName
  }
  if (name.trim() === '') {
    return 'System'
  }
  return name.trim()
}

export function auditTargetName(entry: AuditEntry): string {
  let name = ''
  if (entry.targetUserFirstName) {
    name = entry.targetUserFirstName
  }
  if (entry.targetUserLastName) {
    name = name + ' ' + entry.targetUserLastName
  }
  if (name.trim() !== '') {
    return name.trim()
  }
  if (entry.targetUserId !== null) {
    return 'User #' + entry.targetUserId
  }
  return '—'
}

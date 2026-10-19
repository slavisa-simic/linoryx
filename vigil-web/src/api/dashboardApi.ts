import type { AuthSession } from '../models/auth'
import type { AuditEntry } from '../models/audit'
import type { DashboardSnapshot } from '../models/dashboard'
import type { User } from '../models/users'
import { listIncidents } from './incidentsApi'
import { listUsers } from './usersApi'
import { getRecentAuditLogs } from './auditApi'

export async function getDashboard(session: AuthSession): Promise<DashboardSnapshot> {
  if (session.role === 'USER') {
    throw new Error('The incident overview is available to administrators and technicians.')
  }

  const incidents = await listIncidents(session)
  let users: User[] = []
  let activity: AuditEntry[] = []

  if (session.role === 'ADMIN') {
    users = await listUsers(session)
    activity = await getRecentAuditLogs(session)
  }

  return {
    incidents: incidents,
    users: users,
    activity: activity,
    loadedAt: Date.now()
  }
}

import type { AuthSession } from '../models/auth'
import type { AuditEntry, AuditPage } from '../models/audit'
import { apiRequest } from './apiRequest'

export async function getRecentAuditLogs(session: AuthSession): Promise<AuditEntry[]> {
  const page: AuditPage = await apiRequest('/audit?size=6&sort=createdAt,desc', session.token)
  return page.content
}

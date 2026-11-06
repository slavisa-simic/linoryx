import type { AuthSession } from '../models/auth'
import type { AuditEntry, AuditPage } from '../models/audit'
import { apiRequest } from './apiRequest'

export async function listAuditLogs(session: AuthSession): Promise<AuditEntry[]> {
  let entries: AuditEntry[] = []
  let pageNumber = 0
  let totalPages = 1
  while (pageNumber < totalPages) {
    const page: AuditPage = await apiRequest(
      '/audit?size=200&sort=id,desc&page=' + pageNumber,
      session.token
    )
    entries = entries.concat(page.content)
    totalPages = page.totalPages
    pageNumber = pageNumber + 1
  }
  return entries
}

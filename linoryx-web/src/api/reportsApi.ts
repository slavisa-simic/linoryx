import type { AuthSession } from '../models/auth'
import type { CustomerReport, ReportAction, ReportCategory } from '../models/reports'
import { apiRequest } from './apiRequest'

export async function listReports(session: AuthSession, incidentId?: number): Promise<CustomerReport[]> {
  let path = '/reports'
  if (session.role === 'USER') path += '/my'
  if (session.role === 'TECHNICIAN') path += '/assigned'
  let reports: CustomerReport[] = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    let query = '?size=200&sort=createdAt,desc&page=' + page
    if (incidentId) query += '&incidentId=' + incidentId
    const result = await apiRequest(path + query, session.token)
    reports = reports.concat(result.content)
    totalPages = result.totalPages
    page += 1
  }
  return reports
}

export async function createReport(session: AuthSession, customerServiceId: number, category: ReportCategory, description: string): Promise<CustomerReport> {
  return apiRequest('/reports', session.token, 'POST', { customerServiceId, category, description })
}

export async function reportAction(session: AuthSession, id: number, action: ReportAction): Promise<CustomerReport> {
  return apiRequest('/reports/' + id + '/' + action, session.token, 'PATCH')
}

export async function assignReport(session: AuthSession, id: number, technicianId: number): Promise<CustomerReport> {
  return apiRequest('/reports/' + id + '/assign', session.token, 'PATCH', { technicianId })
}

export async function attachReports(session: AuthSession, incidentId: number, reportIds: number[]) {
  return apiRequest('/incidents/' + incidentId + '/reports', session.token, 'POST', { reportIds })
}

import type { ServiceType } from './customerServices'

export type ReportStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type ReportCategory = 'NO_INTERNET' | 'SLOW_CONNECTION' | 'UNSTABLE_CONNECTION' | 'HIGH_LATENCY' | 'EQUIPMENT_ISSUE' | 'OTHER'
export type ReportAction = 'start' | 'resolve' | 'confirm-fixed' | 'still-not-working' | 'close'

export interface CustomerReport {
  id: number
  customerServiceId: number
  serviceType: ServiceType
  serviceAddress: string
  category: ReportCategory
  description: string
  status: ReportStatus
  userConfirmed: boolean
  customerReportedUnfixed: boolean
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  closedAt?: string
  customerId?: number
  customerName?: string
  customerEmail?: string
  networkNodeCode?: string
  networkNodeName?: string
  assignedTechnicianId?: number
  assignedTechnicianName?: string
  incidentId?: number
  incidentTitle?: string
  incidentStatus?: 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
}

export const reportCategoryLabels: Record<ReportCategory, string> = {
  NO_INTERNET: 'No internet',
  SLOW_CONNECTION: 'Slow connection',
  UNSTABLE_CONNECTION: 'Unstable connection',
  HIGH_LATENCY: 'High latency',
  EQUIPMENT_ISSUE: 'Equipment issue',
  OTHER: 'Other'
}

export const reportStatusLabels: Record<ReportStatus, string> = {
  OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved', CLOSED: 'Closed'
}

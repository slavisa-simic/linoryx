import type { Incident, IncidentStatus } from './incidents'
import type { User } from './users'

export interface DashboardSnapshot {
  incidents: Incident[]
  users: User[]
  loadedAt: number
}

export interface StatusCount {
  key: IncidentStatus
  name: string
  value: number
  fill: string
}

export interface ChartCount {
  name: string
  value: number
  fill?: string
}

export interface WorkloadCount {
  id: number
  name: string
  value: number
}

export interface CategoryCount {
  name: string
  active: number
  completed: number
}

export interface DailyCount {
  name: string
  reported: number
  resolved: number
}

export interface DashboardStatistics {
  total: number
  active: number
  critical: number
  unassigned: number
  resolutionRate: number
  averageResolutionHours: number | null
  reportedInWindow: number
  resolvedInWindow: number
  status: StatusCount[]
  severity: ChartCount[]
  categories: CategoryCount[]
  trend: DailyCount[]
  workload: WorkloadCount[]
}

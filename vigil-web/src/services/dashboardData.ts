import type {
  CategoryCount,
  ChartCount,
  DailyCount,
  DashboardStatistics,
  StatusCount,
  WorkloadCount
} from '../models/dashboard'
import type { Incident, IncidentCategory, IncidentStatus, Severity } from '../models/incidents'
import type { User } from '../models/users'

export const statusLabels = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed'
}

export const severityLabels = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
}

export const categoryLabels = {
  SECURITY: 'Security',
  NETWORK: 'Network',
  APPLICATION: 'Application',
  CLOUD: 'Cloud',
  DATABASE: 'Database',
  OTHER: 'Other'
}

const statusColors = {
  OPEN: 'var(--chart-blue)',
  IN_PROGRESS: 'var(--chart-amber)',
  RESOLVED: 'var(--chart-green)',
  CLOSED: 'var(--chart-slate)'
}

const severityColors = {
  CRITICAL: 'var(--chart-red)',
  HIGH: 'var(--chart-orange)',
  MEDIUM: 'var(--chart-amber)',
  LOW: 'var(--chart-blue)'
}

export function isActive(incident: Incident): boolean {
  return incident.status === 'OPEN' || incident.status === 'IN_PROGRESS'
}

export function userName(user: User): string {
  const name = (user.firstName + ' ' + user.lastName).trim()
  if (name === '') {
    return user.email.split('@')[0]
  }
  return name
}

export function formatDate(value: string | number, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  if (!options) {
    options = { day: 'numeric', month: 'short' }
  }
  return date.toLocaleString('en-GB', options)
}

export function formatDuration(hours: number | null): string {
  if (hours === null) {
    return '—'
  }
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    if (minutes === 0) {
      return '<1m'
    }
    return minutes + 'm'
  }
  if (hours < 48) {
    return hours.toFixed(1) + 'h'
  }
  return (hours / 24).toFixed(1) + 'd'
}

export function buildDashboard(
  incidents: Incident[],
  users: User[],
  days: number,
  now = new Date()
): DashboardStatistics {
  const statusKeys: IncidentStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
  const severityKeys: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
  const categoryKeys: IncidentCategory[] = [
    'SECURITY',
    'NETWORK',
    'APPLICATION',
    'CLOUD',
    'DATABASE',
    'OTHER'
  ]

  const status: StatusCount[] = []
  const severity: ChartCount[] = []
  const categories: CategoryCount[] = []
  const trend: DailyCount[] = []
  const workload: WorkloadCount[] = []

  let activeCount = 0
  let criticalCount = 0
  let unassignedCount = 0
  let resolutionHours = 0
  let resolutionSampleSize = 0
  let reportedInWindow = 0
  let resolvedInWindow = 0

  // Brojimo incidente za svaku grupu koja se prikazuje na grafikonu.
  for (const key of statusKeys) {
    let count = 0
    for (const incident of incidents) {
      if (incident.status === key) {
        count = count + 1
      }
    }
    status.push({ key: key, name: statusLabels[key], value: count, fill: statusColors[key] })
  }

  for (const key of severityKeys) {
    let count = 0
    for (const incident of incidents) {
      if (isActive(incident) && incident.severity === key) {
        count = count + 1
      }
    }
    severity.push({ name: severityLabels[key], value: count, fill: severityColors[key] })
  }

  for (const key of categoryKeys) {
    let active = 0
    let completed = 0
    for (const incident of incidents) {
      if (incident.category === key) {
        if (isActive(incident)) {
          active = active + 1
        } else {
          completed = completed + 1
        }
      }
    }
    categories.push({ name: categoryLabels[key], active: active, completed: completed })
  }

  for (const incident of incidents) {
    if (isActive(incident)) {
      activeCount = activeCount + 1

      if (incident.severity === 'CRITICAL') {
        criticalCount = criticalCount + 1
      }

      if (incident.assignedToId === null) {
        unassignedCount = unassignedCount + 1
      } else {
        let technician = workload.find((item) => item.id === incident.assignedToId)

        if (!technician) {
          const user = users.find((item) => item.id === incident.assignedToId)
          let name = 'Technician #' + incident.assignedToId
          if (user) {
            name = userName(user)
          } else if (incident.assignedToEmail) {
            name = incident.assignedToEmail.split('@')[0]
          }

          technician = { id: incident.assignedToId, name: name, value: 0 }
          workload.push(technician)
        }

        technician.value = technician.value + 1
      }
    }

    if (incident.resolvedAt) {
      const start = new Date(incident.createdAt).getTime()
      const end = new Date(incident.resolvedAt).getTime()
      const hours = (end - start) / 3600000
      if (hours >= 0) {
        resolutionHours = resolutionHours + hours
        resolutionSampleSize = resolutionSampleSize + 1
      }
    }
  }

  // Za svaki dan brojimo prijavljene i resene incidente.
  for (let index = days - 1; index >= 0; index = index - 1) {
    const date = new Date(now)
    date.setDate(date.getDate() - index)
    let reported = 0
    let resolved = 0

    for (const incident of incidents) {
      const createdDate = new Date(incident.createdAt)
      if (createdDate.toDateString() === date.toDateString() && createdDate <= now) {
        reported = reported + 1
      }
      if (incident.resolvedAt) {
        const resolvedDate = new Date(incident.resolvedAt)
        if (resolvedDate.toDateString() === date.toDateString() && resolvedDate <= now) {
          resolved = resolved + 1
        }
      }
    }

    trend.push({ name: formatDate(date.getTime()), reported: reported, resolved: resolved })
    reportedInWindow = reportedInWindow + reported
    resolvedInWindow = resolvedInWindow + resolved
  }

  workload.sort(function (first, second) {
    return second.value - first.value
  })

  const completedCount = incidents.length - activeCount
  let resolutionRate = 0
  let averageResolutionHours: number | null = null

  if (incidents.length > 0) {
    resolutionRate = Math.round((completedCount / incidents.length) * 100)
  }
  if (resolutionSampleSize > 0) {
    averageResolutionHours = resolutionHours / resolutionSampleSize
  }

  return {
    total: incidents.length,
    active: activeCount,
    critical: criticalCount,
    unassigned: unassignedCount,
    resolutionRate: resolutionRate,
    averageResolutionHours: averageResolutionHours,
    reportedInWindow: reportedInWindow,
    resolvedInWindow: resolvedInWindow,
    status: status,
    severity: severity,
    categories: categories,
    trend: trend,
    workload: workload.slice(0, 5)
  }
}

function csvCell(value: string | number | null): string {
  let text = ''
  if (value !== null) {
    text = String(value)
  }

  // Navodnici ostaju unutar CSV celije; prefiks ne dozvoljava Excel formulu.
  const firstCharacter = text.trimStart().charAt(0)
  if (
    firstCharacter === '=' ||
    firstCharacter === '+' ||
    firstCharacter === '-' ||
    firstCharacter === '@'
  ) {
    text = "'" + text
  }
  return '"' + text.replaceAll('"', '""') + '"'
}

export function incidentsCsv(incidents: Incident[]): string {
  let csv =
    '\uFEFF"ID","Title","Status","Severity","Category","Assigned to","Reported at","Resolved at"'

  for (const incident of incidents) {
    const row = [
      incident.id,
      incident.title,
      incident.status,
      incident.severity,
      incident.category,
      incident.assignedToEmail,
      incident.createdAt,
      incident.resolvedAt
    ]
    const cells: string[] = []
    for (const value of row) {
      cells.push(csvCell(value))
    }
    csv = csv + '\r\n' + cells.join(',')
  }

  return csv
}

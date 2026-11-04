import { listReports } from './reportsApi'
import type { AuthSession } from '../models/auth'
import type { DashboardSnapshot } from '../models/dashboard'
import type { Technician } from '../models/users'
import { listIncidents } from './incidentsApi'
import { getTechnicians } from './techniciansApi'

export async function getDashboard(session: AuthSession): Promise<DashboardSnapshot> {
  if (session.role === 'USER') {
    throw new Error('The incident overview is available to administrators, dispatchers and technicians.')
  }

  const incidents = await listIncidents(session)
  let technicians: Technician[] = []

  if (session.role === 'ADMIN' || session.role === 'DISPATCHER') {
    technicians = await getTechnicians(session)
  }

  return {
    incidents: incidents,
    reports: await listReports(session),
    technicians: technicians,
    loadedAt: Date.now()
  }
}

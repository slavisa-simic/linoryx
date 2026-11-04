import type { AuthSession } from '../models/auth'
import type { Technician } from '../models/users'
import { apiRequest } from './apiRequest'

export async function getTechnicians(session: AuthSession): Promise<Technician[]> {
  return apiRequest('/technicians', session.token)
}

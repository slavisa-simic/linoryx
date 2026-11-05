import type { AuthSession } from '../models/auth'
import type { Technician } from '../models/users'
import { apiRequest } from './apiRequest'
import type { AssignmentLocation, TechnicianProfile, TechnicianProfileRequest, TechnicianRecommendation } from '../models/technicians'

export async function getTechnicians(session: AuthSession): Promise<Technician[]> {
  return apiRequest('/technicians', session.token)
}

export async function getMyTechnicianProfile(session: AuthSession): Promise<TechnicianProfile> {
  return apiRequest('/technician-profile/me', session.token)
}

export async function saveMyTechnicianProfile(session: AuthSession, request: TechnicianProfileRequest): Promise<TechnicianProfile> {
  return apiRequest('/technician-profile/me', session.token, 'PUT', request)
}

export async function getTechnicianOverview(session: AuthSession): Promise<TechnicianProfile[]> {
  return apiRequest('/technicians/overview', session.token)
}

export async function getTechnicianRecommendations(session: AuthSession, reportId: number): Promise<TechnicianRecommendation[]> {
  return apiRequest('/reports/' + reportId + '/technician-recommendations', session.token)
}

export async function getMyAssignmentLocations(session: AuthSession): Promise<AssignmentLocation[]> {
  return apiRequest('/technicians/me/assignment-locations', session.token)
}

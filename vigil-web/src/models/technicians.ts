import type { ServiceType } from './customerServices'
import type { ReportCategory, ReportStatus } from './reports'

export type TechnicianAvailability = 'AVAILABLE' | 'BUSY' | 'OFF_DUTY'
export type TechnicianSpecialization = 'FIBER' | 'GPON' | 'ROUTING' | 'WIRELESS' | 'DSL'

export const availabilityLabels = { AVAILABLE: 'Available', BUSY: 'Busy', OFF_DUTY: 'Off duty' }
export const specializations: TechnicianSpecialization[] = ['FIBER', 'GPON', 'ROUTING', 'WIRELESS', 'DSL']

export interface TechnicianProfile {
  userId: number
  name: string
  latitude: number | null
  longitude: number | null
  availability: TechnicianAvailability | null
  specializations: TechnicianSpecialization[]
  locationUpdatedAt: string | null
  activeReportCount: number
}

export interface TechnicianProfileRequest {
  latitude: number | null
  longitude: number | null
  availability: TechnicianAvailability | null
  specializations: TechnicianSpecialization[]
}

export interface TechnicianRecommendation {
  technician: TechnicianProfile
  recommended: boolean
  assignable: boolean
  matchQuality: number
  distanceKm: number | null
  warnings: string[]
}

export interface AssignmentLocation {
  locationId: number
  address: string
  latitude: number
  longitude: number
  reports: { id: number; serviceType: ServiceType; category: ReportCategory; status: ReportStatus }[]
}

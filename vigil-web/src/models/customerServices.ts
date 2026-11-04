import type { LocationData, LocationRequest } from './locations'

export type ServiceType = 'FIBER' | 'DSL' | 'WIRELESS'
export type ServiceStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'

export interface CustomerService {
  id: number
  customerId: number
  serviceType: ServiceType
  serviceLocationId: number
  serviceLocation: LocationData
  networkNodeId: number
  networkNodeCode: string
  networkNodeName: string
  status: ServiceStatus
  createdAt: string
}

export interface CustomerServiceRequest {
  serviceType: ServiceType
  location: LocationRequest | null
  networkNodeId: number
  status: ServiceStatus
}

export interface CustomerServicePage {
  content: CustomerService[]
  totalPages: number
}

import type { LocationRequest } from './locations'

export type NodeType = 'GPON_OLT' | 'ROUTER' | 'SWITCH' | 'WIRELESS_BASE_STATION'
export type NodeStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

export interface NetworkNode {
  id: number
  code: string
  name: string
  nodeType: NodeType
  location: string
  city: string
  countryCode: string
  latitude: number
  longitude: number
  status: NodeStatus
  createdAt: string
  customerServiceCount: number
}

export interface NetworkNodeRequest {
  name: string
  nodeType: NodeType
  location: LocationRequest | null
  status: NodeStatus
}

export interface NetworkNodePage {
  content: NetworkNode[]
  totalPages: number
}

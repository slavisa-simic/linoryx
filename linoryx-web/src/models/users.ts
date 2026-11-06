export type UserRole = 'USER' | 'TECHNICIAN' | 'DISPATCHER' | 'ADMIN'

export interface Technician {
  id: number
  firstName: string
  lastName: string
}

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  role: UserRole
  enabled: boolean
  createdAt: string
}

export interface UserPage {
  content: User[]
  totalPages: number
}

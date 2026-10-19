export type UserRole = 'USER' | 'TECHNICIAN' | 'ADMIN'

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

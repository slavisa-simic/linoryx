import type { UserRole } from './users'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  tokenType: string
}

export interface AuthSession {
  token: string
  tokenType: string
  email: string
  expiresAt: number
  userId: number
  role: UserRole
}

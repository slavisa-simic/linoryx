import type { AuthResponse, AuthSession } from '../models/auth'

export interface SessionService {
  getSession(): AuthSession | null
  saveSession(response: AuthResponse, email: string): AuthSession
  clearSession(): void
}

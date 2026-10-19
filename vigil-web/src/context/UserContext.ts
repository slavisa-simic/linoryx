import { createContext, useContext } from 'react'
import type { AuthSession } from '../models/auth'
import type { User } from '../models/users'

interface UserContextValue {
  session: AuthSession
  user: User | null
  onLogout(): void
  onSessionExpired(): void
}

export const UserContext = createContext<UserContextValue | null>(null)

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used inside UserProvider.')
  }
  return context
}

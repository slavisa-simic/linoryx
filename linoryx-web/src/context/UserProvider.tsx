import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthSession } from '../models/auth'
import type { User } from '../models/users'
import { getCurrentUser } from '../api/usersApi'
import { UserContext } from './UserContext'

interface UserProviderProps {
  session: AuthSession
  onLogout(): void
  onSessionExpired(): void
  children: ReactNode
}

export function UserProvider({ session, onLogout, onSessionExpired, children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadUser() {
      setUser(null)
      setError('')
      try {
        const currentUser = await getCurrentUser(session)
        if (active) {
          setUser(currentUser)
        }
      } catch (error) {
        if (active && error instanceof Error) {
          setError(error.message)
        }
      }
    }

    loadUser()
    return () => {
      active = false
    }
  }, [session])

  useEffect(() => {
    if (error === 'SESSION_EXPIRED') {
      onSessionExpired()
    }
  }, [error, onSessionExpired])

  return (
    <UserContext.Provider value={{ session, user, onLogout, onSessionExpired }}>
      {children}
    </UserContext.Provider>
  )
}

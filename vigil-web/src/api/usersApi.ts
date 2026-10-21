import type { AuthSession } from '../models/auth'
import type { UserRole } from '../models/users'
import type { User, UserPage } from '../models/users'
import { apiRequest } from './apiRequest'

export async function getCurrentUser(session: AuthSession): Promise<User> {
  return apiRequest('/users/me', session.token)
}

export async function listUsers(session: AuthSession): Promise<User[]> {
  let users: User[] = []
  let pageNumber = 0
  let totalPages = 1

  while (pageNumber < totalPages) {
    const page: UserPage = await apiRequest(
      '/users?size=200&sort=id,asc&page=' + pageNumber,
      session.token
    )
    users = users.concat(page.content)
    totalPages = page.totalPages
    pageNumber = pageNumber + 1
  }

  return users
}

export async function getTechnicians(session: AuthSession): Promise<User[]> {
  const users = await listUsers(session)
  return users.filter((user) => user.role === 'TECHNICIAN' && user.enabled)
}

export async function changeUserRole(
  session: AuthSession,
  id: number,
  role: UserRole
): Promise<User> {
  return apiRequest('/users/' + id + '/role', session.token, 'PATCH', {
    role: role
  })
}

export async function setUserEnabled(
  session: AuthSession,
  id: number,
  enabled: boolean
): Promise<User> {
  let action = 'disable'
  if (enabled) {
    action = 'enable'
  }
  return apiRequest('/users/' + id + '/' + action, session.token, 'PATCH')
}

import type { AuthSession } from '../models/auth'
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
    const page: UserPage = await apiRequest('/users?size=200&sort=id,asc&page=' + pageNumber, session.token)
    users = users.concat(page.content)
    totalPages = page.totalPages
    pageNumber = pageNumber + 1
  }

  return users
}

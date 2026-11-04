import type { AuthSession } from '../models/auth'
import type { CustomerService, CustomerServicePage, CustomerServiceRequest } from '../models/customerServices'
import { apiRequest } from './apiRequest'

export async function listCustomerServices(session: AuthSession, customerId?: number): Promise<CustomerService[]> {
  let items: CustomerService[] = []
  let pageNumber = 0
  let totalPages = 1
  let filter = ''
  if (customerId !== undefined) {
    filter = '&customerId=' + customerId
  }
  while (pageNumber < totalPages) {
    const page: CustomerServicePage = await apiRequest(
      '/customer-services?size=200&sort=id,asc&page=' + pageNumber + filter, session.token
    )
    items = items.concat(page.content)
    totalPages = page.totalPages
    pageNumber = pageNumber + 1
  }
  return items
}

export async function saveCustomerService(
  session: AuthSession, customerId: number, id: number | null, request: CustomerServiceRequest
): Promise<CustomerService> {
  if (id !== null) {
    return apiRequest('/customer-services/' + id, session.token, 'PUT', request)
  }
  return apiRequest('/users/' + customerId + '/services', session.token, 'POST', request)
}

export async function terminateCustomerService(session: AuthSession, id: number): Promise<CustomerService> {
  return apiRequest('/customer-services/' + id + '/terminate', session.token, 'PATCH')
}

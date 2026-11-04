import type { CustomerService, ServiceStatus } from '../models/customerServices'

export const serviceTypeLabels = { FIBER: 'Fiber', DSL: 'DSL', WIRELESS: 'Wireless' }
export const serviceStatusLabels = {
  ACTIVE: 'Active', PENDING_ACTIVATION: 'Pending activation', SUSPENDED: 'Suspended', TERMINATED: 'Terminated'
}

export function serviceSummary(services: CustomerService[], customerId: number): string {
  const items = services.filter((item) => item.customerId === customerId)
  // Active wins, then pending activation, suspended and terminated.
  const order: ServiceStatus[] = ['ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED', 'TERMINATED']
  for (const status of order) {
    if (items.some((item) => item.status === status)) {
      if (status === 'PENDING_ACTIVATION') {
        return 'Pending'
      }
      return serviceStatusLabels[status]
    }
  }
  return 'No service'
}

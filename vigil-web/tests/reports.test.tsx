// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { UserContext } from '../src/context/UserContext'
import { ReportsTable } from '../src/components/reports/ReportsTable'
import { ReportsPage } from '../src/pages/ReportsPage'
import { ServicesPage } from '../src/pages/ServicesPage'
import { IncidentDetails } from '../src/components/incidents/IncidentDetails'
import { apiRequest } from '../src/api/apiRequest'
import type { CustomerReport } from '../src/models/reports'
import type { Incident } from '../src/models/incidents'
import type { UserRole } from '../src/models/users'
import type { ReactNode } from 'react'

vi.mock('../src/api/apiRequest', () => ({ apiRequest: vi.fn() }))
const request = vi.mocked(apiRequest)
const expiresAt = Date.now() + 3600000
const report: CustomerReport = {
  id: 101, customerServiceId: 5, serviceType: 'FIBER', serviceAddress: 'Main Street 42',
  category: 'NO_INTERNET', description: 'Connection stopped', status: 'RESOLVED', userConfirmed: false,
  customerReportedUnfixed: false, createdAt: '2026-11-01T10:00:00', updatedAt: '2026-11-01T12:00:00',
  assignedTechnicianId: 7, assignedTechnicianName: 'Ana Technician', incidentId: 10, incidentTitle: 'Outage', incidentStatus: 'IN_PROGRESS'
}
const incident: Incident = { id: 10, title: 'Outage', description: 'Two services offline', category: 'FIBER_FAILURE', severity: 'HIGH',
  status: 'IN_PROGRESS', createdById: 1, createdByEmail: 'dispatcher@test.invalid', assignedToId: null, assignedToEmail: null,
  createdAt: report.createdAt, updatedAt: report.updatedAt, resolvedAt: null, closedAt: null,
  legacy: false, legacyStatus: null, reportCount: 1, closedReportCount: 0 }

function Provider({ role, children }: { role: UserRole; children: ReactNode }) {
  return <UserContext.Provider value={{ session: { userId: 7, email: 'test@test.invalid', role, token: 'token', tokenType: 'Bearer', expiresAt },
    user: null, onLogout: vi.fn(), onSessionExpired: vi.fn() }}>{children}</UserContext.Provider>
}

beforeEach(() => {
  request.mockReset()
  request.mockImplementation(async path => {
    if (path === '/technicians') return [{ id: 7, firstName: 'Ana', lastName: 'Technician' }]
    if (path.startsWith('/incidents?')) return { content: [incident], totalPages: 1 }
    if (path.startsWith('/reports')) return { content: [report], totalPages: 1 }
    if (path === '/incidents/10') return incident
    if (path.includes('/comments')) return { content: [], totalPages: 1 }
    throw new Error('Unexpected API request: ' + path)
  })
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})
afterEach(cleanup)

it('customers see exactly two resolution actions and confirmation keeps the report resolved', async () => {
  const update = vi.fn()
  request.mockResolvedValue({ ...report, userConfirmed: true })
  render(<Provider role="USER"><ReportsTable reports={[report]} onUpdated={update} /></Provider>)
  expect(screen.getAllByRole('button')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Problem Fixed' }))
  await waitFor(() => expect(update).toHaveBeenCalledWith({ ...report, userConfirmed: true }))
  expect(request).toHaveBeenCalledWith('/reports/101/confirm-fixed', 'token', 'PATCH')
})

it('still not working sends one action without opening a feedback form', async () => {
  request.mockResolvedValue({ ...report, status: 'IN_PROGRESS', customerReportedUnfixed: true })
  render(<Provider role="USER"><ReportsTable reports={[report]} onUpdated={vi.fn()} /></Provider>)
  fireEvent.click(screen.getByRole('button', { name: 'Still Not Working' }))
  await waitFor(() => expect(request).toHaveBeenCalledWith('/reports/101/still-not-working', 'token', 'PATCH'))
  expect(screen.queryByRole('textbox')).toBeNull()
})

it('closed customer reports have no confirmation actions', () => {
  render(<Provider role="USER"><ReportsTable reports={[{ ...report, status: 'CLOSED' }]} onUpdated={vi.fn()} /></Provider>)
  expect(screen.queryByRole('button', { name: 'Problem Fixed' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Still Not Working' })).toBeNull()
})

it('dispatcher closure is disabled until the customer confirms', () => {
  const view = render(<Provider role="DISPATCHER"><ReportsTable reports={[report]} onUpdated={vi.fn()} /></Provider>)
  expect((screen.getByRole('button', { name: 'Close report' }) as HTMLButtonElement).disabled).toBe(true)
  view.rerender(<Provider role="DISPATCHER"><ReportsTable reports={[{ ...report, userConfirmed: true }]} onUpdated={vi.fn()} /></Provider>)
  expect((screen.getByRole('button', { name: 'Close report' }) as HTMLButtonElement).disabled).toBe(false)
})

it('technicians see only their valid work actions and cannot close reports', async () => {
  request.mockResolvedValue({ ...report, status: 'RESOLVED' })
  render(<Provider role="TECHNICIAN"><ReportsTable reports={[{ ...report, status: 'IN_PROGRESS', customerReportedUnfixed: true }]} onUpdated={vi.fn()} /></Provider>)
  expect(screen.getByText('Customer: still not working')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Close report' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Mark resolved' }))
  await waitFor(() => expect(request).toHaveBeenCalledWith('/reports/101/resolve', 'token', 'PATCH'))
})

it('technicians cannot start before the dispatcher starts the incident', () => {
  render(<Provider role="TECHNICIAN"><ReportsTable reports={[{ ...report, status: 'OPEN', incidentStatus: 'OPEN' }]} onUpdated={vi.fn()} /></Provider>)
  expect((screen.getByRole('button', { name: 'Start work' }) as HTMLButtonElement).disabled).toBe(true)
})

it('dispatcher selects unlinked reports and creates an incident with their IDs', async () => {
  request.mockImplementation(async (path, _token, method, data) => {
    if (path === '/incidents/from-reports') return { ...incident, status: 'OPEN' }
    if (path.startsWith('/reports?')) return { content: [{ ...report, incidentId: undefined, status: 'OPEN' }], totalPages: 1 }
    if (path === '/technicians') return []
    if (path.startsWith('/incidents?')) return { content: [], totalPages: 1 }
    throw new Error('Unexpected request ' + path + method + JSON.stringify(data))
  })
  const navigate = vi.fn()
  render(<Provider role="DISPATCHER"><ReportsPage onNavigate={navigate} /></Provider>)
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Select REP-101' }))
  fireEvent.click(screen.getByRole('button', { name: 'Create incident' }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('Selected reports: REP-101')).toBeTruthy()
  const category = within(dialog).getByRole('combobox', { name: 'Category' }) as HTMLSelectElement
  expect(category.value).toBe('UNDETERMINED')
  expect(Array.from(category.options, option => option.value)).toEqual([
    'UNDETERMINED', 'FIBER_FAILURE', 'GPON_FAILURE', 'ROUTING_FAILURE', 'EQUIPMENT_FAILURE',
    'WIRELESS_FAILURE', 'POWER_OUTAGE', 'UPSTREAM_FAILURE', 'OTHER'
  ])
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Title' }), { target: { value: 'Fiber outage' } })
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Description' }), { target: { value: 'Investigate the connection' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create incident' }))
  await waitFor(() => expect(request).toHaveBeenCalledWith('/incidents/from-reports', 'token', 'POST', {
    reportIds: [101], title: 'Fiber outage', description: 'Investigate the connection', category: 'UNDETERMINED', severity: 'MEDIUM'
  }))
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('incidents', 10))
})

it('my services submits only service, category and description', async () => {
  request.mockImplementation(async path => {
    if (path.startsWith('/customer-services?')) return { content: [{ id: 5, customerId: 7, serviceType: 'FIBER', status: 'ACTIVE',
      serviceLocation: { formattedAddress: 'Main Street 42' }, networkNodeCode: 'OLT-001', networkNodeName: 'OLT', createdAt: report.createdAt }], totalPages: 1 }
    if (path === '/reports') return report
    throw new Error('Unexpected request ' + path)
  })
  render(<Provider role="USER"><ServicesPage onNavigate={vi.fn()} /></Provider>)
  fireEvent.click(await screen.findByRole('button', { name: 'Report a problem' }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getAllByRole('combobox')).toHaveLength(1)
  expect(within(dialog).getAllByRole('textbox')).toHaveLength(1)
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Short description' }), { target: { value: 'Connection stopped' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Submit report' }))
  await waitFor(() => expect(request).toHaveBeenCalledWith('/reports', 'token', 'POST', {
    customerServiceId: 5, category: 'NO_INTERNET', description: 'Connection stopped'
  }))
  expect(await screen.findByText('Report REP-101 submitted: Connection stopped')).toBeTruthy()
})

it('incident closure requires every report to be closed', async () => {
  const view = render(<Provider role="DISPATCHER"><IncidentDetails incident={incident} technicians={[]} onUpdate={vi.fn()} onClose={vi.fn()} /></Provider>)
  await waitFor(() => expect(screen.queryByText('Loading incident details…')).toBeNull())
  expect((screen.getByRole('button', { name: 'Close incident' }) as HTMLButtonElement).disabled).toBe(true)
  view.unmount()
  request.mockImplementation(async path => {
    if (path === '/incidents/10') return { ...incident, closedReportCount: 1 }
    if (path.startsWith('/reports')) return { content: [{ ...report, status: 'CLOSED' }], totalPages: 1 }
    return { content: [], totalPages: 1 }
  })
  render(<Provider role="DISPATCHER"><IncidentDetails incident={incident} technicians={[]} onUpdate={vi.fn()} onClose={vi.fn()} /></Provider>)
  await waitFor(() => expect((screen.getByRole('button', { name: 'Close incident' }) as HTMLButtonElement).disabled).toBe(false))
})

it.each(['DISPATCHER', 'ADMIN'] as const)('%s can save a diagnosed incident cause without changing report symptoms', async role => {
  const undetermined = { ...incident, category: 'UNDETERMINED' as const }
  const diagnosed = { ...incident, category: 'FIBER_FAILURE' as const }
  request.mockImplementation(async (path, _token, method) => {
    if (path === '/incidents/10/category' && method === 'PATCH') return diagnosed
    if (path === '/incidents/10') return undetermined
    if (path.startsWith('/reports')) return { content: [report], totalPages: 1 }
    return { content: [], totalPages: 1 }
  })
  const onUpdate = vi.fn()
  render(<Provider role={role}><IncidentDetails incident={undetermined} technicians={[]} onUpdate={onUpdate} onClose={vi.fn()} /></Provider>)
  await waitFor(() => expect(screen.queryByText('Loading incident details…')).toBeNull())
  const save = screen.getByRole('button', { name: 'Save category' }) as HTMLButtonElement
  expect(save.disabled).toBe(true)
  fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'FIBER_FAILURE' } })
  fireEvent.click(save)
  await waitFor(() => expect(request).toHaveBeenCalledWith('/incidents/10/category', 'token', 'PATCH', { category: 'FIBER_FAILURE' }))
  expect(await screen.findByText('Incident category updated.')).toBeTruthy()
  expect(onUpdate).toHaveBeenCalledWith(diagnosed)
  expect(screen.getByText('No internet')).toBeTruthy()
  expect(request.mock.calls.filter(([, , method]) => method === 'PATCH')).toHaveLength(1)
  expect(save.disabled).toBe(true)
})

it('keeps a category edit available after a failed save', async () => {
  request.mockImplementation(async path => {
    if (path === '/incidents/10/category') throw new Error('Category could not be saved.')
    if (path === '/incidents/10') return incident
    return { content: [], totalPages: 1 }
  })
  const onUpdate = vi.fn()
  render(<Provider role="DISPATCHER"><IncidentDetails incident={incident} technicians={[]} onUpdate={onUpdate} onClose={vi.fn()} /></Provider>)
  await waitFor(() => expect(screen.queryByText('Loading incident details…')).toBeNull())
  const category = screen.getByRole('combobox', { name: 'Category' }) as HTMLSelectElement
  fireEvent.change(category, { target: { value: 'POWER_OUTAGE' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save category' }))
  expect(await screen.findByText('Category could not be saved.')).toBeTruthy()
  expect(category.value).toBe('POWER_OUTAGE')
  expect(onUpdate).not.toHaveBeenCalled()
  expect((screen.getByRole('button', { name: 'Save category' }) as HTMLButtonElement).disabled).toBe(false)
})

it.each([
  { role: 'TECHNICIAN' as const, legacy: false },
  { role: 'DISPATCHER' as const, legacy: true }
])('hides cause editing for role $role and legacy=$legacy', async ({ role, legacy }) => {
  const item = { ...incident, legacy }
  request.mockImplementation(async path => path === '/incidents/10' ? item : { content: [], totalPages: 1 })
  render(<Provider role={role}><IncidentDetails incident={item} technicians={[]} onUpdate={vi.fn()} onClose={vi.fn()} /></Provider>)
  await waitFor(() => expect(screen.queryByText('Loading incident details…')).toBeNull())
  expect(screen.queryByRole('combobox', { name: 'Category' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Save category' })).toBeNull()
})

it('customers use their private queue and cannot see internal report metadata', async () => {
  render(<Provider role="USER"><ReportsPage onNavigate={vi.fn()} /></Provider>)
  await screen.findByText('REP-101')
  expect(request.mock.calls.some(([path]) => path.startsWith('/reports/my?'))).toBe(true)
  expect(request.mock.calls.some(([path]) => path.startsWith('/incidents') || path === '/technicians')).toBe(false)
  expect(screen.queryByText('Ana Technician')).toBeNull()
  expect(screen.queryByText('INC-10')).toBeNull()
})

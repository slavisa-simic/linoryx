// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { apiRequest } from '../src/api/apiRequest'
import { UserContext } from '../src/context/UserContext'
import { TechnicianProfilePage } from '../src/pages/TechnicianProfilePage'
import { TechniciansPage } from '../src/pages/TechniciansPage'
import { NetworkPage } from '../src/pages/NetworkPage'
import { ReportsPage } from '../src/pages/ReportsPage'
import { AssignTechnicianDialog } from '../src/components/reports/AssignTechnicianDialog'
import type { OperationalMarker } from '../src/components/network/OperationalMap'
import type { UserRole } from '../src/models/users'
import type { TechnicianProfile, TechnicianRecommendation } from '../src/models/technicians'
import type { CustomerReport } from '../src/models/reports'
import { coordinateError } from '../src/services/technicianData'
import { buildDashboard } from '../src/services/dashboardData'
import { DashboardOperations } from '../src/components/dashboard/DashboardOperations'

vi.mock('../src/api/apiRequest', () => ({ apiRequest: vi.fn() }))
vi.mock('../src/components/network/OperationalMap', () => ({
  OperationalMap: ({ markers, label }: { markers: OperationalMarker[]; label: string }) =>
    <section aria-label={label}>{markers.map(marker => <article key={marker.id} data-testid="map-marker">{marker.content}</article>)}</section>
}))

const request = vi.mocked(apiRequest)
const expiresAt = Date.now() + 3600000
const profile: TechnicianProfile = { userId: 7, name: 'Ana Technician', latitude: null, longitude: null,
  availability: null, specializations: [], locationUpdatedAt: null, activeReportCount: 0 }
const configured: TechnicianProfile = { ...profile, latitude: 0, longitude: 0, availability: 'AVAILABLE',
  specializations: ['FIBER', 'GPON'], locationUpdatedAt: '2026-11-04T12:00:00', activeReportCount: 2 }
const report: CustomerReport = { id: 101, customerServiceId: 5, serviceType: 'FIBER', serviceAddress: 'Installation Street 42',
  category: 'NO_INTERNET', description: 'Offline', status: 'OPEN', userConfirmed: false, customerReportedUnfixed: false,
  createdAt: '2026-11-04T12:00:00', updatedAt: '2026-11-04T12:00:00', incidentId: 10, incidentStatus: 'IN_PROGRESS' }

function Provider({ role = 'TECHNICIAN', children }: { role?: UserRole; children: ReactNode }) {
  return <UserContext.Provider value={{ session: { userId: 7, email: 'mine@test.invalid', role, token: 'token', tokenType: 'Bearer', expiresAt },
    user: null, onLogout: vi.fn(), onSessionExpired: vi.fn() }}>{children}</UserContext.Provider>
}

beforeEach(() => {
  request.mockReset()
  window.history.replaceState(null, '', '/')
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})
afterEach(cleanup)

it('My Profile starts empty and saves only manually entered operational fields including zero coordinates', async () => {
  request.mockImplementation(async (_path, _token, method) => method === 'PUT' ? configured : profile)
  render(<Provider><TechnicianProfilePage onNavigate={vi.fn()} /></Provider>)
  const latitude = await screen.findByRole('spinbutton', { name: 'Latitude' })
  expect((latitude as HTMLInputElement).value).toBe('')
  expect((screen.getByRole('spinbutton', { name: 'Longitude' }) as HTMLInputElement).value).toBe('')
  expect((screen.getByRole('combobox', { name: 'Availability' }) as HTMLSelectElement).value).toBe('')
  expect(screen.getAllByRole('spinbutton')).toHaveLength(2)
  expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
  fireEvent.change(latitude, { target: { value: '0' } })
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Longitude' }), { target: { value: '0' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Availability' }), { target: { value: 'AVAILABLE' } })
  fireEvent.click(screen.getByRole('checkbox', { name: 'FIBER' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'GPON' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  await screen.findByText('Your profile has been saved.')
  expect(request).toHaveBeenCalledWith('/technician-profile/me', 'token', 'PUT', { latitude: 0, longitude: 0, availability: 'AVAILABLE', specializations: ['FIBER', 'GPON'] })
  expect((screen.getByRole('textbox', { name: 'Location Updated At' }) as HTMLInputElement).readOnly).toBe(true)
  expect(request.mock.calls.every(([path]) => path === '/technician-profile/me')).toBe(true)
})

it('My Profile rejects partial pairs before saving', async () => {
  request.mockResolvedValue(profile)
  render(<Provider><TechnicianProfilePage onNavigate={vi.fn()} /></Provider>)
  fireEvent.change(await screen.findByRole('spinbutton', { name: 'Latitude' }), { target: { value: '45' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  expect(await screen.findByText('Provide both latitude and longitude, or clear both.')).toBeTruthy()
  expect(request.mock.calls.some(([, , method]) => method === 'PUT')).toBe(false)
})

it('My Profile can clear both coordinates and availability', async () => {
  request.mockImplementation(async (_path, _token, method) => method === 'PUT' ? profile : configured)
  render(<Provider><TechnicianProfilePage onNavigate={vi.fn()} /></Provider>)
  fireEvent.change(await screen.findByRole('spinbutton', { name: 'Latitude' }), { target: { value: '' } })
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Longitude' }), { target: { value: '' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Availability' }), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))
  await screen.findByText('Your profile has been saved.')
  expect(request).toHaveBeenCalledWith('/technician-profile/me', 'token', 'PUT', { latitude: null, longitude: null, availability: null, specializations: ['FIBER', 'GPON'] })
})

it.each([['91', '0'], ['-91', '0'], ['0', '181'], ['0', '-181'], ['x', '1'], ['', '1']])('validates coordinate inputs %s, %s', (latitude, longitude) => {
  expect(coordinateError(latitude, longitude)).not.toBe('')
})

it('accepts null coordinates, zero and boundary coordinates', () => {
  expect(coordinateError('', '')).toBe('')
  expect(coordinateError('0', '0')).toBe('')
  expect(coordinateError('-90', '180')).toBe('')
})

it('dashboard workload includes resolved reports until the dispatcher closes them', () => {
  const result = buildDashboard([], [], 7, new Date(), [
    { ...report, assignedTechnicianId: 7, status: 'RESOLVED' },
    { ...report, id: 102, assignedTechnicianId: 7, status: 'CLOSED' }
  ])
  expect(result.workload).toHaveLength(1)
  expect(result.workload[0].value).toBe(1)
  render(<DashboardOperations data={result} technicians={[]} canManageIncidents={false} />)
  expect(screen.getByText('Your workload')).toBeTruthy()
  expect(screen.getByText('1')).toBeTruthy()
})

it('overview retains incomplete technicians in the table, maps zero coordinates, and filters name, availability and specialization', async () => {
  request.mockResolvedValue([configured, { ...profile, userId: 8, name: 'Marko Technician' }])
  render(<Provider role="DISPATCHER"><TechniciansPage onNavigate={vi.fn()} /></Provider>)
  expect(await screen.findByText('Location not set')).toBeTruthy()
  const table = screen.getByRole('table')
  expect(within(table).getByText('Availability not configured')).toBeTruthy()
  expect(within(table).getByText('No specializations configured')).toBeTruthy()
  expect(within(table).getByText('0 / 0')).toBeTruthy()
  expect(screen.getAllByTestId('map-marker')).toHaveLength(1)
  fireEvent.change(screen.getByRole('searchbox', { name: 'Technician name' }), { target: { value: 'Marko' } })
  expect(within(table).queryByText('Ana Technician')).toBeNull()
  expect(within(table).getByText('Marko Technician')).toBeTruthy()
  fireEvent.change(screen.getByRole('searchbox', { name: 'Technician name' }), { target: { value: '' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Availability' }), { target: { value: 'AVAILABLE' } })
  expect(within(table).queryByText('Marko Technician')).toBeNull()
  fireEvent.change(screen.getByRole('combobox', { name: 'Specialization' }), { target: { value: 'DSL' } })
  expect(screen.getByText('No matching technicians.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Edit/ })).toBeNull()
})

it('assignment shows ranked candidates, blocks unavailable accounts, and allows an explicit manual override with warnings', async () => {
  const recommended: TechnicianRecommendation = { technician: configured, recommended: true, assignable: true, matchQuality: 2, distanceKm: 2.3, warnings: [] }
  const manual: TechnicianRecommendation = { technician: { ...profile, userId: 8, name: 'Manual Technician', availability: 'AVAILABLE' }, recommended: false, assignable: true,
    matchQuality: 0, distanceKm: null, warnings: ['No matching specialization.', 'Technician location not set.'] }
  request.mockImplementation(async (path) => path.endsWith('/assign') ? { ...report, assignedTechnicianId: 8 } : [recommended, manual,
    { ...manual, assignable: false, technician: { ...manual.technician, userId: 9, name: 'Busy Technician', availability: 'BUSY' } }])
  const assigned = vi.fn()
  render(<Provider role="DISPATCHER"><AssignTechnicianDialog report={report} onAssigned={assigned} onClose={vi.fn()} /></Provider>)
  const candidate = await screen.findByRole('radio', { name: /Ana Technician/ })
  expect(within(candidate.closest('label')!).getByText('2.3 km')).toBeTruthy()
  expect(within(candidate.closest('label')!).getByText('active reports')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Confirm assignment' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByText('Other technicians / incomplete profiles'))
  expect((screen.getByRole('radio', { name: /Busy Technician/ }) as HTMLInputElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('radio', { name: /Manual Technician/ }))
  expect(screen.getByText('Manual assignment: No matching specialization. Technician location not set.')).toBeTruthy()
  expect(request.mock.calls.some(([path]) => path.endsWith('/assign'))).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: 'Confirm assignment' }))
  await waitFor(() => expect(assigned).toHaveBeenCalledWith({ ...report, assignedTechnicianId: 8 }))
  expect(request).toHaveBeenCalledWith('/reports/101/assign', 'token', 'PATCH', { technicianId: 8 })
})

it('assignment map opens individual reports and refresh removes locations after reassignment or closure', async () => {
  request.mockResolvedValueOnce([{ locationId: 1, address: 'Installation Street 42', latitude: 0, longitude: 0,
    reports: [{ id: 101, serviceType: 'FIBER', category: 'NO_INTERNET', status: 'OPEN' },
      { id: 102, serviceType: 'DSL', category: 'HIGH_LATENCY', status: 'RESOLVED' }] }]).mockResolvedValue([])
  const navigate = vi.fn()
  render(<Provider><NetworkPage onNavigate={navigate} /></Provider>)
  fireEvent.click(await screen.findByRole('link', { name: 'REP-102' }))
  expect(navigate).toHaveBeenCalledWith('reports', 102)
  expect(screen.getAllByTestId('map-marker')).toHaveLength(1)
  expect(screen.queryByRole('button', { name: 'Add node' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  expect(await screen.findByText('No active assigned reports. Assigned service locations will appear here.')).toBeTruthy()
  expect(request.mock.calls.every(([path]) => path === '/technicians/me/assignment-locations')).toBe(true)
})

it('a report link opens the existing report workflow with technician work actions', async () => {
  window.history.replaceState(null, '', '/reports?report=101')
  request.mockResolvedValue({ content: [{ ...report, assignedTechnicianId: 7 }], totalPages: 1 })
  render(<Provider><ReportsPage onNavigate={vi.fn()} /></Provider>)
  const details = await screen.findByRole('dialog', { name: 'REP-101' })
  expect(within(details).getByText('Installation Street 42')).toBeTruthy()
  expect(within(details).getByRole('button', { name: 'Start work' })).toBeTruthy()
  expect(request.mock.calls.every(([path]) => path.startsWith('/reports/assigned?'))).toBe(true)
})

it('paginates technicians without hiding map locations and resets the page on filtering', async () => {
  const technicians: TechnicianProfile[] = []
  for (let id = 1; id <= 9; id++) technicians.push({ ...configured, userId: id, name: 'Technician ' + id })
  request.mockResolvedValue(technicians)
  render(<Provider role="DISPATCHER"><TechniciansPage onNavigate={vi.fn()} /></Provider>)
  await screen.findByText('1-8 of 9 technicians')
  const table = screen.getByRole('table')
  expect(within(table).getAllByRole('row')).toHaveLength(9)
  expect(within(table).queryByText('Technician 9')).toBeNull()
  expect(screen.getAllByTestId('map-marker')).toHaveLength(9)
  fireEvent.click(screen.getByRole('button', { name: 'Next page of technicians' }))
  expect(screen.getByText('9-9 of 9 technicians')).toBeTruthy()
  expect(within(table).getByText('Technician 9')).toBeTruthy()
  expect(screen.getAllByTestId('map-marker')).toHaveLength(9)
  expect((screen.getByRole('button', { name: 'Next page of technicians' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.change(screen.getByRole('searchbox', { name: 'Technician name' }), { target: { value: 'Technician 1' } })
  expect(screen.getByText('1-1 of 1 technicians')).toBeTruthy()
  expect(within(table).getByText('Technician 1')).toBeTruthy()
  expect(screen.getAllByTestId('map-marker')).toHaveLength(1)
  fireEvent.change(screen.getByRole('combobox', { name: 'Availability' }), { target: { value: 'BUSY' } })
  expect(screen.getByText('0-0 of 0 technicians')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Previous page of technicians' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByRole('button', { name: 'Next page of technicians' }) as HTMLButtonElement).disabled).toBe(true)
})

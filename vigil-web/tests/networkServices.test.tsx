// @vitest-environment jsdom
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { apiRequest } from '../src/api/apiRequest'
import { UserContext } from '../src/context/UserContext'
import { LocationPicker } from '../src/components/locations/LocationPicker'
import { NodeDialog } from '../src/components/network/NodeDialog'
import { ServiceDialog } from '../src/components/customerServices/ServiceDialog'
import { UsersPage } from '../src/pages/UsersPage'
import { ServicesPage } from '../src/pages/ServicesPage'
import { serviceSummary } from '../src/services/customerServiceData'
import { groupNodes } from '../src/services/networkData'
import type { LocationSelection } from '../src/models/locations'
import type { NetworkNode } from '../src/models/network'
import type { CustomerService } from '../src/models/customerServices'
import type { AuthSession } from '../src/models/auth'
import type { User } from '../src/models/users'
import type { ReactNode } from 'react'

vi.mock('../src/api/apiRequest', () => ({ apiRequest: vi.fn() }))
vi.mock('../src/components/locations/LocationMap', () => ({
  LocationMap: ({ editable, onMove }: { editable: boolean; onMove(lat: number, lon: number): void }) => (
    <button type="button" disabled={!editable} onClick={() => onMove(45.26, 19.85)}>Move test marker</button>
  )
}))

const request = vi.mocked(apiRequest)
const session: AuthSession = { role: 'ADMIN', token: 'token', tokenType: 'Bearer', userId: 1,
  email: 'admin@test.com', expiresAt: Date.now() + 3600000 }
const customer: User = { id: 2, email: 'customer@test.com', firstName: 'Ana', lastName: 'Customer', role: 'USER',
  enabled: false, createdAt: '2026-11-01T10:00:00' }
const address = { formattedAddress: 'Main Street 42, Novi Sad, Serbia', city: 'Novi Sad', countryCode: 'RS',
  latitude: 45.25, longitude: 19.84 }
const suggestion = { location: address, placeId: 'verified-place', resultType: 'street' }
const node: NetworkNode = { id: 5, code: 'NOVISAD-OLT-001', name: 'Main OLT', nodeType: 'GPON_OLT',
  location: address.formattedAddress, city: address.city, countryCode: 'RS', latitude: 45.25, longitude: 19.84,
  status: 'ACTIVE', createdAt: '2026-11-01T10:00:00', customerServiceCount: 1 }
const service: CustomerService = { id: 8, customerId: 2, serviceType: 'FIBER', serviceLocationId: 3,
  serviceLocation: address, networkNodeId: 5, networkNodeCode: node.code, networkNodeName: node.name,
  status: 'ACTIVE', createdAt: node.createdAt }

function Provider({ children, role = 'ADMIN' }: { children: ReactNode; role?: AuthSession['role'] }) {
  return <UserContext.Provider value={{ session: { ...session, role }, user: null,
    onLogout: vi.fn(), onSessionExpired: vi.fn() }}>{children}</UserContext.Provider>
}

beforeEach(() => {
  request.mockReset()
  request.mockImplementation(async (path) => {
    if (path.startsWith('/locations/search')) return [suggestion]
    if (path.startsWith('/network-nodes?')) return { content: [node], totalPages: 1 }
    if (path.startsWith('/users?')) return { content: [customer], totalPages: 1 }
    if (path.startsWith('/customer-services?')) return { content: [service], totalPages: 1 }
    if (path === '/network-nodes') return node
    if (path === '/users/2/services') return service
    throw new Error('Unexpected API request: ' + path)
  })
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})
afterEach(cleanup)

async function chooseAddress() {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Location' }), { target: { value: 'Main Street' } })
  fireEvent.click(await screen.findByRole('button', { name: /Main Street 42, Novi Sad/ }))
}

describe('location selection', () => {
  function Picker() {
    const [value, setValue] = useState<LocationSelection | null>(null)
    return <LocationPicker value={value} onChange={setValue} disabled={false} />
  }

  it('debounces address search, synchronizes coordinates and resets confirmation after a marker move', async () => {
    render(<Provider><Picker /></Provider>)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Location' }), { target: { value: 'Main' } })
    fireEvent.change(screen.getByRole('searchbox', { name: 'Location' }), { target: { value: 'Main Street' } })
    expect(request).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: /Main Street 42, Novi Sad/ }))
    expect(request).toHaveBeenCalledTimes(1)
    const confirmation = screen.getByRole('checkbox') as HTMLInputElement
    expect(confirmation.checked).toBe(false)
    fireEvent.click(confirmation)
    expect(confirmation.checked).toBe(true)
    fireEvent.click(screen.getByText('Advanced coordinates'))
    fireEvent.click(screen.getByRole('button', { name: 'Move test marker' }))
    expect((screen.getByRole('spinbutton', { name: 'Latitude' }) as HTMLInputElement).value).toBe('45.26')
    expect(confirmation.checked).toBe(false)
  })

  it('shows provider errors without treating typed text as a verified selection', async () => {
    request.mockRejectedValueOnce(new Error('Location lookup has reached its rate limit.'))
    render(<Provider><Picker /></Provider>)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Location' }), { target: { value: 'Main Street' } })
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect((screen.getByRole('button', { name: 'Move test marker' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('provisioning forms', () => {
  it('requires confirmation and displays the backend result after node creation', async () => {
    const saved = vi.fn()
    render(<Provider><NodeDialog node={null} onSaved={saved} onClose={vi.fn()} /></Provider>)
    fireEvent.change(screen.getByLabelText('Node name'), { target: { value: 'Main OLT' } })
    await chooseAddress()
    fireEvent.click(screen.getByRole('button', { name: 'Save node' }))
    expect(screen.getByRole('alert').textContent).toContain('confirm')
    expect(saved).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Save node' }))
    await waitFor(() => expect(saved).toHaveBeenCalledWith(node))
    expect(request).toHaveBeenCalledWith('/network-nodes', 'token', 'POST', {
      name: 'Main OLT', nodeType: 'GPON_OLT', status: 'ACTIVE',
      location: { placeId: 'verified-place', latitude: 45.25, longitude: 19.84, positionConfirmed: true }
    })
  })

  it('pre-fills the customer, defaults to Active and requires choosing a network node', async () => {
    const saved = vi.fn()
    render(<Provider><ServiceDialog customer={customer} service={null} onSaved={saved} onClose={vi.fn()} /></Provider>)
    expect((screen.getByLabelText('Customer') as HTMLInputElement).value).toContain(customer.email)
    expect((screen.getByLabelText('Service status') as HTMLSelectElement).value).toBe('ACTIVE')
    await screen.findByRole('option', { name: /NOVISAD-OLT-001/ })
    expect((screen.getByLabelText('Network node') as HTMLSelectElement).value).toBe('')
    fireEvent.change(screen.getByLabelText('Network node'), { target: { value: '5' } })
    await chooseAddress()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Save service' }))
    await waitFor(() => expect(saved).toHaveBeenCalledWith(service))
    expect(request).toHaveBeenCalledWith('/users/2/services', 'token', 'POST', expect.objectContaining({ status: 'ACTIVE', networkNodeId: 5 }))
  })

  it('keeps the saved location for an ordinary edit and invalidates it when new address text is typed', async () => {
    render(<Provider><NodeDialog node={node} onSaved={vi.fn()} onClose={vi.fn()} /></Provider>)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Location' }), { target: { value: 'An unverified address' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save node' }))
    expect(screen.getByRole('alert').textContent).toContain('Select an address')
    expect(request.mock.calls.some(([, , method]) => method === 'PUT')).toBe(false)
  })

  it('shows account status and service status separately on Users', async () => {
    render(<Provider><UsersPage onNavigate={vi.fn()} /></Provider>)
    const row = await screen.findByRole('row', { name: /Ana Customer/ })
    await waitFor(() => expect(within(row).getByText('Active')).toBeTruthy())
    expect(within(row).getByText('Disabled')).toBeTruthy()
    fireEvent.click(within(row).getByRole('button', { name: 'View services' }))
    expect(await screen.findByRole('button', { name: 'Edit service' })).toBeTruthy()
  })

  it('customers can report active services without seeing network details', async () => {
    render(<Provider role="USER"><ServicesPage onNavigate={vi.fn()} /></Provider>)
    expect(await screen.findByRole('button', { name: 'Report a problem' })).toBeTruthy()
    expect(screen.queryByText(node.code)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit service' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Terminate' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Network' })).toBeNull()
  })
})

it('service summaries prioritize active, then pending, suspended, terminated and no service', () => {
  const pending: CustomerService = { ...service, status: 'PENDING_ACTIVATION' }
  const suspended: CustomerService = { ...service, status: 'SUSPENDED' }
  const terminated: CustomerService = { ...service, status: 'TERMINATED' }
  expect(serviceSummary([suspended, pending, service], 2)).toBe('Active')
  expect(serviceSummary([suspended, pending], 2)).toBe('Pending')
  expect(serviceSummary([terminated, suspended], 2)).toBe('Suspended')
  expect(serviceSummary([terminated], 2)).toBe('Terminated')
  expect(serviceSummary([service], 99)).toBe('No service')
})

it('nodes at the same coordinates remain in one accessible marker group', () => {
  const second = { ...node, id: 6, code: 'NOVISAD-RTR-001', nodeType: 'ROUTER' as const }
  const third = { ...node, id: 7, latitude: 44.8 }
  expect(groupNodes([node, second, third])).toEqual([[node, second], [third]])
})

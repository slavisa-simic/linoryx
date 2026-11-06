// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../src/App'
import { apiRequest } from '../src/api/apiRequest'
import { createSessionService } from '../src/services/createSessionService'
import type { AuthSession } from '../src/models/auth'
import type { UserRole } from '../src/models/users'
import type { Incident } from '../src/models/incidents'

vi.mock('../src/api/apiRequest', () => ({ apiRequest: vi.fn() }))
// Charts do not affect authorization and need a browser layout engine.
vi.mock('../src/components/dashboard/DashboardCharts', () => ({ DashboardCharts: () => null }))

const request = vi.mocked(apiRequest)
const technician = { id: 8, firstName: 'Ana', lastName: 'Technician' }
const incident: Incident = {
  id: 10,
  title: 'Connection lost',
  description: 'Network unavailable',
  severity: 'HIGH',
  category: 'FIBER_FAILURE',
  status: 'OPEN',
  createdById: 2,
  createdByEmail: 'reporter@test.com',
  assignedToId: null,
  assignedToEmail: null,
  createdAt: '2026-11-01T10:00:00',
  updatedAt: '2026-11-01T10:00:00',
  resolvedAt: null, closedAt: null, legacy: false, legacyStatus: null, reportCount: 1, closedReportCount: 0
}

function openApp(role: UserRole | null, path: string) {
  window.history.replaceState(null, '', path)
  const session: AuthSession | null = role ? {
    role,
    token: 'test-token',
    tokenType: 'Bearer',
    userId: 7,
    email: 'operator@test.com',
    expiresAt: Date.now() + 3600000
  } : null
  render(<App
    authApi={{ login: vi.fn(), register: vi.fn() }}
    sessionService={{ getSession: () => session, saveSession: vi.fn(), clearSession: vi.fn() }}
  />)
}

beforeEach(() => {
  request.mockReset()
  request.mockImplementation(async (path, _token, method, data) => {
    if (path === '/users/me') {
      return { id: 7, firstName: 'Test', lastName: 'Operator', email: 'operator@test.com' }
    }
    if (path === '/technicians') return [technician]
    if (path === '/technicians/me/assignment-locations') return []
    if (path === '/incidents/10') return incident
    if (path === '/incidents/10/assign') {
      return { ...incident, assignedToId: 8, assignedToEmail: 'tech@test.com' }
    }
    if (path === '/incidents/10/start') return { ...incident, status: 'IN_PROGRESS', assignedToId: 8 }
    if (path === '/incidents/10/resolve') return { ...incident, status: 'RESOLVED', assignedToId: 8 }
    if (path === '/incidents/10/close') return { ...incident, status: 'CLOSED', assignedToId: 8 }
    if (path === '/incidents/10/comments' && method === 'POST') {
      return { id: 1, authorFirstName: 'Test', authorLastName: 'Operator', content: (data as { content: string }).content, createdAt: incident.createdAt }
    }
    if (path.startsWith('/users?')) {
      return { content: [{ ...technician, email: 'tech@test.com', role: 'TECHNICIAN', enabled: true, createdAt: incident.createdAt }], totalPages: 1 }
    }
    if (path.includes('/comments')) return { content: [], totalPages: 1 }
    if (path.startsWith('/incidents?')) return { content: [incident], totalPages: 1 }
    if (path.startsWith('/audit?')) return { content: [], totalPages: 1 }
    if (path.startsWith('/reports')) return { content: [], totalPages: 1 }
    if (path.startsWith('/customer-services?')) return { content: [], totalPages: 1 }
    throw new Error('Unexpected API request: ' + path)
  })
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('direct navigation and operational access', () => {
  it.each(['ADMIN', 'DISPATCHER'] as const)('%s loads the dashboard using the technician endpoint', async role => {
    openApp(role, '/dashboard')
    expect(await screen.findByText('Enabled technicians')).toBeTruthy()
    expect(request).toHaveBeenCalledWith('/technicians', 'test-token')
    expect(request.mock.calls.some(([path]) => path.startsWith('/users?'))).toBe(false)
    expect(screen.getByRole('link', { name: 'Audit logs' })).toBeTruthy()
    expect(Boolean(screen.queryByRole('link', { name: 'Users' }))).toBe(role === 'ADMIN')
    if (role === 'DISPATCHER') {
      expect(screen.getByText('Dispatcher')).toBeTruthy()
      expect(document.querySelector('.account-role-icon.lucide-headset')).toBeTruthy()
    }
  })

  it.each(['ADMIN', 'DISPATCHER'] as const)('%s can open audit logs directly', async role => {
    openApp(role, '/audit')
    expect(screen.getByRole('heading', { name: 'Audit logs.' })).toBeTruthy()
    await waitFor(() => expect(request.mock.calls.some(([path]) => path.startsWith('/audit?'))).toBe(true))
    expect(window.location.pathname).toBe('/audit')
  })

  it('technician dashboard keeps the personal workload without loading the team', async () => {
    openApp('TECHNICIAN', '/dashboard')
    expect(await screen.findByText('Your workload')).toBeTruthy()
    expect(request.mock.calls.some(([path]) => path === '/technicians' || path.startsWith('/users?'))).toBe(false)
  })

  it('user dashboard remains restricted and does not load operational data', async () => {
    openApp('USER', '/dashboard')
    expect(screen.getByText('Available to administrators, dispatchers and technicians.')).toBeTruthy()
    await waitFor(() => expect(request).toHaveBeenCalledWith('/users/me', 'test-token'))
    expect(request.mock.calls.some(([path]) => path !== '/users/me')).toBe(false)
  })

  it.each(['DISPATCHER', 'TECHNICIAN', 'USER'] as const)('%s cannot open Users directly', async role => {
    openApp(role, '/users')
    await waitFor(() => expect(window.location.pathname).toBe(role === 'USER' ? '/services' : '/dashboard'))
    expect(screen.queryByRole('heading', { name: 'Users.' })).toBeNull()
    expect(request.mock.calls.some(([path]) => path.startsWith('/users?'))).toBe(false)
  })

  it.each(['TECHNICIAN', 'USER'] as const)('%s cannot open audit logs directly', async role => {
    openApp(role, '/audit')
    await waitFor(() => expect(window.location.pathname).toBe(role === 'USER' ? '/services' : '/dashboard'))
    expect(request.mock.calls.some(([path]) => path.startsWith('/audit?'))).toBe(false)
  })

  it.each(['/users', '/dashboard', '/audit', '/incidents', '/network', '/services', '/reports'])('anonymous navigation to %s goes to login', async path => {
    openApp(null, path)
    await waitFor(() => expect(window.location.pathname).toBe('/login'))
    expect(request).not.toHaveBeenCalled()
  })

  it.each(['DISPATCHER', 'USER'] as const)('%s cannot open Network directly', async role => {
    openApp(role, '/network')
    await waitFor(() => expect(window.location.pathname).toBe(role === 'USER' ? '/services' : '/dashboard'))
    expect(screen.queryByRole('link', { name: 'Network' })).toBeNull()
    expect(request.mock.calls.some(([path]) => path.startsWith('/network-nodes'))).toBe(false)
  })

  it('technicians open their assignment map without loading infrastructure or team profiles', async () => {
    openApp('TECHNICIAN', '/network')
    expect(await screen.findByText('No active assigned reports. Assigned service locations will appear here.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Network — My Assignments.' })).toBeTruthy()
    expect(request).toHaveBeenCalledWith('/technicians/me/assignment-locations', 'test-token')
    expect(request.mock.calls.some(([path]) => path.startsWith('/network-nodes') || path.startsWith('/customer-services') || path === '/technicians/overview')).toBe(false)
    expect(screen.queryByRole('button', { name: 'Add node' })).toBeNull()
    expect(screen.getByRole('link', { name: 'My Profile' })).toBeTruthy()
  })

  it('checks permissions on browser back/forward navigation', async () => {
    openApp('DISPATCHER', '/dashboard')
    await screen.findByText('Enabled technicians')
    window.history.pushState(null, '', '/users')
    fireEvent.popState(window)
    await waitFor(() => expect(window.location.pathname).toBe('/dashboard'))
    window.history.pushState(null, '', '/audit')
    fireEvent.popState(window)
    expect(await screen.findByRole('heading', { name: 'Audit logs.' })).toBeTruthy()
    expect(request.mock.calls.some(([path]) => path.startsWith('/users?'))).toBe(false)
  })

  it('administrator role selectors include Dispatcher', async () => {
    openApp('ADMIN', '/users')
    const selector = await screen.findByRole('combobox', { name: 'Role for Ana Technician' })
    expect(within(selector).getByRole('option', { name: 'Dispatcher' })).toBeTruthy()
    expect(screen.getByRole('option', { name: 'Dispatchers' })).toBeTruthy()
  })

  it('dispatcher starts an incident and sees report-based closure rules and internal comments', async () => {
    openApp('DISPATCHER', '/incidents?incident=10')
    const start = await screen.findByRole('button', { name: 'Start incident' })
    await waitFor(() => expect((start as HTMLButtonElement).disabled).toBe(false))
    expect(screen.getByRole('button', { name: 'Create from reports' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mark as resolved' })).toBeNull()
    fireEvent.click(start)
    const close = await screen.findByRole('button', { name: 'Close incident' })
    expect((close as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox', { name: 'Add a comment' }), { target: { value: 'Checked the network' } })
    fireEvent.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(await screen.findByText('Checked the network')).toBeTruthy()
    expect(request.mock.calls.some(([path]) => path.endsWith('/assign') || path.endsWith('/resolve'))).toBe(false)
  })})

it.each(['ADMIN', 'DISPATCHER', 'TECHNICIAN', 'USER'] as const)('accepts and restores a %s session', role => {
  const claims = { role, sub: 'user@test.com', userId: 7, exp: Math.floor(Date.now() / 1000) + 3600 }
  const response = { token: 'header.' + btoa(JSON.stringify(claims)) + '.signature', tokenType: 'Bearer' }
  const service = createSessionService(localStorage)
  expect(service.saveSession(response, 'user@test.com').role).toBe(role)
  expect(service.getSession()?.role).toBe(role)
})

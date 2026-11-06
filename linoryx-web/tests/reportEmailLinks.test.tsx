// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import App from '../src/App'
import { apiRequest } from '../src/api/apiRequest'
import type { AuthSession } from '../src/models/auth'
import type { CustomerReport } from '../src/models/reports'

vi.mock('../src/api/apiRequest', () => ({ apiRequest: vi.fn() }))
const request = vi.mocked(apiRequest)
const session: AuthSession = {
  userId: 7, email: 'customer@test.invalid', role: 'USER', token: 'test-token',
  tokenType: 'Bearer', expiresAt: Date.now() + 3600000
}
const report: CustomerReport = {
  id: 42, customerServiceId: 5, serviceType: 'FIBER', serviceAddress: 'Test Street',
  category: 'NO_INTERNET', description: 'Connection stopped', status: 'RESOLVED', userConfirmed: false,
  customerReportedUnfixed: false, createdAt: '2026-11-01T10:00:00', updatedAt: '2026-11-01T12:00:00',
  incidentId: 10, incidentTitle: 'Outage', incidentStatus: 'IN_PROGRESS'
}

beforeEach(() => {
  request.mockReset()
  request.mockImplementation(async path => {
    if (path === '/users/me') return { id: 7, firstName: 'Test', lastName: 'Customer', email: session.email, role: 'USER' }
    if (path.startsWith('/reports/my?')) return { content: [report], totalPages: 1 }
    if (path.startsWith('/customer-services?')) return { content: [], totalPages: 1 }
    throw new Error('Unexpected API request: ' + path)
  })
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
})

afterEach(cleanup)

function openLink(path: string, signedIn: boolean) {
  window.history.replaceState(null, '', path)
  const login = vi.fn().mockResolvedValue({ token: 'test-token', tokenType: 'Bearer' })
  render(<App authApi={{ login, register: vi.fn() }} sessionService={{
    getSession: () => signedIn ? session : null, saveSession: () => session, clearSession: vi.fn()
  }} />)
  return login
}

async function signIn() {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: session.email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

it('opens the emailed report detail for an authenticated customer', async () => {
  openLink('/reports?report=42', true)
  const detail = await screen.findByRole('dialog', { name: 'REP-42' })
  expect(within(detail).getByRole('button', { name: 'Problem Fixed' })).toBeTruthy()
  expect(window.location.search).toBe('?report=42')
  expect(request.mock.calls.some(([, , method]) => method === 'PATCH')).toBe(false)
})

it.each(['/reports?report=42', '/login?report=42'])('returns to the report after signing in from %s', async path => {
  openLink(path, false)
  await waitFor(() => expect(window.location.pathname + window.location.search).toBe('/login?report=42'))
  expect(request).not.toHaveBeenCalled()
  await signIn()
  const detail = await screen.findByRole('dialog', { name: 'REP-42' })
  expect(within(detail).getByRole('button', { name: 'Still Not Working' })).toBeTruthy()
  expect(window.location.pathname + window.location.search).toBe('/reports?report=42')
  expect(request.mock.calls.some(([, , method]) => method === 'PATCH')).toBe(false)
})

it('ignores an invalid report reference when signing in', async () => {
  openLink('/login?report=https://external.example', false)
  await signIn()
  await waitFor(() => expect(window.location.pathname).toBe('/services'))
  expect(window.location.search).toBe('')
})

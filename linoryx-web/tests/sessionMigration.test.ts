// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSessionService } from '../src/services/createSessionService'

function savedSession(email = 'operator@test.invalid', expires = Date.now() + 3600000) {
  const claims = { role: 'DISPATCHER', sub: email, userId: 7, exp: Math.floor(expires / 1000) }
  return { email, token: 'header.' + btoa(JSON.stringify(claims)) + '.signature', tokenType: 'Bearer' }
}

beforeEach(() => sessionStorage.clear())

describe('session continuity during rebranding', () => {
  it('moves a valid legacy session without changing its token or role', () => {
    const old = savedSession()
    sessionStorage.setItem('vigil.session', JSON.stringify(old))
    const service = createSessionService(sessionStorage)
    expect(service.getSession()).toMatchObject({ ...old, role: 'DISPATCHER' })
    expect(sessionStorage.getItem('vigil.session')).toBeNull()
    expect(JSON.parse(sessionStorage.getItem('linoryx.session')!).token).toBe(old.token)
  })

  it('prefers the current session when both keys exist', () => {
    sessionStorage.setItem('vigil.session', JSON.stringify(savedSession('old@test.invalid')))
    sessionStorage.setItem('linoryx.session', JSON.stringify(savedSession('new@test.invalid')))
    expect(createSessionService(sessionStorage).getSession()?.email).toBe('new@test.invalid')
  })

  it('removes an expired legacy session instead of restoring it', () => {
    sessionStorage.setItem('vigil.session', JSON.stringify(savedSession('expired@test.invalid', Date.now() - 10000)))
    expect(createSessionService(sessionStorage).getSession()).toBeNull()
    expect(sessionStorage.getItem('vigil.session')).toBeNull()
    expect(sessionStorage.getItem('linoryx.session')).toBeNull()
  })

  it('clears both session keys on logout', () => {
    sessionStorage.setItem('vigil.session', JSON.stringify(savedSession()))
    sessionStorage.setItem('linoryx.session', JSON.stringify(savedSession()))
    createSessionService(sessionStorage).clearSession()
    expect(sessionStorage.length).toBe(0)
  })

  it('keeps a valid legacy session usable when migration cannot write to storage', () => {
    const old = JSON.stringify(savedSession())
    const storage = {
      getItem: vi.fn((key: string) => key === 'vigil.session' ? old : null),
      setItem: vi.fn(() => { throw new Error('Storage quota exceeded') }),
      removeItem: vi.fn()
    } as unknown as Storage
    expect(createSessionService(storage).getSession()?.role).toBe('DISPATCHER')
    expect(storage.removeItem).not.toHaveBeenCalled()
  })
})

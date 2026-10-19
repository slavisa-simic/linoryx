import type { AuthResponse, AuthSession } from '../models/auth'
import type { SessionService } from './SessionService'

const storageKey = 'vigil.session'

function readSession(response: AuthResponse, email: string): AuthSession | null {
  try {
    const parts = response.token.split('.')
    if (parts.length !== 3 || response.tokenType !== 'Bearer') {
      return null
    }

    // JWT sadrzi Base64 tekst. Pretvaramo ga u JSON da procitamo ulogu i istek.
    const base64 = parts[1].replaceAll('-', '+').replaceAll('_', '/')
    const decoded = atob(base64)
    const bytes: number[] = []
    for (let index = 0; index < decoded.length; index = index + 1) {
      bytes.push(decoded.charCodeAt(index))
    }
    const json = new TextDecoder().decode(new Uint8Array(bytes))
    const claims = JSON.parse(json)

    if (
      typeof claims.exp !== 'number' ||
      !Number.isFinite(claims.exp) ||
      claims.exp * 1000 <= Date.now()
    ) {
      return null
    }
    if (claims.sub !== email || !Number.isSafeInteger(claims.userId) || claims.userId <= 0) {
      return null
    }
    if (claims.role !== 'ADMIN' && claims.role !== 'TECHNICIAN' && claims.role !== 'USER') {
      return null
    }

    // Backend proverava potpis. Frontend koristi podatke za prikaz i lokalnu sesiju.
    return {
      token: response.token,
      tokenType: response.tokenType,
      email: email,
      expiresAt: claims.exp * 1000,
      userId: claims.userId,
      role: claims.role
    }
  } catch {
    return null
  }
}

export function createSessionService(storage: Storage): SessionService {
  function getSession(): AuthSession | null {
    try {
      const saved = storage.getItem(storageKey)
      if (!saved) {
        return null
      }

      const savedSession: AuthSession = JSON.parse(saved)
      const session = readSession(savedSession, savedSession.email)
      if (session) {
        return session
      }

      storage.removeItem(storageKey)
      return null
    } catch {
      return null
    }
  }

  function saveSession(response: AuthResponse, email: string): AuthSession {
    const session = readSession(response, email)
    if (!session) {
      throw new Error('Your session is invalid. Please sign in again.')
    }

    try {
      storage.setItem(storageKey, JSON.stringify(session))
    } catch {
      throw new Error('Session storage is unavailable. Check your browser settings.')
    }

    return session
  }

  function clearSession() {
    storage.removeItem(storageKey)
  }

  return {
    getSession: getSession,
    saveSession: saveSession,
    clearSession: clearSession
  }
}

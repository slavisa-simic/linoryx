import type { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth'

export interface AuthApi {
  login(request: LoginRequest): Promise<AuthResponse>
  register(request: RegisterRequest): Promise<void>
}

export function createAuthApi(baseUrl: string, timeoutMs = 15000): AuthApi {
  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1)
  }

  async function sendRequest(path: string, data: LoginRequest | RegisterRequest) {
    let response: Response

    try {
      response = await fetch(baseUrl + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(timeoutMs)
      })
    } catch {
      throw new Error('The server is unavailable. Please try again.')
    }

    if (response.status === 401) {
      throw new Error('Incorrect email or password.')
    }
    if (response.status === 409) {
      throw new Error('An account with this email already exists.')
    }
    if (response.status === 400) {
      throw new Error('Check your details and try again.')
    }
    if (!response.ok) {
      throw new Error('Something went wrong. Please try again.')
    }

    return response
  }

  async function login(request: LoginRequest): Promise<AuthResponse> {
    const response = await sendRequest('/auth/login', request)
    let data: AuthResponse

    try {
      data = await response.json()
    } catch {
      throw new Error('The server returned an invalid response. Please try again.')
    }

    if (
      !data ||
      typeof data.token !== 'string' ||
      data.token === '' ||
      data.tokenType !== 'Bearer'
    ) {
      throw new Error('The server returned an invalid response. Please try again.')
    }

    return data
  }

  async function register(request: RegisterRequest): Promise<void> {
    // Registracija vraca prazan odgovor, pa ovde ne citamo JSON.
    await sendRequest('/auth/register', request)
  }

  return {
    login: login,
    register: register
  }
}

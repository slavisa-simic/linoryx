let baseUrl = import.meta.env.VITE_API_BASE_URL
const timeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS)

if (baseUrl.endsWith('/')) {
  baseUrl = baseUrl.slice(0, -1)
}

export async function apiRequest(
  path: string,
  token: string,
  method = 'GET',
  data?: object
) {
  let response: Response
  let body: string | undefined
  if (data) {
    body = JSON.stringify(data)
  }

  try {
    response = await fetch(baseUrl + path, {
      method: method,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: body,
      signal: AbortSignal.timeout(timeoutMs)
    })
  } catch {
    throw new Error('The server is unavailable. Please try again.')
  }

  if (response.status === 401) {
    throw new Error('SESSION_EXPIRED')
  }
  if (response.status === 403) {
    throw new Error('You do not have permission to perform this action.')
  }
  if (!response.ok) {
    let message = 'The request could not be completed. Please try again.'
    try {
      const error = await response.json()
      if (typeof error.message === 'string') {
        message = error.message
      }
    } catch {
      // Zadrzimo opstu poruku ako odgovor nije JSON.
    }
    throw new Error(message)
  }

  return response.json()
}

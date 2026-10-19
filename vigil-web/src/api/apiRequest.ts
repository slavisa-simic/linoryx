let baseUrl = import.meta.env.VITE_API_BASE_URL
const timeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS)

if (baseUrl.endsWith('/')) {
  baseUrl = baseUrl.slice(0, -1)
}

export async function apiRequest(path: string, token: string) {
  let response: Response

  try {
    response = await fetch(baseUrl + path, {
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(timeoutMs)
    })
  } catch {
    throw new Error('The server is unavailable. Please try again.')
  }

  if (response.status === 401) {
    throw new Error('SESSION_EXPIRED')
  }
  if (response.status === 403) {
    throw new Error('You do not have access to this overview.')
  }
  if (!response.ok) {
    throw new Error('The overview could not be loaded. Please try again.')
  }

  return response.json()
}

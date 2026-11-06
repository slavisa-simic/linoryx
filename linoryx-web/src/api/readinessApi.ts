export async function checkBackendReadiness(baseUrl: string, signal: AbortSignal): Promise<boolean> {
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1)

  const response = await fetch(baseUrl + '/auth/readiness', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    signal
  })

  if (!response.ok) return false
  const body = await response.json()
  return body !== null && body.status === 'READY'
}

import { afterEach, expect, it, vi } from 'vitest'
import { apiRequest } from '../src/api/apiRequest'

afterEach(() => vi.unstubAllGlobals())

it('accepts the empty 204 response after deleting a node', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetch)
  await expect(apiRequest('/network-nodes/5', 'token', 'DELETE')).resolves.toBeUndefined()
})

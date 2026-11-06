// @vitest-environment jsdom
import { StrictMode } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StartupGate } from '../src/components/startup/StartupGate'
import { checkBackendReadiness } from '../src/api/readinessApi'

const artwork = vi.hoisted(() => ({ active: 0, mounts: 0, fail: false }))
vi.mock('../src/components/startup/GhostFibers', async () => {
  const { useEffect } = await import('react')
  function FakeGhostFibers({ onUnavailable }: { onUnavailable(): void }) {
    useEffect(() => {
      if (artwork.fail) { onUnavailable(); return }
      artwork.active++
      artwork.mounts++
      return () => { artwork.active-- }
    }, [onUnavailable])
    return <canvas aria-label="Fiber artwork" />
  }
  return { default: FakeGhostFibers }
})

const response = (status = 'READY', code = 200) =>
  new Response(JSON.stringify({ status }), { status: code })
let fetchMock: ReturnType<typeof vi.fn>
const advance = (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

function openGate(strict = false) {
  const gate = <StartupGate baseUrl="/api/"><p>Existing application</p></StartupGate>
  return render(strict ? <StrictMode>{gate}</StrictMode> : gate)
}

beforeEach(() => {
  vi.useFakeTimers()
  artwork.active = 0
  artwork.mounts = 0
  artwork.fail = false
  fetchMock = vi.fn().mockResolvedValue(response('UNAVAILABLE', 503))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('backend startup gate', () => {
  it('opens immediately for an online backend without mounting the screen or artwork', async () => {
    fetchMock.mockResolvedValue(response())
    openGate()
    await advance()
    expect(screen.getByText('Existing application')).toBeTruthy()
    expect(screen.queryByRole('main')).toBeNull()
    expect(artwork.mounts).toBe(0)
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/readiness', expect.objectContaining({
      cache: 'no-store', credentials: 'omit', redirect: 'error'
    }))
    await advance(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('waits 400ms before displaying startup and automatically reveals the app on recovery', async () => {
    fetchMock.mockResolvedValueOnce(response('UNAVAILABLE', 503)).mockResolvedValue(response())
    openGate()
    await advance(399)
    expect(screen.queryByRole('main')).toBeNull()
    expect(screen.queryByText('Existing application')).toBeNull()
    await advance(1)
    expect(screen.getByText('Setting up your workspace...')).toBeTruthy()
    await advance(2_600)
    expect(screen.getByText('Existing application')).toBeTruthy()
    expect(document.querySelector('.startup-screen--leaving')).toBeTruthy()
    await advance(220)
    expect(document.querySelector('.startup-screen')).toBeNull()
    expect(artwork.active).toBe(0)
    await advance(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('keeps retrying automatically after 45s without showing a retry button', async () => {
    openGate()
    await advance(45_000)
    expect(screen.getByText('Linoryx services are unavailable. We’ll keep trying.')).toBeTruthy()
    expect(screen.queryByText('Existing application')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    const previous = fetchMock.mock.calls.length
    fetchMock.mockResolvedValue(response())
    await advance(3_000)
    expect(fetchMock).toHaveBeenCalledTimes(previous + 1)
    expect(screen.getByText('Existing application')).toBeTruthy()
    await advance(220)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('times out slow requests, never overlaps polls, and aborts on unmount', async () => {
    const signals: AbortSignal[] = []
    fetchMock.mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      signals.push(init.signal as AbortSignal)
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const view = openGate(true)
    await advance(3_999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(signals[0].aborted).toBe(true)
    await advance(2_999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    view.unmount()
    expect(signals[1].aborted).toBe(true)
    await advance(60_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
    expect(artwork.active).toBe(0)
  })

  it('keeps retrying after network failures and rejects a 200 HTML hosting fallback', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Offline'))
      .mockResolvedValueOnce(new Response('<html>Hosting page</html>'))
      .mockResolvedValue(response())
    openGate()
    await advance(3_000)
    expect(screen.queryByText('Existing application')).toBeNull()
    await advance(3_000)
    expect(screen.getByText('Existing application')).toBeTruthy()
  })

  it('keeps the static logo usable if GPU artwork initialization fails', async () => {
    artwork.fail = true
    openGate()
    await advance(400)
    expect(screen.getByRole('img', { name: 'Linoryx' })).toBeTruthy()
    expect(screen.queryByLabelText('Fiber artwork')).toBeNull()
    fetchMock.mockResolvedValue(response())
    await advance(2_600)
    expect(screen.getByText('Existing application')).toBeTruthy()
  })

  it('keeps the artwork enabled even when reduced motion is preferred', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    openGate()
    await advance(400)
    expect(screen.getByRole('img', { name: 'Linoryx' })).toBeTruthy()
    expect(artwork.active).toBe(1)
    fetchMock.mockResolvedValue(response())
    await advance(2_600)
    expect(screen.getByText('Existing application')).toBeTruthy()
    await advance(220)
    expect(document.querySelector('.startup-screen')).toBeNull()
    expect(artwork.active).toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('readiness response validation', () => {
  it.each([
    [{ status: 'READY' }, 200, true],
    [{ status: 'UNAVAILABLE' }, 200, false],
    [{ status: 'READY' }, 503, false],
    [{ healthy: true }, 200, false],
    [null, 200, false],
    ['READY', 200, false]
  ])('validates the response body %j and HTTP status %i', async (body, status, expected) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status: Number(status) }))
    await expect(checkBackendReadiness('https://api.example.test/api/', new AbortController().signal))
      .resolves.toBe(expected)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.test/api/auth/readiness')
  })
})

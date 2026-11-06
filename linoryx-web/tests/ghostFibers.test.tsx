// @vitest-environment jsdom
import { StrictMode } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import GhostFibers from '../src/components/startup/GhostFibers'

let gl: WebGL2RenderingContext
let contextSpy: ReturnType<typeof vi.spyOn>
let frames: Map<number, FrameRequestCallback>
let resizeDisconnect: ReturnType<typeof vi.fn>
let intersectionDisconnect: ReturnType<typeof vi.fn>

beforeEach(() => {
  frames = new Map()
  let frameId = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  resizeDisconnect = vi.fn()
  intersectionDisconnect = vi.fn()
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect = resizeDisconnect })
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect = intersectionDisconnect })

  const methods: Record<string, unknown> = {
    createShader: vi.fn(() => ({})), createProgram: vi.fn(() => ({})),
    createTexture: vi.fn(() => ({})), createFramebuffer: vi.fn(() => ({})),
    createVertexArray: vi.fn(() => ({})),
    getShaderParameter: vi.fn(() => true), getProgramParameter: vi.fn(() => true),
    getExtension: vi.fn(() => null), getUniformLocation: vi.fn(() => ({})),
    checkFramebufferStatus: vi.fn(() => 1), FRAMEBUFFER_COMPLETE: 1
  }
  // The fake GPU tracks resource ownership; it does not try to emulate shaders.
  gl = new Proxy(methods, { get(target, name: string) {
    return target[name] ??= /^[A-Z_0-9]+$/.test(name) ? 2 : vi.fn()
  } }) as unknown as WebGL2RenderingContext
  contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type: string) =>
    type === 'webgl2' ? gl : {
      clearRect() {}, fillRect() {}, getImageData: () => ({ data: [208, 84, 69, 255] })
    } as never)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function expectReleased() {
  for (const [create, remove] of [
    [gl.createShader, gl.deleteShader], [gl.createProgram, gl.deleteProgram],
    [gl.createTexture, gl.deleteTexture], [gl.createFramebuffer, gl.deleteFramebuffer],
    [gl.createVertexArray, gl.deleteVertexArray]
  ]) {
    expect(vi.mocked(remove).mock.calls.length).toBe(vi.mocked(create).mock.calls.length)
  }
  expect(frames.size).toBe(0)
}

it('owns just one animation loop in StrictMode and releases GPU resources and observers', () => {
  const view = render(<StrictMode><GhostFibers lightMode intro={false} /></StrictMode>)
  expect(gl.drawArraysInstanced).toHaveBeenCalled()
  expect(frames.size).toBe(1)
  view.unmount()
  expectReleased()
  expect(resizeDisconnect).toHaveBeenCalledTimes(2)
  expect(intersectionDisconnect).toHaveBeenCalledTimes(2)
})

it('continues animating when the browser prefers reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  const view = render(<GhostFibers lightMode />)
  const firstFrame = frames.values().next().value as FrameRequestCallback
  frames.clear()
  firstFrame(16)
  expect(frames.size).toBe(1)
  view.unmount()
  expectReleased()
})

it('falls back when WebGL is unavailable or getContext throws', () => {
  const unavailable = vi.fn()
  contextSpy.mockReturnValue(null)
  const view = render(<GhostFibers onUnavailable={unavailable} />)
  expect(unavailable).toHaveBeenCalledTimes(1)
  view.unmount()
  contextSpy.mockImplementation(() => { throw new Error('GPU blocked') })
  render(<GhostFibers onUnavailable={unavailable} />)
  expect(unavailable).toHaveBeenCalledTimes(2)
  expect(frames.size).toBe(0)
})

it('cleans up partial shader initialization when compilation fails', () => {
  vi.mocked(gl.getShaderParameter).mockReturnValue(false)
  const unavailable = vi.fn()
  render(<GhostFibers onUnavailable={unavailable} />)
  expect(unavailable).toHaveBeenCalledTimes(1)
  expectReleased()
})

it('cleans up a failed framebuffer without blocking the rest of React', () => {
  vi.mocked(gl.checkFramebufferStatus).mockReturnValue(0)
  const unavailable = vi.fn()
  render(<><GhostFibers onUnavailable={unavailable} /><p>Still usable</p></>)
  expect(unavailable).toHaveBeenCalledTimes(1)
  expect(document.body.textContent).toContain('Still usable')
  expectReleased()
})

it('stops the loop and releases resources on WebGL context loss', () => {
  const unavailable = vi.fn()
  const view = render(<GhostFibers onUnavailable={unavailable} />)
  view.container.querySelector('canvas')?.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
  expect(unavailable).toHaveBeenCalledTimes(1)
  expectReleased()
  view.unmount()
  expectReleased()
})

it('releases the texture if GPU storage allocation throws', () => {
  vi.mocked(gl.texStorage2D).mockImplementation(() => { throw new Error('GPU allocation failed') })
  const unavailable = vi.fn()
  render(<GhostFibers onUnavailable={unavailable} />)
  expect(unavailable).toHaveBeenCalledTimes(1)
  expectReleased()
})

it('does not allocate textures when no framebuffer can be created', () => {
  vi.mocked(gl.createFramebuffer).mockReturnValue(null)
  const unavailable = vi.fn()
  render(<GhostFibers onUnavailable={unavailable} />)
  expect(unavailable).toHaveBeenCalledTimes(1)
  expect(gl.createTexture).not.toHaveBeenCalled()
  expect(frames.size).toBe(0)
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GameLoop } from './index.js'

let rafCallbacks: Array<(t: number) => void> = []
let rafId = 0
let now = 0

beforeEach(() => {
  rafCallbacks = []
  rafId = 0
  now = 0
  vi.stubGlobal('performance', { now: () => now })
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
    rafCallbacks.push(cb)
    return ++rafId
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    rafCallbacks = []
  })
})

afterEach(() => vi.unstubAllGlobals())

function flush(timestamp: number) {
  now = timestamp
  const cbs = rafCallbacks
  rafCallbacks = []
  cbs.forEach(cb => cb(timestamp))
}

describe('GameLoop', () => {
  it('invokes callback with correct dt on each frame', () => {
    const cb = vi.fn()
    const loop = new GameLoop(cb)
    loop.start()
    flush(16)
    flush(32)
    // start() triggers an immediate synchronous tick at t=0, then RAF queues subsequent ticks
    const dts = cb.mock.calls.map(c => c[0])
    expect(dts).toEqual([0, 16, 16])
  })

  it('caps dt at 100ms to avoid spiral-of-death after tab resume', () => {
    const cb = vi.fn()
    const loop = new GameLoop(cb)
    loop.start()
    flush(5000)
    expect(cb).toHaveBeenLastCalledWith(100)
  })

  it('stop() halts further callbacks', () => {
    const cb = vi.fn()
    const loop = new GameLoop(cb)
    loop.start()
    flush(16)
    const beforeStop = cb.mock.calls.length
    loop.stop()
    flush(32)
    expect(cb.mock.calls.length).toBe(beforeStop)
  })

  it('start() is idempotent — second call has no effect while running', () => {
    const cb = vi.fn()
    const loop = new GameLoop(cb)
    loop.start()
    const after1 = cb.mock.calls.length
    loop.start()
    expect(cb.mock.calls.length).toBe(after1)
  })
})

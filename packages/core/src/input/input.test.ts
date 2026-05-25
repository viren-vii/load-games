import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InputManager } from './index.js'

function makeCanvas() {
  const listeners = new Map<string, EventListener[]>()
  const canvas = {
    addEventListener(type: string, fn: EventListener) {
      const arr = listeners.get(type) ?? []
      arr.push(fn)
      listeners.set(type, arr)
    },
    removeEventListener(type: string, fn: EventListener) {
      listeners.set(
        type,
        (listeners.get(type) ?? []).filter(l => l !== fn),
      )
    },
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    dispatch(type: string, ev: any) {
      ;(listeners.get(type) ?? []).forEach(fn => {
        fn(ev)
      })
    },
  } as unknown as HTMLCanvasElement & { dispatch(t: string, e: any): void }
  return canvas
}

describe('InputManager — keyboard', () => {
  let canvas: ReturnType<typeof makeCanvas>
  beforeEach(() => {
    canvas = makeCanvas()
  })

  it('maps arrow keys and WASD to direction events', () => {
    const im = new InputManager(canvas)
    const up = vi.fn(),
      down = vi.fn(),
      left = vi.fn(),
      right = vi.fn()
    im.on('arrowUp', up)
    im.on('arrowDown', down)
    im.on('arrowLeft', left)
    im.on('arrowRight', right)
    canvas.dispatch('keydown', { key: 'ArrowUp', preventDefault: () => {} })
    canvas.dispatch('keydown', { key: 's', preventDefault: () => {} })
    canvas.dispatch('keydown', { key: 'a', preventDefault: () => {} })
    canvas.dispatch('keydown', { key: 'ArrowRight', preventDefault: () => {} })
    expect(up).toHaveBeenCalledOnce()
    expect(down).toHaveBeenCalledOnce()
    expect(left).toHaveBeenCalledOnce()
    expect(right).toHaveBeenCalledOnce()
  })

  it('Space and Enter both map to tap', () => {
    const im = new InputManager(canvas)
    const tap = vi.fn()
    im.on('tap', tap)
    canvas.dispatch('keydown', { key: ' ', preventDefault: () => {} })
    canvas.dispatch('keyup', { key: ' ' })
    canvas.dispatch('keydown', { key: 'Enter', preventDefault: () => {} })
    expect(tap).toHaveBeenCalledTimes(2)
  })

  it('isDown tracks held state across keydown/keyup', () => {
    const im = new InputManager(canvas)
    canvas.dispatch('keydown', { key: 'ArrowUp', preventDefault: () => {} })
    expect(im.isDown('arrowUp')).toBe(true)
    canvas.dispatch('keyup', { key: 'ArrowUp' })
    expect(im.isDown('arrowUp')).toBe(false)
  })

  it('keydown only emits once while held (no repeat fire)', () => {
    const im = new InputManager(canvas)
    const tap = vi.fn()
    im.on('tap', tap)
    canvas.dispatch('keydown', { key: ' ', preventDefault: () => {} })
    canvas.dispatch('keydown', { key: ' ', preventDefault: () => {} })
    expect(tap).toHaveBeenCalledOnce()
  })

  it('preventDefault only when shouldPreventScroll is true', () => {
    const im = new InputManager(canvas)
    const pd = vi.fn()
    canvas.dispatch('keydown', { key: 'ArrowUp', preventDefault: pd })
    expect(pd).not.toHaveBeenCalled()
    im.shouldPreventScroll = true
    canvas.dispatch('keyup', { key: 'ArrowUp' })
    canvas.dispatch('keydown', { key: 'ArrowUp', preventDefault: pd })
    expect(pd).toHaveBeenCalledOnce()
  })
})

describe('InputManager — pointer (mouse / touch / pen unified)', () => {
  let canvas: ReturnType<typeof makeCanvas>
  beforeEach(() => {
    canvas = makeCanvas()
  })

  it('short pointer movement emits tap (single fire, no double-tap)', () => {
    const im = new InputManager(canvas)
    const tap = vi.fn()
    im.on('tap', tap)
    canvas.dispatch('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 })
    canvas.dispatch('pointerup', { pointerId: 1, clientX: 105, clientY: 102 })
    expect(tap).toHaveBeenCalledOnce()
  })

  it('horizontal swipe emits arrowLeft / arrowRight', () => {
    const im = new InputManager(canvas)
    const left = vi.fn(),
      right = vi.fn()
    im.on('arrowLeft', left)
    im.on('arrowRight', right)
    canvas.dispatch('pointerdown', { pointerId: 1, clientX: 100, clientY: 50 })
    canvas.dispatch('pointerup', { pointerId: 1, clientX: 30, clientY: 55 })
    expect(left).toHaveBeenCalledOnce()
    expect(right).not.toHaveBeenCalled()
  })

  it('vertical swipe emits arrowUp / arrowDown', () => {
    const im = new InputManager(canvas)
    const up = vi.fn(),
      down = vi.fn()
    im.on('arrowUp', up)
    im.on('arrowDown', down)
    canvas.dispatch('pointerdown', { pointerId: 1, clientX: 50, clientY: 100 })
    canvas.dispatch('pointerup', { pointerId: 1, clientX: 55, clientY: 200 })
    expect(down).toHaveBeenCalledOnce()
    expect(up).not.toHaveBeenCalled()
  })

  it('pointerup from a different pointerId is ignored (multi-touch safety)', () => {
    const im = new InputManager(canvas)
    const tap = vi.fn()
    im.on('tap', tap)
    canvas.dispatch('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 })
    canvas.dispatch('pointerup', { pointerId: 2, clientX: 100, clientY: 100 })
    expect(tap).not.toHaveBeenCalled()
  })

  it('captures pointer on pointerdown so dragging off-canvas still completes', () => {
    new InputManager(canvas)
    canvas.dispatch('pointerdown', { pointerId: 7, clientX: 100, clientY: 100 })
    expect((canvas as any).setPointerCapture).toHaveBeenCalledWith(7)
  })

  it('pointercancel cleans up tracking without emitting', () => {
    const im = new InputManager(canvas)
    const tap = vi.fn(),
      left = vi.fn()
    im.on('tap', tap)
    im.on('arrowLeft', left)
    canvas.dispatch('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 })
    canvas.dispatch('pointercancel', { pointerId: 1, clientX: 30, clientY: 100 })
    canvas.dispatch('pointerup', { pointerId: 1, clientX: 30, clientY: 100 })
    expect(tap).not.toHaveBeenCalled()
    expect(left).not.toHaveBeenCalled()
  })
})

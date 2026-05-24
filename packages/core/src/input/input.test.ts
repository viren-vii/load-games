import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InputManager } from './index.js'

function makeCanvas() {
  const listeners = new Map<string, EventListener[]>()
  const canvas = {
    addEventListener(type: string, fn: EventListener) {
      const arr = listeners.get(type) ?? []
      arr.push(fn); listeners.set(type, arr)
    },
    removeEventListener(type: string, fn: EventListener) {
      listeners.set(type, (listeners.get(type) ?? []).filter(l => l !== fn))
    },
    dispatch(type: string, ev: any) {
      ;(listeners.get(type) ?? []).forEach(fn => fn(ev))
    },
  } as unknown as HTMLCanvasElement & { dispatch(t: string, e: any): void }
  return canvas
}

describe('InputManager', () => {
  let canvas: ReturnType<typeof makeCanvas>
  beforeEach(() => { canvas = makeCanvas() })

  it('maps arrow keys and WASD to direction events', () => {
    const im = new InputManager(canvas)
    const up = vi.fn(), down = vi.fn(), left = vi.fn(), right = vi.fn()
    im.on('arrowUp', up); im.on('arrowDown', down); im.on('arrowLeft', left); im.on('arrowRight', right)
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

  it('horizontal swipe emits left/right based on direction', () => {
    const im = new InputManager(canvas)
    const left = vi.fn(), right = vi.fn()
    im.on('arrowLeft', left); im.on('arrowRight', right)
    canvas.dispatch('touchstart', { touches: [{ clientX: 100, clientY: 50 }] })
    canvas.dispatch('touchend', { changedTouches: [{ clientX: 30, clientY: 55 }] })
    expect(left).toHaveBeenCalledOnce()
    expect(right).not.toHaveBeenCalled()
  })

  it('short touch emits tap', () => {
    const im = new InputManager(canvas)
    const tap = vi.fn()
    im.on('tap', tap)
    canvas.dispatch('touchstart', { touches: [{ clientX: 100, clientY: 100 }] })
    canvas.dispatch('touchend', { changedTouches: [{ clientX: 105, clientY: 102 }] })
    expect(tap).toHaveBeenCalledOnce()
  })
})

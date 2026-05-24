import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BaseEngine } from './index.js'
import type { GameConfig } from '../types/index.js'

function makeCtx() {
  const ctx: any = {}
  for (const m of ['fillRect','strokeRect','clearRect','beginPath','closePath','moveTo','lineTo','stroke','fill','arc','ellipse','roundRect','scale','setLineDash']) ctx[m] = vi.fn()
  ctx.fillText = vi.fn()
  ctx.measureText = vi.fn(() => ({ width: 40 }))
  return ctx
}

function makeCanvas() {
  const ctx = makeCtx()
  return {
    width: 300, height: 300,
    style: {},
    getContext: vi.fn(() => ctx),
    getBoundingClientRect: vi.fn(() => ({ width: 300, height: 300, left: 0, top: 0 })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLCanvasElement
}

class TestEngine extends BaseEngine {
  protected readonly gameName = 'Test'
  protected readonly controlHints = []
  public score = 0
  getScore() { return this.score }
  protected update() {}
  protected render() {}
  // expose protected helpers for tests
  public _beginGame() { this.beginGame() }
  public _setGameover() { this.setState('gameover') }
  public _tryRestart(fn: () => void) { this.tryGameOverRestart(fn) }
}

let canvas: HTMLCanvasElement
let cfg: GameConfig
let onReady: ReturnType<typeof vi.fn>
let onDismiss: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.stubGlobal('document', { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  vi.stubGlobal('window', { devicePixelRatio: 1 })
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}; disconnect() {}
  })
  canvas = makeCanvas()
  onReady = vi.fn()
  onDismiss = vi.fn()
  cfg = { onReady, onDismiss }
})

afterEach(() => vi.unstubAllGlobals())

describe('BaseEngine ready/dismiss', () => {
  it('starts not-ready', () => {
    const e = new TestEngine(canvas, cfg)
    expect(e.ready).toBe(false)
  })

  it('signalReady fires onReady once and sets ready=true', () => {
    const e = new TestEngine(canvas, cfg)
    e.signalReady()
    e.signalReady()
    e.signalReady()
    expect(e.ready).toBe(true)
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('dismiss fires onDismiss with current score', () => {
    const e = new TestEngine(canvas, cfg)
    e.score = 42
    e.dismiss()
    expect(onDismiss).toHaveBeenCalledWith(42)
  })

  it('dismiss is idempotent — second call no-op', () => {
    const e = new TestEngine(canvas, cfg)
    e.dismiss()
    e.dismiss()
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('tryGameOverRestart calls restart fn when not ready', () => {
    const e = new TestEngine(canvas, cfg)
    const restart = vi.fn()
    e._tryRestart(restart)
    expect(restart).toHaveBeenCalledOnce()
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('tryGameOverRestart calls dismiss instead of restart when ready', () => {
    const e = new TestEngine(canvas, cfg)
    e.score = 7
    e.signalReady()
    const restart = vi.fn()
    e._tryRestart(restart)
    expect(restart).not.toHaveBeenCalled()
    expect(onDismiss).toHaveBeenCalledWith(7)
  })

  it('GameHandle-style: ready getter reflects state across full lifecycle', () => {
    const e = new TestEngine(canvas, cfg)
    expect(e.ready).toBe(false)
    e.signalReady()
    expect(e.ready).toBe(true)
    e.dismiss()
    expect(e.ready).toBe(true) // ready stays true after dismiss
  })

  it('onReady not fired if no callback configured', () => {
    const e = new TestEngine(canvas, {})
    expect(() => e.signalReady()).not.toThrow()
  })

  it('host force-dismiss during play works (no gameover needed)', () => {
    const e = new TestEngine(canvas, cfg)
    e._beginGame()
    e.score = 99
    e.dismiss()
    expect(onDismiss).toHaveBeenCalledWith(99)
  })
})

export type LoopCallback = (dt: number) => void

export class GameLoop {
  private rafId: number | null = null
  private last = 0
  private readonly maxDt = 100 // cap dt to avoid spiral-of-death on tab resume

  constructor(private readonly callback: LoopCallback) {}

  start() {
    if (this.rafId !== null) return
    this.last = performance.now()
    this.tick(this.last)
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private tick = (timestamp: number) => {
    const dt = Math.min(timestamp - this.last, this.maxDt)
    this.last = timestamp
    this.callback(dt)
    this.rafId = requestAnimationFrame(this.tick)
  }
}

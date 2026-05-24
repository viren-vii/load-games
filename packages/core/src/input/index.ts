export type InputEvent = 'tap' | 'arrowUp' | 'arrowDown' | 'arrowLeft' | 'arrowRight'

type Handler = () => void

// Keys that would scroll the page if not prevented.
// We only preventDefault when the game is actively running (checked via shouldPreventScroll).
const SCROLL_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

function keyToEvent(key: string): InputEvent | null {
  switch (key) {
    case ' ':
    case 'Enter':      return 'tap'
    case 'ArrowUp':
    case 'w': case 'W': return 'arrowUp'
    case 'ArrowDown':
    case 's': case 'S': return 'arrowDown'
    case 'ArrowLeft':
    case 'a': case 'A': return 'arrowLeft'
    case 'ArrowRight':
    case 'd': case 'D': return 'arrowRight'
    default:           return null
  }
}

export class InputManager {
  private handlers = new Map<InputEvent, Set<Handler>>()
  private held = new Set<InputEvent>()
  private readonly swipeThreshold = 30

  private pointerStartX = 0
  private pointerStartY = 0
  private trackingPointerId: number | null = null

  // Set this to true only while game is running so arrow keys don't block
  // page scroll when game is idle/paused/gameover.
  shouldPreventScroll = false

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.attach()
  }

  on(event: InputEvent, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
  }

  off(event: InputEvent, handler: Handler) {
    this.handlers.get(event)?.delete(handler)
  }

  /** True while key is physically held down. Use in update() for smooth continuous movement. */
  isDown(event: InputEvent): boolean {
    return this.held.has(event)
  }

  destroy() {
    this.detach()
    this.handlers.clear()
    this.held.clear()
  }

  private emit(event: InputEvent) {
    this.handlers.get(event)?.forEach(h => h())
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const event = keyToEvent(e.key)
    if (!event) return
    if (this.shouldPreventScroll && SCROLL_KEYS.has(e.key)) e.preventDefault()
    if (!this.held.has(event)) {
      // emit once on initial press (for tap-style actions like jump/shoot/restart)
      this.emit(event)
    }
    this.held.add(event)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    const event = keyToEvent(e.key)
    if (event) this.held.delete(event)
  }

  private onPointerDown = (e: PointerEvent) => {
    this.pointerStartX = e.clientX
    this.pointerStartY = e.clientY
    this.trackingPointerId = e.pointerId
    // Capture so we still get pointerup even if finger leaves the canvas.
    try { this.canvas.setPointerCapture?.(e.pointerId) } catch { /* ignore */ }
  }

  private onPointerUp = (e: PointerEvent) => {
    if (this.trackingPointerId !== e.pointerId) return
    this.trackingPointerId = null
    try { this.canvas.releasePointerCapture?.(e.pointerId) } catch { /* ignore */ }

    const dx = e.clientX - this.pointerStartX
    const dy = e.clientY - this.pointerStartY
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)

    if (absDx < this.swipeThreshold && absDy < this.swipeThreshold) {
      this.emit('tap')
      return
    }

    if (absDx > absDy) {
      this.emit(dx > 0 ? 'arrowRight' : 'arrowLeft')
    } else {
      this.emit(dy > 0 ? 'arrowDown' : 'arrowUp')
    }
  }

  private onPointerCancel = (e: PointerEvent) => {
    if (this.trackingPointerId !== e.pointerId) return
    this.trackingPointerId = null
    try { this.canvas.releasePointerCapture?.(e.pointerId) } catch { /* ignore */ }
  }

  private attach() {
    this.canvas.addEventListener('keydown', this.onKeyDown)
    this.canvas.addEventListener('keyup', this.onKeyUp)
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    this.canvas.addEventListener('pointerup', this.onPointerUp)
    this.canvas.addEventListener('pointercancel', this.onPointerCancel)
  }

  private detach() {
    this.canvas.removeEventListener('keydown', this.onKeyDown)
    this.canvas.removeEventListener('keyup', this.onKeyUp)
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel)
  }
}

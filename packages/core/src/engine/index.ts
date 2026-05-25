import { GameLoop } from '../timing/index.js'
import type { DismissReason, GameConfig, GameLabels, GameState, GameTheme } from '../types/index.js'
import { DEFAULT_CONFIG, DEFAULT_LABELS, DEFAULT_THEME } from '../types/index.js'

const BADGE_PAD_X = 6
const BADGE_PAD_Y = 4
const BADGE_HEIGHT = 16
const BADGE_MARGIN = 6

export abstract class BaseEngine {
  protected readonly canvas: HTMLCanvasElement
  protected readonly ctx: CanvasRenderingContext2D
  protected readonly theme: GameTheme
  protected readonly labels: GameLabels
  protected readonly config: Required<Pick<GameConfig, 'speed'>> & GameConfig
  protected loop: GameLoop
  private _state: GameState = 'idle'
  private _ready = false
  private _dismissed = false
  private visibilityHandler: () => void
  private intersectionObserver: IntersectionObserver
  private onCanvasPointerUp: (e: PointerEvent) => void
  private onCanvasKeyDown: (e: KeyboardEvent) => void

  protected abstract readonly gameName: string
  protected abstract readonly controlHints: string[]

  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    this.ctx = ctx
    this.theme = { ...DEFAULT_THEME, ...config.theme }
    this.labels = { ...DEFAULT_LABELS, ...config.labels }
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.loop = new GameLoop(this.tick)
    this.setupCanvas()
    this.visibilityHandler = () => {
      if (document.hidden) this.pause()
      else if (this._state === 'paused') this.resume()
    }
    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting) { if (this._state === 'paused') this.resume() }
        else { if (this._state === 'running') this.pause() }
      },
      { threshold: 0.1 }
    )
    // Intercept clicks that land within the return-button area BEFORE the InputManager's
    // pointerup listener fires. Uses event.stopImmediatePropagation() to suppress the
    // tap event going through to the subclass's game logic.
    this.onCanvasPointerUp = (e: PointerEvent) => {
      if (this.hitTestReturnButton(e)) {
        e.stopImmediatePropagation()
        this.dismissWith('user')
      } else if (this._state === 'idle' && this._ready) {
        // Tap on idle while ready: skip the game entirely.
        e.stopImmediatePropagation()
        this.dismissWith('idle-ready')
      }
    }
    // capture-phase so we run before InputManager's bubble-phase listener.
    canvas.addEventListener('pointerup', this.onCanvasPointerUp, { capture: true })
    // Escape key as a keyboard equivalent of the return button — accessibility for
    // keyboard-only users. Only meaningful when ready+running; otherwise no-op.
    this.onCanvasKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (this._ready && this._state === 'running') {
        e.preventDefault()
        e.stopImmediatePropagation()
        this.dismissWith('user')
      } else if (this._ready && this._state === 'idle') {
        e.preventDefault()
        e.stopImmediatePropagation()
        this.dismissWith('idle-ready')
      }
    }
    canvas.addEventListener('keydown', this.onCanvasKeyDown, { capture: true })
  }

  get state(): GameState { return this._state }
  get ready(): boolean { return this._ready }

  /** Subclasses must report current score. Pong returns player score; others return their primary counter. */
  abstract getScore(): number

  start() {
    this._state = 'idle'
    document.addEventListener('visibilitychange', this.visibilityHandler)
    this.intersectionObserver.observe(this.canvas)
    this.loop.start()
  }

  /** Subclass tells the base "first user input received". Idle → running. */
  protected beginGame() {
    if (this._state !== 'idle') return
    this._state = 'running'
  }

  /** Subclass tells the base "user wants to play again". Skips idle screen. */
  protected restartGame() {
    this._state = 'running'
    this.loop.start()
  }

  pause() {
    if (this._state !== 'running') return
    this._state = 'paused'
    this.loop.stop()
    this.config.onPause?.()
  }

  resume() {
    if (this._state !== 'paused') return
    this._state = 'running'
    this.loop.start()
    this.config.onResume?.()
  }

  /**
   * Host signals work is done. Game keeps playing; ready badge appears; next game-over
   * offers "tap to continue" instead of restart. Idempotent.
   */
  signalReady() {
    if (this._ready) return
    this._ready = true
    this.config.onReady?.()
  }

  /**
   * Host force-dismiss. Equivalent to `dismissWith('forced')`. Idempotent.
   * The host should unmount the canvas in response to `onDismiss`. Does NOT call destroy.
   */
  dismiss() { this.dismissWith('forced') }

  /** Internal: dismiss with a specific reason. Public-but-protected by convention. */
  protected dismissWith(reason: DismissReason) {
    if (this._dismissed) return
    this._dismissed = true
    this.config.onDismiss?.(this.getScore(), reason)
  }

  destroy() {
    this.loop.stop()
    document.removeEventListener('visibilitychange', this.visibilityHandler)
    this.intersectionObserver.disconnect()
    this.canvas.removeEventListener('pointerup', this.onCanvasPointerUp, { capture: true } as EventListenerOptions)
    this.canvas.removeEventListener('keydown', this.onCanvasKeyDown, { capture: true } as EventListenerOptions)
  }

  protected setState(state: GameState) { this._state = state }

  protected get clampedSpeed(): number {
    return Math.max(1, Math.min(10, this.config.speed ?? 5))
  }

  /**
   * Subclasses call this from their gameover-tap handler instead of restarting directly.
   * If host has signalled ready, dismiss instead of restart. Otherwise run the supplied restart fn.
   */
  protected tryGameOverRestart(restart: () => void) {
    if (this._ready) { this.dismissWith('gameover'); return }
    restart()
  }

  protected renderGameOver(scoreText: string) {
    const { ctx, theme } = this
    const w = this.width
    const h = this.height
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = theme.text
    ctx.font = 'bold 18px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(this.labels.gameOver, w / 2, h / 2 - 10)
    ctx.font = '13px monospace'
    if (this._ready) {
      const alpha = 0.6 + 0.4 * Math.sin(Date.now() / 300)
      ctx.fillStyle = theme.accent + Math.round(alpha * 255).toString(16).padStart(2, '0')
      ctx.fillText(`${scoreText}  •  ${this.labels.tapContinue}`, w / 2, h / 2 + 14)
    } else {
      ctx.fillStyle = theme.text
      ctx.fillText(`${scoreText}  •  ${this.labels.tapRestart}`, w / 2, h / 2 + 14)
    }
    ctx.textAlign = 'left'
  }

  private static readonly BADGE_FONT = 'bold 10px monospace'
  private badgeTextW = 0
  private badgeLabelCache = ''

  /**
   * Top-right badge shown during play once ready has been signalled.
   * Also serves as the in-canvas return button (clickable when running+ready and config.returnButton !== false).
   */
  protected renderReadyBadge() {
    if (!this._ready) return
    const { ctx, theme } = this
    const w = this.width
    const alpha = 0.55 + 0.45 * Math.sin(Date.now() / 350)
    const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0')
    ctx.font = BaseEngine.BADGE_FONT
    ctx.textAlign = 'right'
    // Re-measure if label has changed (e.g., custom config.labels.readyBadge).
    if (this.badgeLabelCache !== this.labels.readyBadge) {
      this.badgeLabelCache = this.labels.readyBadge
      this.badgeTextW = ctx.measureText(this.labels.readyBadge).width
    }
    const boxW = this.badgeTextW + BADGE_PAD_X * 2
    const x = w - BADGE_MARGIN - boxW
    const y = BADGE_MARGIN
    ctx.fillStyle = theme.bg + 'cc'
    ctx.fillRect(x, y, boxW, BADGE_HEIGHT)
    ctx.strokeStyle = theme.accent + alphaHex
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, boxW - 1, BADGE_HEIGHT - 1)
    ctx.fillStyle = theme.accent + alphaHex
    ctx.fillText(this.labels.readyBadge, w - BADGE_MARGIN - BADGE_PAD_X, y + BADGE_HEIGHT - BADGE_PAD_Y - 1)
    ctx.textAlign = 'left'
  }

  /**
   * Hit-test a pointer event against the return-button bounds.
   * Returns true if the click should dismiss the game instead of being forwarded as a tap.
   */
  private hitTestReturnButton(e: PointerEvent): boolean {
    if (this.config.returnButton === false) return false
    if (!this._ready || this._state !== 'running') return false
    if (!this.badgeTextW) return false // hasn't been rendered yet
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const boxW = this.badgeTextW + BADGE_PAD_X * 2
    const boxX = this.width - BADGE_MARGIN - boxW
    const boxY = BADGE_MARGIN
    return x >= boxX && x <= boxX + boxW && y >= boxY && y <= boxY + BADGE_HEIGHT
  }

  private setupCanvas() {
    const dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    const w = this.config.width ?? (rect.width || 300)
    const h = this.config.height ?? (rect.height || 300)
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx.scale(dpr, dpr)
  }

  protected get width() { return this.canvas.width / (window.devicePixelRatio || 1) }
  protected get height() { return this.canvas.height / (window.devicePixelRatio || 1) }

  protected abstract update(dt: number): void
  protected abstract render(): void

  private renderIdle() {
    const { ctx, theme } = this
    const w = this.width
    const h = this.height

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = theme.primary
    ctx.font = `bold ${Math.min(22, w / 10)}px monospace`
    ctx.textAlign = 'center'
    ctx.fillText(this.gameName.toUpperCase(), w / 2, h / 2 - 40)

    ctx.strokeStyle = theme.accent + '66'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(w / 4, h / 2 - 26)
    ctx.lineTo(w * 3 / 4, h / 2 - 26)
    ctx.stroke()

    const hintSize = Math.max(10, Math.min(12, w / 28))
    ctx.font = `${hintSize}px monospace`
    ctx.fillStyle = theme.text + 'aa'
    this.controlHints.forEach((hint, i) => {
      ctx.fillText(hint, w / 2, h / 2 - 8 + i * (hintSize + 6))
    })

    const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 400)
    ctx.fillStyle = theme.accent + Math.round(alpha * 255).toString(16).padStart(2, '0')
    ctx.font = `bold ${hintSize + 1}px monospace`
    // Swap prompt when host has already signalled ready — let the player exit without playing.
    const prompt = this._ready ? this.labels.idleReady : this.labels.idleStart
    ctx.fillText(prompt, w / 2, h / 2 + this.controlHints.length * (hintSize + 6) + 16)

    ctx.textAlign = 'left'
    this.renderReadyBadge()
  }

  private tick = (dt: number) => {
    if (this._state === 'idle') { this.renderIdle(); return }
    this.update(dt)
    this.render()
    if (this._state === 'running') this.renderReadyBadge()
  }
}

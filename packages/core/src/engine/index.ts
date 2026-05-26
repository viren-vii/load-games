import { GameLoop } from '../timing/index.js'
import type { DismissReason, GameConfig, GameLabels, GameState, GameTheme } from '../types/index.js'
import { DEFAULT_CONFIG, DEFAULT_LABELS, DEFAULT_THEME } from '../types/index.js'

// Reference dims (320×320) for the engine-managed UI overlays — badge, gameover
// banner, idle screen. All sizes scale by min(w,h)/REF so the UI fits on small
// loaders (160×160 etc.) without clipping.
const UI_REF = 320
const BADGE_PAD_X_REF = 6
const BADGE_PAD_Y_REF = 4
const BADGE_HEIGHT_REF = 16
const BADGE_MARGIN_REF = 6
const BADGE_FONT_REF = 10

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
        if (entry.isIntersecting) {
          if (this._state === 'paused') this.resume()
        } else {
          if (this._state === 'running') this.pause()
        }
      },
      { threshold: 0.1 },
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

  get state(): GameState {
    return this._state
  }
  get ready(): boolean {
    return this._ready
  }

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
  dismiss() {
    this.dismissWith('forced')
  }

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

  protected setState(state: GameState) {
    this._state = state
  }

  protected get clampedSpeed(): number {
    return Math.max(1, Math.min(10, this.config.speed ?? 5))
  }

  /** Scale factor for engine-managed UI overlays. 1.0 at 320×320, <1 at smaller canvases. */
  protected get uiScale(): number {
    return Math.min(this.width, this.height) / UI_REF
  }

  /**
   * Subclasses call this from their gameover-tap handler instead of restarting directly.
   * If host has signalled ready, dismiss instead of restart. Otherwise run the supplied restart fn.
   */
  protected tryGameOverRestart(restart: () => void) {
    if (this._ready) {
      this.dismissWith('gameover')
      return
    }
    restart()
  }

  protected renderGameOver(scoreText: string) {
    const { ctx, theme } = this
    const w = this.width
    const h = this.height
    const s = this.uiScale
    const titleFont = Math.max(11, Math.round(18 * s))
    const promptFont = Math.max(9, Math.round(13 * s))
    const titleY = h / 2 - Math.round(10 * s)
    const promptY = h / 2 + Math.round(promptFont + 4)
    ctx.fillStyle = 'rgba(0,0,0,0.65)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = theme.text
    ctx.font = `bold ${titleFont}px monospace`
    ctx.textAlign = 'center'
    ctx.fillText(this.labels.gameOver, w / 2, titleY)
    ctx.font = `${promptFont}px monospace`
    if (this._ready) {
      const alpha = 0.6 + 0.4 * Math.sin(Date.now() / 300)
      ctx.fillStyle =
        theme.accent +
        Math.round(alpha * 255)
          .toString(16)
          .padStart(2, '0')
      ctx.fillText(`${scoreText}  •  ${this.labels.tapContinue}`, w / 2, promptY)
    } else {
      ctx.fillStyle = theme.text
      ctx.fillText(`${scoreText}  •  ${this.labels.tapRestart}`, w / 2, promptY)
    }
    ctx.textAlign = 'left'
  }

  private badgeTextW = 0
  private badgeLabelCache = ''
  private badgeLabelCacheScale = 0

  private get badgeFontSize() {
    return Math.max(8, Math.round(BADGE_FONT_REF * this.uiScale))
  }
  private get badgePadX() {
    return Math.max(3, Math.round(BADGE_PAD_X_REF * this.uiScale))
  }
  private get badgePadY() {
    return Math.max(2, Math.round(BADGE_PAD_Y_REF * this.uiScale))
  }
  private get badgeHeight() {
    return Math.max(11, Math.round(BADGE_HEIGHT_REF * this.uiScale))
  }
  private get badgeMargin() {
    return Math.max(3, Math.round(BADGE_MARGIN_REF * this.uiScale))
  }

  /**
   * Top-right badge shown during play once ready has been signalled.
   * Also serves as the in-canvas return button (clickable when running+ready and config.returnButton !== false).
   */
  protected renderReadyBadge() {
    if (!this._ready) return
    const { ctx, theme } = this
    const w = this.width
    const padX = this.badgePadX
    const padY = this.badgePadY
    const height = this.badgeHeight
    const margin = this.badgeMargin
    const fontSize = this.badgeFontSize
    const alpha = 0.55 + 0.45 * Math.sin(Date.now() / 350)
    const alphaHex = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, '0')
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = 'right'
    // Re-measure if label or scale has changed (custom labels.readyBadge or canvas resize).
    if (this.badgeLabelCache !== this.labels.readyBadge || this.badgeLabelCacheScale !== fontSize) {
      this.badgeLabelCache = this.labels.readyBadge
      this.badgeLabelCacheScale = fontSize
      this.badgeTextW = ctx.measureText(this.labels.readyBadge).width
    }
    const boxW = this.badgeTextW + padX * 2
    const x = w - margin - boxW
    const y = margin
    ctx.fillStyle = theme.bg + 'cc'
    ctx.fillRect(x, y, boxW, height)
    ctx.strokeStyle = theme.accent + alphaHex
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, boxW - 1, height - 1)
    ctx.fillStyle = theme.accent + alphaHex
    ctx.fillText(this.labels.readyBadge, w - margin - padX, y + height - padY - 1)
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
    const padX = this.badgePadX
    const margin = this.badgeMargin
    const height = this.badgeHeight
    const boxW = this.badgeTextW + padX * 2
    const boxX = this.width - margin - boxW
    const boxY = margin
    return x >= boxX && x <= boxX + boxW && y >= boxY && y <= boxY + height
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

  protected get width() {
    return this.canvas.width / (window.devicePixelRatio || 1)
  }
  protected get height() {
    return this.canvas.height / (window.devicePixelRatio || 1)
  }

  protected abstract update(dt: number): void
  protected abstract render(): void

  private renderIdle() {
    const { ctx, theme } = this
    const w = this.width
    const h = this.height
    const s = this.uiScale
    // Stack everything around the canvas center; row spacing scales with the
    // hint font so nothing overflows on small canvases.
    const titleFont = Math.max(11, Math.min(22, Math.round(22 * s)))
    const hintSize = Math.max(8, Math.min(12, Math.round(12 * s)))
    const lineGap = Math.max(4, Math.round(6 * s))
    const rowH = hintSize + lineGap
    const titleGap = Math.max(8, Math.round(14 * s))
    const promptGap = Math.max(10, Math.round(16 * s))
    const hintCount = this.controlHints.length
    // Center the (title + hints + prompt) block vertically.
    const blockH = titleFont + titleGap + hintCount * rowH + promptGap + hintSize
    const blockTop = Math.max(8, Math.round((h - blockH) / 2))

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = theme.primary
    ctx.font = `bold ${titleFont}px monospace`
    ctx.textAlign = 'center'
    const titleBaseline = blockTop + titleFont
    ctx.fillText(this.gameName.toUpperCase(), w / 2, titleBaseline)

    ctx.strokeStyle = theme.accent + '66'
    ctx.lineWidth = 1
    ctx.beginPath()
    const dividerY = titleBaseline + Math.round(titleGap / 2)
    ctx.moveTo(w / 4, dividerY)
    ctx.lineTo((w * 3) / 4, dividerY)
    ctx.stroke()

    const hintsTop = titleBaseline + titleGap
    ctx.font = `${hintSize}px monospace`
    ctx.fillStyle = theme.text + 'aa'
    this.controlHints.forEach((hint, i) => {
      ctx.fillText(hint, w / 2, hintsTop + hintSize + i * rowH)
    })

    const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 400)
    ctx.fillStyle =
      theme.accent +
      Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0')
    ctx.font = `bold ${hintSize + 1}px monospace`
    // Swap prompt when host has already signalled ready — let the player exit without playing.
    const prompt = this._ready ? this.labels.idleReady : this.labels.idleStart
    const promptY = hintsTop + hintCount * rowH + promptGap
    ctx.fillText(prompt, w / 2, promptY)

    ctx.textAlign = 'left'
    this.renderReadyBadge()
  }

  private tick = (dt: number) => {
    if (this._state === 'idle') {
      this.renderIdle()
      return
    }
    this.update(dt)
    this.render()
    if (this._state === 'running') this.renderReadyBadge()
  }
}

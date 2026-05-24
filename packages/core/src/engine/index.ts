import { GameLoop } from '../timing/index.js'
import type { GameConfig, GameState, GameTheme } from '../types/index.js'
import { DEFAULT_CONFIG, DEFAULT_THEME } from '../types/index.js'

export abstract class BaseEngine {
  protected readonly canvas: HTMLCanvasElement
  protected readonly ctx: CanvasRenderingContext2D
  protected readonly theme: GameTheme
  protected readonly config: Required<Pick<GameConfig, 'speed'>> & GameConfig
  protected loop: GameLoop
  private _state: GameState = 'idle'
  private visibilityHandler: () => void
  private intersectionObserver: IntersectionObserver

  protected abstract readonly gameName: string
  protected abstract readonly controlHints: string[]

  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    this.ctx = ctx
    this.theme = { ...DEFAULT_THEME, ...config.theme }
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
  }

  get state(): GameState { return this._state }

  /** Called by React wrapper — shows idle screen, waits for input. */
  start() {
    this._state = 'idle'
    document.addEventListener('visibilitychange', this.visibilityHandler)
    this.intersectionObserver.observe(this.canvas)
    this.loop.start()
  }

  /** Called by game on first user input — transitions idle → running. */
  protected beginGame() {
    if (this._state !== 'idle') return
    this._state = 'running'
  }

  /** Called by game on restart (after gameover) — skips idle screen. */
  protected restartGame() {
    this._state = 'running'
    this.loop.start()
  }

  pause() {
    if (this._state !== 'running') return
    this._state = 'paused'
    this.loop.stop()
  }

  resume() {
    if (this._state !== 'paused') return
    this._state = 'running'
    this.loop.start()
  }

  destroy() {
    this.loop.stop()
    document.removeEventListener('visibilitychange', this.visibilityHandler)
    this.intersectionObserver.disconnect()
  }

  protected setState(state: GameState) { this._state = state }

  protected get clampedSpeed(): number {
    return Math.max(1, Math.min(10, this.config.speed ?? 5))
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
    ctx.fillText('GAME OVER', w / 2, h / 2 - 10)
    ctx.font = '13px monospace'
    ctx.fillText(`${scoreText}  •  tap to restart`, w / 2, h / 2 + 14)
    ctx.textAlign = 'left'
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

    // game name
    ctx.fillStyle = theme.primary
    ctx.font = `bold ${Math.min(22, w / 10)}px monospace`
    ctx.textAlign = 'center'
    ctx.fillText(this.gameName.toUpperCase(), w / 2, h / 2 - 40)

    // divider
    ctx.strokeStyle = theme.accent + '66'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(w / 4, h / 2 - 26)
    ctx.lineTo(w * 3 / 4, h / 2 - 26)
    ctx.stroke()

    // controls
    const hintSize = Math.max(10, Math.min(12, w / 28))
    ctx.font = `${hintSize}px monospace`
    ctx.fillStyle = theme.text + 'aa'
    this.controlHints.forEach((hint, i) => {
      ctx.fillText(hint, w / 2, h / 2 - 8 + i * (hintSize + 6))
    })

    // tap to start — pulsing opacity via sin
    const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 400)
    ctx.fillStyle = theme.accent + Math.round(alpha * 255).toString(16).padStart(2, '0')
    ctx.font = `bold ${hintSize + 1}px monospace`
    ctx.fillText('tap / press any key to start', w / 2, h / 2 + this.controlHints.length * (hintSize + 6) + 16)

    ctx.textAlign = 'left'
  }

  private tick = (dt: number) => {
    if (this._state === 'idle') { this.renderIdle(); return }
    this.update(dt)
    this.render()
  }
}

import { BaseEngine, InputManager } from '@load-games/core'
import type { GameConfig } from '@load-games/core'

interface Pipe { x: number; gapY: number; scored?: boolean }

const GRAVITY = 1800
const FLAP_VEL = -480
const PIPE_WIDTH = 40
const GAP_HEIGHT = 120
const PIPE_SPEED_BASE = 120
const BIRD_X_RATIO = 0.25
const BIRD_SIZE = 18

export class FlappyEngine extends BaseEngine {
  protected readonly gameName = 'Flappy'
  protected readonly controlHints = [
    'Space / Tap / Click — flap',
    'Fly through the gaps',
  ]

  private birdY = 0
  private birdVel = 0
  private pipes: Pipe[] = []
  private score = 0
  private readonly input: InputManager
  private pipeTimer = 0
  private readonly pipeInterval = 1600

  private get pipeSpeed() {
    return PIPE_SPEED_BASE + (this.clampedSpeed - 1) * 20
  }

  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    super(canvas, config)
    this.input = new InputManager(canvas)
    this.input.on('tap', () => this.flap())
    this.input.on('arrowUp', () => this.flap())
    this.reset()
  }

  private reset() {
    this.birdY = this.height / 2
    this.birdVel = 0
    this.pipes = []
    this.score = 0
    this.pipeTimer = this.pipeInterval
  }

  private flap() {
    if (this.state === 'idle') { this.beginGame(); this.birdVel = FLAP_VEL; return }
    if (this.state === 'gameover') { this.reset(); this.restartGame(); return }
    if (this.state === 'running') this.birdVel = FLAP_VEL
  }

  protected update(dt: number) {
    if (this.state !== 'running') return
    const dtSec = dt / 1000
    const w = this.width
    const h = this.height
    const birdX = w * BIRD_X_RATIO

    this.birdVel += GRAVITY * dtSec
    this.birdY += this.birdVel * dtSec

    if (this.birdY < 0 || this.birdY + BIRD_SIZE > h) { this.endGame(); return }

    this.pipeTimer -= dt
    if (this.pipeTimer <= 0) {
      this.pipeTimer = this.pipeInterval
      const minGap = GAP_HEIGHT / 2 + 20
      this.pipes.push({ x: w, gapY: minGap + Math.random() * (h - GAP_HEIGHT - 40) })
    }

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i]!
      pipe.x -= this.pipeSpeed * dtSec

      if (pipe.x + PIPE_WIDTH < birdX && !pipe.scored) {
        pipe.scored = true
        this.score++
        this.config.onScore?.(this.score)
      }

      if (pipe.x + PIPE_WIDTH < 0) { this.pipes.splice(i, 1); continue }

      const inPipeX = birdX + BIRD_SIZE > pipe.x && birdX < pipe.x + PIPE_WIDTH
      const inGap = this.birdY > pipe.gapY - GAP_HEIGHT / 2 && this.birdY + BIRD_SIZE < pipe.gapY + GAP_HEIGHT / 2
      if (inPipeX && !inGap) { this.endGame(); return }
    }
  }

  private endGame() {
    this.setState('gameover')
    this.loop.stop()
    this.config.onGameOver?.(this.score)
  }

  protected render() {
    const { ctx, theme } = this
    const w = this.width
    const h = this.height
    const birdX = w * BIRD_X_RATIO

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = theme.accent
    for (const pipe of this.pipes) {
      const topH = pipe.gapY - GAP_HEIGHT / 2
      const botY = pipe.gapY + GAP_HEIGHT / 2
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topH)
      ctx.fillRect(pipe.x, botY, PIPE_WIDTH, h - botY)
    }

    ctx.fillStyle = theme.primary
    ctx.beginPath()
    ctx.ellipse(birdX + BIRD_SIZE / 2, this.birdY + BIRD_SIZE / 2, BIRD_SIZE / 2, BIRD_SIZE / 2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = theme.text
    ctx.font = '12px monospace'
    ctx.fillText(`${this.score}`, 8, 20)

    if (this.state === 'gameover') this.renderGameOver(`Score: ${this.score}`)
  }

  destroy() {
    super.destroy()
    this.input.destroy()
  }
}

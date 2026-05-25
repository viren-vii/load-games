import { BaseEngine, InputManager } from '@load-games/core'
import type { GameConfig } from '@load-games/core'

interface Pipe {
  x: number
  gapY: number
  scored?: boolean
}

// All gameplay tuned against a 320×320 reference canvas. At other sizes we scale
// every velocity, dimension, and gap by `min(w,h) / 320` so the feel is consistent
// at any canvas dimension — critical for small loaders (160×160 etc.).
const REF = 320
const GRAVITY_REF = 1500
const FLAP_VEL_REF = -460
const FIRST_FLAP_VEL_REF = -560
const PIPE_WIDTH_REF = 40
const GAP_HEIGHT_REF = 130
const PIPE_SPEED_BASE_REF = 120
const BIRD_X_RATIO = 0.25
const BIRD_SIZE_REF = 18
const FIRST_PIPE_DELAY_MS = 2500

export class FlappyEngine extends BaseEngine {
  protected readonly gameName = 'Flappy'
  protected readonly controlHints = ['Space / Tap / Click — flap', 'Fly through the gaps']

  private birdY = 0
  private birdVel = 0
  private pipes: Pipe[] = []
  private score = 0
  private readonly input: InputManager
  private pipeTimer = 0
  private readonly pipeInterval = 1600

  private get scale() {
    return Math.min(this.width, this.height) / REF
  }
  private get gravity() {
    return GRAVITY_REF * this.scale
  }
  private get flapVel() {
    return FLAP_VEL_REF * this.scale
  }
  private get firstFlapVel() {
    return FIRST_FLAP_VEL_REF * this.scale
  }
  private get pipeWidth() {
    return PIPE_WIDTH_REF * (this.width / REF)
  }
  private get gapHeight() {
    return GAP_HEIGHT_REF * (this.height / REF)
  }
  private get birdSize() {
    return BIRD_SIZE_REF * this.scale
  }
  private get pipeSpeed() {
    return (PIPE_SPEED_BASE_REF + (this.clampedSpeed - 1) * 20) * (this.width / REF)
  }

  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    super(canvas, config)
    this.input = new InputManager(canvas)
    this.input.on('tap', () => this.flap())
    this.input.on('arrowUp', () => this.flap())
    this.reset()
  }

  private reset() {
    // Bird starts a third of the way down (not centred) so it has more room to
    // fall on the first flap — feels less "starts crashing into the ceiling."
    this.birdY = this.height / 3
    this.birdVel = 0
    this.pipes = []
    this.score = 0
    this.pipeTimer = FIRST_PIPE_DELAY_MS
  }

  private flap() {
    if (this.state === 'idle') {
      this.beginGame()
      // First flap is extra-tall + first pipe is delayed → player gets to acclimate.
      this.birdVel = this.firstFlapVel
      return
    }
    if (this.state === 'gameover') {
      this.tryGameOverRestart(() => {
        this.reset()
        // Apply the same extra-tall first flap on every restart (not just the
        // very first start) so the player doesn't immediately fall again.
        this.birdVel = this.firstFlapVel
        this.restartGame()
      })
      return
    }
    if (this.state === 'running') this.birdVel = this.flapVel
  }

  protected update(dt: number) {
    if (this.state !== 'running') return
    const dtSec = dt / 1000
    const w = this.width
    const h = this.height
    const birdX = w * BIRD_X_RATIO
    const pw = this.pipeWidth
    const gap = this.gapHeight
    const size = this.birdSize

    this.birdVel += this.gravity * dtSec
    this.birdY += this.birdVel * dtSec

    // Ground kills. Ceiling clamps (common modern variant) — prevents the
    // common "stuck looping near ceiling" failure on small canvases.
    if (this.birdY + size > h) {
      this.endGame()
      return
    }
    if (this.birdY < 0) {
      this.birdY = 0
      this.birdVel = 0
    }

    this.pipeTimer -= dt
    if (this.pipeTimer <= 0) {
      this.pipeTimer = this.pipeInterval
      const minGap = gap / 2 + 20
      this.pipes.push({ x: w, gapY: minGap + Math.random() * (h - gap - 40) })
    }

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i]!
      pipe.x -= this.pipeSpeed * dtSec

      if (pipe.x + pw < birdX && !pipe.scored) {
        pipe.scored = true
        this.score++
        this.config.onScore?.(this.score)
      }

      if (pipe.x + pw < 0) {
        this.pipes.splice(i, 1)
        continue
      }

      const inPipeX = birdX + size > pipe.x && birdX < pipe.x + pw
      const inGap = this.birdY > pipe.gapY - gap / 2 && this.birdY + size < pipe.gapY + gap / 2
      if (inPipeX && !inGap) {
        this.endGame()
        return
      }
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
    const pw = this.pipeWidth
    const gap = this.gapHeight
    const size = this.birdSize

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = theme.accent
    for (const pipe of this.pipes) {
      const topH = pipe.gapY - gap / 2
      const botY = pipe.gapY + gap / 2
      ctx.fillRect(pipe.x, 0, pw, topH)
      ctx.fillRect(pipe.x, botY, pw, h - botY)
    }

    ctx.fillStyle = theme.primary
    ctx.beginPath()
    ctx.ellipse(birdX + size / 2, this.birdY + size / 2, size / 2, size / 2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = theme.text
    ctx.font = '12px monospace'
    ctx.fillText(`${this.score}`, 8, 20)

    if (this.state === 'gameover') this.renderGameOver(`Score: ${this.score}`)
  }

  getScore() {
    return this.score
  }

  destroy() {
    super.destroy()
    this.input.destroy()
  }
}

import { BaseEngine, InputManager } from '@load-games/core'
import type { GameConfig } from '@load-games/core'

const BRICK_ROWS = 5
const BRICK_COLS = 8
const BRICK_PAD = 4
const PADDLE_H = 10
const BALL_R = 7

interface Brick {
  x: number
  y: number
  w: number
  h: number
  alive: boolean
  row: number
}

export class BreakoutEngine extends BaseEngine {
  protected readonly gameName = 'Breakout'
  protected readonly controlHints = [
    'Mouse — move paddle',
    'Arrow keys ← → — move paddle',
    'Clear all bricks to advance',
  ]

  private paddle = { x: 0, w: 70, vel: 0 }
  private ball = { x: 0, y: 0, vx: 0, vy: 0 }
  private bricks: Brick[] = []
  private score = 0
  private level = 1
  private lives = 3
  private serving = false // post-death rest state; ball sticks above paddle until tap
  private readonly input: InputManager

  private pointerX: number | null = null
  private onPointerMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    this.pointerX = e.clientX - rect.left
    if (this.state === 'idle') this.beginGame()
  }

  private get ballSpeed() {
    return 180 + (this.clampedSpeed - 1) * 20 + (this.level - 1) * 15
  }

  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    super(canvas, config)
    this.input = new InputManager(canvas)
    this.bindInput()
    canvas.addEventListener('pointermove', this.onPointerMove)
    this.reset()
  }

  private bindInput() {
    this.input.on('arrowLeft', () => {
      if (this.state === 'idle') {
        this.beginGame()
        return
      }
      this.paddle.vel = -1
    })
    this.input.on('arrowRight', () => {
      if (this.state === 'idle') {
        this.beginGame()
        return
      }
      this.paddle.vel = 1
    })
    this.input.on('tap', () => {
      if (this.state === 'idle') {
        this.beginGame()
        return
      }
      if (this.state === 'running' && this.serving) {
        this.launchBall()
        return
      }
      if (this.state === 'gameover') {
        this.tryGameOverRestart(() => {
          this.lives = 3
          this.level = 1
          this.score = 0
          this.reset()
          this.restartGame()
        })
      }
    })
  }

  private launchBall() {
    const angle = (Math.random() * 60 + 60) * (Math.PI / 180)
    const spd = this.ballSpeed
    this.ball.vx = spd * Math.cos(angle) * (Math.random() < 0.5 ? 1 : -1)
    this.ball.vy = -spd * Math.sin(angle)
    this.serving = false
  }

  private reset() {
    const w = this.width
    const h = this.height
    this.paddle.x = w / 2 - this.paddle.w / 2
    this.pointerX = null

    const brickW = (w - BRICK_PAD * (BRICK_COLS + 1)) / BRICK_COLS
    const brickH = 14
    this.bricks = []
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        this.bricks.push({
          x: BRICK_PAD + c * (brickW + BRICK_PAD),
          y: 36 + r * (brickH + BRICK_PAD),
          w: brickW,
          h: brickH,
          alive: true,
          row: r,
        })
      }
    }

    const angle = (Math.random() * 60 + 60) * (Math.PI / 180)
    const spd = this.ballSpeed
    this.ball = {
      x: w / 2,
      y: h - 80,
      vx: spd * Math.cos(angle) * (Math.random() < 0.5 ? 1 : -1),
      vy: -spd * Math.sin(angle),
    }
  }

  protected update(dt: number) {
    if (this.state !== 'running') return
    this.input.shouldPreventScroll = true
    const dtSec = dt / 1000
    const w = this.width
    const h = this.height
    const paddleY = h - PADDLE_H - 8

    if (this.pointerX !== null) {
      this.paddle.x = Math.max(0, Math.min(w - this.paddle.w, this.pointerX - this.paddle.w / 2))
    } else {
      const PADDLE_SPEED = 280
      this.paddle.x = Math.max(0, Math.min(w - this.paddle.w, this.paddle.x + this.paddle.vel * PADDLE_SPEED * dtSec))
      this.paddle.vel *= 0.85
    }

    // While serving, ball rides above the paddle. No physics until launch.
    if (this.serving) {
      this.ball.x = this.paddle.x + this.paddle.w / 2
      this.ball.y = paddleY - BALL_R - 2
      return
    }

    this.ball.x += this.ball.vx * dtSec
    this.ball.y += this.ball.vy * dtSec

    if (this.ball.x - BALL_R < 0) {
      this.ball.x = BALL_R
      this.ball.vx = Math.abs(this.ball.vx)
    }
    if (this.ball.x + BALL_R > w) {
      this.ball.x = w - BALL_R
      this.ball.vx = -Math.abs(this.ball.vx)
    }
    if (this.ball.y - BALL_R < 0) {
      this.ball.y = BALL_R
      this.ball.vy = Math.abs(this.ball.vy)
    }

    if (this.ball.y - BALL_R > h) {
      this.lives--
      this.config.onScore?.(this.score)
      if (this.lives <= 0) {
        this.setState('gameover')
        this.loop.stop()
        this.input.shouldPreventScroll = false
        this.config.onGameOver?.(this.score)
        return
      }
      // Rest the ball above the paddle and wait for the player to tap-serve.
      // Gives them a moment to gather composure instead of being thrust into action.
      this.serving = true
      this.ball.vx = 0
      this.ball.vy = 0
      return
    }

    if (
      this.ball.vy > 0 &&
      this.ball.y + BALL_R >= paddleY &&
      this.ball.y + BALL_R <= paddleY + PADDLE_H + 4 &&
      this.ball.x >= this.paddle.x - BALL_R &&
      this.ball.x <= this.paddle.x + this.paddle.w + BALL_R
    ) {
      const hit = (this.ball.x - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2)
      const angle = hit * 65 * (Math.PI / 180)
      const spd = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2)
      this.ball.vx = spd * Math.sin(angle)
      this.ball.vy = -Math.abs(spd * Math.cos(angle))
      this.ball.y = paddleY - BALL_R
    }

    let allDead = true
    for (const brick of this.bricks) {
      if (!brick.alive) continue
      allDead = false
      const nearX = Math.max(brick.x, Math.min(brick.x + brick.w, this.ball.x))
      const nearY = Math.max(brick.y, Math.min(brick.y + brick.h, this.ball.y))
      const dx = this.ball.x - nearX
      const dy = this.ball.y - nearY
      if (dx * dx + dy * dy < BALL_R * BALL_R) {
        brick.alive = false
        this.score++
        this.config.onScore?.(this.score)
        if (Math.abs(dx) > Math.abs(dy)) this.ball.vx = -this.ball.vx
        else this.ball.vy = -this.ball.vy
      }
    }

    if (allDead) {
      this.level++
      this.reset()
    }
  }

  protected render() {
    const { ctx, theme } = this
    const w = this.width
    const h = this.height
    const paddleY = h - PADDLE_H - 8

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    const rowAlpha = [1, 0.9, 0.75, 0.6, 0.45]
    for (const brick of this.bricks) {
      if (!brick.alive) continue
      ctx.globalAlpha = rowAlpha[brick.row] ?? 0.4
      ctx.fillStyle = brick.row % 2 === 0 ? theme.accent : theme.primary
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h)
    }
    ctx.globalAlpha = 1

    ctx.fillStyle = theme.primary
    ctx.beginPath()
    ctx.roundRect(this.paddle.x, paddleY, this.paddle.w, PADDLE_H, 3)
    ctx.fill()

    ctx.fillStyle = theme.accent
    ctx.beginPath()
    ctx.arc(this.ball.x, this.ball.y, BALL_R, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = theme.text
    ctx.font = '12px monospace'
    ctx.fillText(`${this.score}`, 8, 20)
    ctx.textAlign = 'center'
    ctx.fillText(`LVL ${this.level}`, w / 2, 20)
    ctx.textAlign = 'right'
    ctx.fillText('♥'.repeat(this.lives), w - 8, 20)
    ctx.textAlign = 'left'

    if (this.serving && this.state === 'running') {
      ctx.textAlign = 'center'
      const alpha = 0.5 + 0.5 * Math.sin(Date.now() / 350)
      ctx.fillStyle =
        theme.text +
        Math.round(alpha * 255)
          .toString(16)
          .padStart(2, '0')
      ctx.font = '11px monospace'
      ctx.fillText(this.labels.tapServe, w / 2, h - 18)
      ctx.textAlign = 'left'
    }

    if (this.state === 'gameover') this.renderGameOver(`Score: ${this.score}`)
  }

  getScore() {
    return this.score
  }

  destroy() {
    super.destroy()
    this.input.shouldPreventScroll = false
    this.input.destroy()
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
  }
}

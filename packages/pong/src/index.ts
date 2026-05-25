import { BaseEngine, InputManager } from '@load-games/core'
import type { GameConfig } from '@load-games/core'

const PADDLE_W = 10
const PADDLE_H = 55
const BALL_SIZE = 8
const MARGIN = 12
const PLAYER_SPEED = 320
const WIN_SCORE = 5

export class PongEngine extends BaseEngine {
  protected readonly gameName = 'Pong'
  protected readonly controlHints = [
    'Move mouse / drag — control your paddle',
    'Arrow keys ↑ ↓ — move paddle',
    `First to ${WIN_SCORE} wins`,
  ]

  private player = { y: 0 }
  private ai = { y: 0 }
  private ball = { x: 0, y: 0, vx: 0, vy: 0 }
  private score = { player: 0, ai: 0 }
  private serving = false
  private serveDir: 1 | -1 = 1
  private readonly input: InputManager

  private pointerY: number | null = null
  private onPointerMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    this.pointerY = e.clientY - rect.top
    if (this.state === 'idle') this.beginGame()
  }
  private onPointerLeave = () => {
    this.pointerY = null
  }

  private get ballSpeed() {
    return 180 + (this.clampedSpeed - 1) * 25
  }

  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    super(canvas, config)
    this.input = new InputManager(canvas)
    this.input.on('arrowUp', () => {
      if (this.state === 'idle') this.beginGame()
    })
    this.input.on('arrowDown', () => {
      if (this.state === 'idle') this.beginGame()
    })
    this.input.on('tap', () => {
      if (this.state === 'idle') {
        this.beginGame()
        return
      }
      if (this.state === 'running' && this.serving) {
        this.serve()
        return
      }
      if (this.state === 'gameover') {
        this.tryGameOverRestart(() => {
          this.score = { player: 0, ai: 0 }
          this.reset()
          this.restartGame()
        })
      }
    })
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerleave', this.onPointerLeave)
    this.reset()
  }

  private reset(serveDir: 1 | -1 = 1) {
    const w = this.width
    const h = this.height
    this.player.y = h / 2 - PADDLE_H / 2
    this.ai.y = h / 2 - PADDLE_H / 2
    // Rest the ball at center; player taps to serve. Same calming pre-serve gap as breakout.
    this.ball = { x: w / 2, y: h / 2, vx: 0, vy: 0 }
    this.serving = true
    this.serveDir = serveDir
  }

  private serve() {
    const angle = (Math.random() * 40 - 20) * (Math.PI / 180)
    const spd = this.ballSpeed
    this.ball.vx = spd * Math.cos(angle) * this.serveDir
    this.ball.vy = spd * Math.sin(angle)
    this.serving = false
  }

  protected update(dt: number) {
    if (this.state !== 'running') return
    this.input.shouldPreventScroll = true
    const dtSec = dt / 1000
    const h = this.height
    const w = this.width

    if (this.pointerY !== null) {
      this.player.y = Math.max(0, Math.min(h - PADDLE_H, this.pointerY - PADDLE_H / 2))
    } else {
      if (this.input.isDown('arrowUp')) this.player.y = Math.max(0, this.player.y - PLAYER_SPEED * dtSec)
      if (this.input.isDown('arrowDown')) this.player.y = Math.min(h - PADDLE_H, this.player.y + PLAYER_SPEED * dtSec)
    }

    // While serving, paddle responds but ball is held at center. Tap fires serve().
    if (this.serving) {
      this.ball.x = w / 2
      this.ball.y = h / 2
      return
    }

    const aiCenter = this.ai.y + PADDLE_H / 2
    const aiSpeed = (140 + this.clampedSpeed * 12) * dtSec
    if (aiCenter < this.ball.y - 4) this.ai.y = Math.min(h - PADDLE_H, this.ai.y + aiSpeed)
    else if (aiCenter > this.ball.y + 4) this.ai.y = Math.max(0, this.ai.y - aiSpeed)

    this.ball.x += this.ball.vx * dtSec
    this.ball.y += this.ball.vy * dtSec

    if (this.ball.y < BALL_SIZE / 2) {
      this.ball.y = BALL_SIZE / 2
      this.ball.vy = Math.abs(this.ball.vy)
    }
    if (this.ball.y > h - BALL_SIZE / 2) {
      this.ball.y = h - BALL_SIZE / 2
      this.ball.vy = -Math.abs(this.ball.vy)
    }

    const playerX = MARGIN + PADDLE_W
    if (
      this.ball.vx < 0 &&
      this.ball.x - BALL_SIZE / 2 <= playerX &&
      this.ball.x - BALL_SIZE / 2 >= MARGIN &&
      this.ball.y >= this.player.y - BALL_SIZE / 2 &&
      this.ball.y <= this.player.y + PADDLE_H + BALL_SIZE / 2
    ) {
      const hit = (this.ball.y - (this.player.y + PADDLE_H / 2)) / (PADDLE_H / 2)
      const angle = hit * 60 * (Math.PI / 180)
      const spd = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2) * 1.03
      this.ball.vx = Math.abs(spd * Math.cos(angle))
      this.ball.vy = spd * Math.sin(angle)
      this.ball.x = playerX + BALL_SIZE / 2
    }

    const aiX = w - MARGIN - PADDLE_W
    if (
      this.ball.vx > 0 &&
      this.ball.x + BALL_SIZE / 2 >= aiX &&
      this.ball.x + BALL_SIZE / 2 <= w - MARGIN &&
      this.ball.y >= this.ai.y - BALL_SIZE / 2 &&
      this.ball.y <= this.ai.y + PADDLE_H + BALL_SIZE / 2
    ) {
      const hit = (this.ball.y - (this.ai.y + PADDLE_H / 2)) / (PADDLE_H / 2)
      const angle = hit * 60 * (Math.PI / 180)
      const spd = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2) * 1.03
      this.ball.vx = -Math.abs(spd * Math.cos(angle))
      this.ball.vy = spd * Math.sin(angle)
      this.ball.x = aiX - BALL_SIZE / 2
    }

    if (this.ball.x < 0) {
      this.score.ai++
      this.config.onScore?.(this.score.player)
      if (this.score.ai >= WIN_SCORE) {
        this.endMatch()
        return
      }
      this.reset(-1)
    } else if (this.ball.x > w) {
      this.score.player++
      this.config.onScore?.(this.score.player)
      if (this.score.player >= WIN_SCORE) {
        this.endMatch()
        return
      }
      this.reset(1)
    }
  }

  private endMatch() {
    this.setState('gameover')
    this.loop.stop()
    this.input.shouldPreventScroll = false
    this.config.onGameOver?.(this.score.player)
  }

  protected render() {
    const { ctx, theme } = this
    const w = this.width
    const h = this.height

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    ctx.setLineDash([6, 6])
    ctx.strokeStyle = theme.primary + '33'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(w / 2, 0)
    ctx.lineTo(w / 2, h)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = theme.primary
    ctx.fillRect(MARGIN, this.player.y, PADDLE_W, PADDLE_H)
    ctx.fillStyle = theme.accent
    ctx.fillRect(w - MARGIN - PADDLE_W, this.ai.y, PADDLE_W, PADDLE_H)

    ctx.fillStyle = theme.primary
    ctx.fillRect(this.ball.x - BALL_SIZE / 2, this.ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE)

    ctx.font = 'bold 20px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = theme.text
    ctx.fillText(`${this.score.player}`, w / 4, 28)
    ctx.fillStyle = theme.accent
    ctx.fillText(`${this.score.ai}`, (w * 3) / 4, 28)

    ctx.font = '10px monospace'
    ctx.fillStyle = theme.text + '55'
    ctx.fillText('YOU', MARGIN * 2 + PADDLE_W, h - 8)
    ctx.textAlign = 'right'
    ctx.fillText('AI', w - MARGIN * 2 - PADDLE_W, h - 8)

    if (this.pointerY === null) {
      ctx.textAlign = 'center'
      ctx.fillStyle = theme.text + '33'
      ctx.fillText('move mouse / drag or ↑ ↓', w / 2, h - 8)
    }
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
      ctx.fillText(this.labels.tapServe, w / 2, h - 22)
      ctx.textAlign = 'left'
    }

    if (this.state === 'gameover') {
      const winner = this.score.player > this.score.ai ? 'YOU WIN' : 'AI WINS'
      this.renderGameOver(`${winner}  ${this.score.player}–${this.score.ai}`)
    }
  }

  getScore() {
    return this.score.player
  }

  destroy() {
    super.destroy()
    this.input.shouldPreventScroll = false
    this.input.destroy()
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave)
  }
}

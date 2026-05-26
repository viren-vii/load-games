import { BaseEngine, InputManager } from '@load-games/core'
import type { GameConfig } from '@load-games/core'

// Visual dims tuned at REF=320 and scaled by min(w,h)/REF so paddles, ball,
// and margins stay sensible on small canvases. Player + AI speed scale by
// height/REF so reaction window is the same at any size.
const REF = 320
const PADDLE_W_REF = 10
const PADDLE_H_REF = 55
const BALL_SIZE_REF = 8
const MARGIN_REF = 12
const PLAYER_SPEED_REF = 320
const AI_BASE_SPEED_REF = 140
const AI_SPEED_PER_LEVEL_REF = 12
const BALL_BASE_SPEED_REF = 180
const BALL_SPEED_PER_LEVEL_REF = 25
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

  private get scale() {
    return Math.min(this.width, this.height) / REF
  }
  private get paddleW() {
    return PADDLE_W_REF * this.scale
  }
  private get paddleH() {
    return PADDLE_H_REF * this.scale
  }
  private get ballSize() {
    return BALL_SIZE_REF * this.scale
  }
  private get margin() {
    return MARGIN_REF * this.scale
  }
  private get playerSpeed() {
    return PLAYER_SPEED_REF * (this.height / REF)
  }
  private get aiSpeed() {
    return (AI_BASE_SPEED_REF + this.clampedSpeed * AI_SPEED_PER_LEVEL_REF) * (this.height / REF)
  }
  private get ballSpeed() {
    return (BALL_BASE_SPEED_REF + (this.clampedSpeed - 1) * BALL_SPEED_PER_LEVEL_REF) * (this.width / REF)
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
    const paddleH = this.paddleH
    this.player.y = h / 2 - paddleH / 2
    this.ai.y = h / 2 - paddleH / 2
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
    const paddleH = this.paddleH
    const paddleW = this.paddleW
    const ballSize = this.ballSize
    const margin = this.margin

    if (this.pointerY !== null) {
      this.player.y = Math.max(0, Math.min(h - paddleH, this.pointerY - paddleH / 2))
    } else {
      if (this.input.isDown('arrowUp')) this.player.y = Math.max(0, this.player.y - this.playerSpeed * dtSec)
      if (this.input.isDown('arrowDown'))
        this.player.y = Math.min(h - paddleH, this.player.y + this.playerSpeed * dtSec)
    }

    // While serving, paddle responds but ball is held at center. Tap fires serve().
    if (this.serving) {
      this.ball.x = w / 2
      this.ball.y = h / 2
      return
    }

    const aiCenter = this.ai.y + paddleH / 2
    const aiSpeed = this.aiSpeed * dtSec
    if (aiCenter < this.ball.y - 4) this.ai.y = Math.min(h - paddleH, this.ai.y + aiSpeed)
    else if (aiCenter > this.ball.y + 4) this.ai.y = Math.max(0, this.ai.y - aiSpeed)

    this.ball.x += this.ball.vx * dtSec
    this.ball.y += this.ball.vy * dtSec

    if (this.ball.y < ballSize / 2) {
      this.ball.y = ballSize / 2
      this.ball.vy = Math.abs(this.ball.vy)
    }
    if (this.ball.y > h - ballSize / 2) {
      this.ball.y = h - ballSize / 2
      this.ball.vy = -Math.abs(this.ball.vy)
    }

    const playerX = margin + paddleW
    if (
      this.ball.vx < 0 &&
      this.ball.x - ballSize / 2 <= playerX &&
      this.ball.x - ballSize / 2 >= margin &&
      this.ball.y >= this.player.y - ballSize / 2 &&
      this.ball.y <= this.player.y + paddleH + ballSize / 2
    ) {
      const hit = (this.ball.y - (this.player.y + paddleH / 2)) / (paddleH / 2)
      const angle = hit * 60 * (Math.PI / 180)
      const spd = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2) * 1.03
      this.ball.vx = Math.abs(spd * Math.cos(angle))
      this.ball.vy = spd * Math.sin(angle)
      this.ball.x = playerX + ballSize / 2
    }

    const aiX = w - margin - paddleW
    if (
      this.ball.vx > 0 &&
      this.ball.x + ballSize / 2 >= aiX &&
      this.ball.x + ballSize / 2 <= w - margin &&
      this.ball.y >= this.ai.y - ballSize / 2 &&
      this.ball.y <= this.ai.y + paddleH + ballSize / 2
    ) {
      const hit = (this.ball.y - (this.ai.y + paddleH / 2)) / (paddleH / 2)
      const angle = hit * 60 * (Math.PI / 180)
      const spd = Math.sqrt(this.ball.vx ** 2 + this.ball.vy ** 2) * 1.03
      this.ball.vx = -Math.abs(spd * Math.cos(angle))
      this.ball.vy = spd * Math.sin(angle)
      this.ball.x = aiX - ballSize / 2
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
    const paddleH = this.paddleH
    const paddleW = this.paddleW
    const ballSize = this.ballSize
    const margin = this.margin
    const scoreFont = Math.max(12, Math.round(20 * this.scale))
    const hintFont = Math.max(8, Math.round(10 * this.scale))
    const serveFont = Math.max(8, Math.round(11 * this.scale))

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    ctx.setLineDash([6 * this.scale, 6 * this.scale])
    ctx.strokeStyle = theme.primary + '33'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(w / 2, 0)
    ctx.lineTo(w / 2, h)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = theme.primary
    ctx.fillRect(margin, this.player.y, paddleW, paddleH)
    ctx.fillStyle = theme.accent
    ctx.fillRect(w - margin - paddleW, this.ai.y, paddleW, paddleH)

    ctx.fillStyle = theme.primary
    ctx.fillRect(this.ball.x - ballSize / 2, this.ball.y - ballSize / 2, ballSize, ballSize)

    ctx.font = `bold ${scoreFont}px monospace`
    ctx.textAlign = 'center'
    ctx.fillStyle = theme.text
    ctx.fillText(`${this.score.player}`, w / 4, scoreFont + 8)
    ctx.fillStyle = theme.accent
    ctx.fillText(`${this.score.ai}`, (w * 3) / 4, scoreFont + 8)

    ctx.font = `${hintFont}px monospace`
    ctx.fillStyle = theme.text + '55'
    ctx.fillText('YOU', margin * 2 + paddleW, h - 8)
    ctx.textAlign = 'right'
    ctx.fillText('AI', w - margin * 2 - paddleW, h - 8)

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
      ctx.font = `${serveFont}px monospace`
      ctx.fillText(this.labels.tapServe, w / 2, h - 22 * this.scale)
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

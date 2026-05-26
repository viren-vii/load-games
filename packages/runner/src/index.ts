import { BaseEngine, InputManager } from '@load-games/core'
import type { GameConfig } from '@load-games/core'

// Visual dims tuned at REF=320 and scaled by min(w,h)/REF. Horizontal speed
// already scaled by width/REF. Gravity / jump velocity now scale by height/REF
// so the jump arc reaches the same proportion of canvas height at any size.
const REF = 320
const GRAVITY_REF = 2200
const JUMP_VEL_REF = -680
const PLAYER_W_REF = 20
const PLAYER_H_REF = 28
const GROUND_H_REF = 32
const PLAYER_X_REF = 60
const BASE_SPEED_REF = 200
const SPEED_PER_LEVEL_REF = 25

interface Obstacle {
  x: number
  w: number
  h: number
}

export class RunnerEngine extends BaseEngine {
  protected readonly gameName = 'Runner'
  protected readonly controlHints = ['Space / Tap / Click — jump', 'Dodge obstacles. Speed increases over time.']

  private playerY = 0
  private playerVel = 0
  private onGround = false
  private obstacles: Obstacle[] = []
  private score = 0
  private lastEmittedScore = 0
  private elapsed = 0
  private spawnTimer = 0
  private speed = 0
  private readonly input: InputManager

  private get scale() {
    return Math.min(this.width, this.height) / REF
  }
  private get heightScale() {
    return this.height / REF
  }
  private get widthScale() {
    return this.width / REF
  }
  private get playerW() {
    return PLAYER_W_REF * this.scale
  }
  private get playerH() {
    return PLAYER_H_REF * this.scale
  }
  private get groundH() {
    return GROUND_H_REF * this.scale
  }
  private get playerX() {
    return PLAYER_X_REF * this.widthScale
  }
  private get gravity() {
    return GRAVITY_REF * this.heightScale
  }
  private get jumpVel() {
    return JUMP_VEL_REF * this.heightScale
  }
  private get groundY() {
    return this.height - this.groundH
  }
  private get baseSpeed() {
    // Scale horizontal velocity by canvas width so player gets the same reaction
    // window at any size. Reference: 320px wide → 200 px/s. At 160 → 100 px/s.
    return (BASE_SPEED_REF + (this.clampedSpeed - 1) * SPEED_PER_LEVEL_REF) * this.widthScale
  }

  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    super(canvas, config)
    this.input = new InputManager(canvas)
    this.input.on('tap', () => this.jump())
    this.input.on('arrowUp', () => this.jump())
    this.reset()
  }

  private reset() {
    this.playerY = this.groundY - this.playerH
    this.playerVel = 0
    this.onGround = true
    this.obstacles = []
    this.score = 0
    this.lastEmittedScore = 0
    this.elapsed = 0
    // 1.5s grace before the first obstacle spawns — player gets to settle in.
    this.spawnTimer = 1500
    this.speed = this.baseSpeed
  }

  private jump() {
    if (this.state === 'idle') {
      this.beginGame()
      if (this.onGround) {
        this.playerVel = this.jumpVel
        this.onGround = false
      }
      return
    }
    if (this.state === 'gameover') {
      this.tryGameOverRestart(() => {
        this.reset()
        this.restartGame()
      })
      return
    }
    if (this.state === 'running' && this.onGround) {
      this.playerVel = this.jumpVel
      this.onGround = false
    }
  }

  protected update(dt: number) {
    if (this.state !== 'running') return
    const dtSec = dt / 1000
    const w = this.width
    const playerW = this.playerW
    const playerH = this.playerH
    const playerX = this.playerX
    const groundY = this.groundY
    const obsHScale = this.scale

    this.elapsed += dt
    this.score = Math.floor(this.elapsed / 100)
    this.speed = this.baseSpeed + Math.floor(this.elapsed / 3000) * 18 * this.widthScale

    this.playerVel += this.gravity * dtSec
    this.playerY += this.playerVel * dtSec

    if (this.playerY >= groundY - playerH) {
      this.playerY = groundY - playerH
      this.playerVel = 0
      this.onGround = true
    }

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      const minGap = Math.max(700, 1400 - this.speed * 2)
      this.spawnTimer = minGap + Math.random() * 600
      const h = (20 + Math.random() * 30) * obsHScale
      this.obstacles.push({ x: w, w: (14 + Math.random() * 12) * obsHScale, h })
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i]!
      obs.x -= this.speed * dtSec
      if (obs.x + obs.w < 0) {
        this.obstacles.splice(i, 1)
        continue
      }

      const inset = 3 * obsHScale
      const px = playerX + inset
      const py = this.playerY + inset
      const pw = playerW - inset * 2
      const ph = playerH - inset * 2
      const ox = obs.x + 1
      const oy = groundY - obs.h
      const ow = obs.w - 2
      if (px < ox + ow && px + pw > ox && py < oy + obs.h && py + ph > oy) {
        this.setState('gameover')
        this.loop.stop()
        this.config.onGameOver?.(this.score)
        return
      }
    }

    // Score is derived from elapsed time (1 point / 100ms). Many frames between increments.
    // Only fire callback on actual value change to avoid 60× per second React renders.
    if (this.score !== this.lastEmittedScore) {
      this.lastEmittedScore = this.score
      this.config.onScore?.(this.score)
    }
  }

  protected render() {
    const { ctx, theme } = this
    const w = this.width
    const h = this.height
    const groundY = this.groundY
    const groundH = this.groundH
    const playerW = this.playerW
    const playerH = this.playerH
    const playerX = this.playerX
    const eyeSize = Math.max(2, Math.round(4 * this.scale))
    const eyeOffset = Math.max(4, Math.round(7 * this.scale))
    const eyeY = Math.max(3, Math.round(6 * this.scale))
    const hudFont = Math.max(9, Math.round(12 * this.scale))

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = theme.primary + '33'
    ctx.fillRect(0, groundY, w, groundH)
    ctx.fillStyle = theme.primary + '88'
    ctx.fillRect(0, groundY, w, 1)

    ctx.fillStyle = theme.accent
    for (const obs of this.obstacles) ctx.fillRect(obs.x, groundY - obs.h, obs.w, obs.h)

    ctx.fillStyle = theme.primary
    ctx.fillRect(playerX, this.playerY, playerW, playerH)
    ctx.fillStyle = theme.bg
    ctx.fillRect(playerX + playerW - eyeOffset, this.playerY + eyeY, eyeSize, eyeSize)

    ctx.fillStyle = theme.text
    ctx.font = `${hudFont}px monospace`
    ctx.textAlign = 'right'
    ctx.fillText(`${this.score}m`, w - 8, hudFont + 6)
    ctx.textAlign = 'left'

    if (this.state === 'gameover') this.renderGameOver(`${this.score}m`)
  }

  getScore() {
    return this.score
  }

  destroy() {
    super.destroy()
    this.input.destroy()
  }
}

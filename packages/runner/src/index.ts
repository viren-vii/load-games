import { BaseEngine, InputManager } from '@load-games/core'
import type { GameConfig } from '@load-games/core'

const GRAVITY = 2200
const JUMP_VEL = -680
const PLAYER_W = 20
const PLAYER_H = 28
const GROUND_H = 32
const PLAYER_X = 60

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

  private get groundY() {
    return this.height - GROUND_H
  }

  private get baseSpeed() {
    // Scale horizontal velocity by canvas width so player gets the same reaction
    // window at any size. Reference: 320px wide → 200 px/s. At 160 → 100 px/s.
    return (200 + (this.clampedSpeed - 1) * 25) * (this.width / 320)
  }

  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    super(canvas, config)
    this.input = new InputManager(canvas)
    this.input.on('tap', () => this.jump())
    this.input.on('arrowUp', () => this.jump())
    this.reset()
  }

  private reset() {
    this.playerY = this.groundY - PLAYER_H
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
        this.playerVel = JUMP_VEL
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
      this.playerVel = JUMP_VEL
      this.onGround = false
    }
  }

  protected update(dt: number) {
    if (this.state !== 'running') return
    const dtSec = dt / 1000
    const w = this.width

    this.elapsed += dt
    this.score = Math.floor(this.elapsed / 100)
    this.speed = this.baseSpeed + Math.floor(this.elapsed / 3000) * 18

    this.playerVel += GRAVITY * dtSec
    this.playerY += this.playerVel * dtSec

    if (this.playerY >= this.groundY - PLAYER_H) {
      this.playerY = this.groundY - PLAYER_H
      this.playerVel = 0
      this.onGround = true
    }

    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      const minGap = Math.max(700, 1400 - this.speed * 2)
      this.spawnTimer = minGap + Math.random() * 600
      const h = 20 + Math.random() * 30
      this.obstacles.push({ x: w, w: 14 + Math.random() * 12, h })
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i]!
      obs.x -= this.speed * dtSec
      if (obs.x + obs.w < 0) {
        this.obstacles.splice(i, 1)
        continue
      }

      const px = PLAYER_X + 3,
        py = this.playerY + 3,
        pw = PLAYER_W - 6,
        ph = PLAYER_H - 6
      const ox = obs.x + 1,
        oy = this.groundY - obs.h,
        ow = obs.w - 2
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

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = theme.primary + '33'
    ctx.fillRect(0, groundY, w, GROUND_H)
    ctx.fillStyle = theme.primary + '88'
    ctx.fillRect(0, groundY, w, 1)

    ctx.fillStyle = theme.accent
    for (const obs of this.obstacles) ctx.fillRect(obs.x, groundY - obs.h, obs.w, obs.h)

    ctx.fillStyle = theme.primary
    ctx.fillRect(PLAYER_X, this.playerY, PLAYER_W, PLAYER_H)
    ctx.fillStyle = theme.bg
    ctx.fillRect(PLAYER_X + PLAYER_W - 7, this.playerY + 6, 4, 4)

    ctx.fillStyle = theme.text
    ctx.font = '12px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${this.score}m`, w - 8, 20)
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

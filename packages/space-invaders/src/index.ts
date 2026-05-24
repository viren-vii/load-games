import { BaseEngine, InputManager } from '@load-games/core'
import type { GameConfig } from '@load-games/core'

const INVADER_COLS = 8
const INVADER_ROWS = 4
const INV_W = 22
const INV_H = 14
const INV_PAD_X = 10
const INV_PAD_Y = 8
const PLAYER_W = 28
const PLAYER_H = 12
const BULLET_W = 3
const BULLET_H = 10
const PLAYER_SPEED = 240

interface Invader { x: number; y: number; alive: boolean; row: number }
interface Bullet { x: number; y: number; dir: 1 | -1 }

export class SpaceInvadersEngine extends BaseEngine {
  protected readonly gameName = 'Space Invaders'
  protected readonly controlHints = [
    'Arrow keys ← → — move ship',
    'Space / Tap — shoot',
    'Shoot all invaders to advance',
  ]

  private playerX = 0
  private invaders: Invader[] = []
  private bullets: Bullet[] = []
  private invDir = 1
  private score = 0
  private wave = 1
  private shootCooldown = 0
  private invMoveTimer = 0
  private enemyShootTimer = 0
  private readonly input: InputManager


  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    super(canvas, config)
    this.input = new InputManager(canvas)
    this.input.on('tap', () => {
      if (this.state === 'idle') { this.beginGame(); return }
      if (this.state === 'gameover') {
        this.tryGameOverRestart(() => { this.wave = 1; this.score = 0; this.init(); this.restartGame() })
        return
      }
      this.shoot()
    })
    this.input.on('arrowLeft',  () => { if (this.state === 'idle') this.beginGame() })
    this.input.on('arrowRight', () => { if (this.state === 'idle') this.beginGame() })
    this.init()
  }

  private init() {
    const w = this.width
    const totalW = INVADER_COLS * (INV_W + INV_PAD_X) - INV_PAD_X
    const startX = (w - totalW) / 2
    this.invaders = []
    for (let r = 0; r < INVADER_ROWS; r++) {
      for (let c = 0; c < INVADER_COLS; c++) {
        this.invaders.push({ x: startX + c * (INV_W + INV_PAD_X), y: 36 + r * (INV_H + INV_PAD_Y), alive: true, row: r })
      }
    }
    this.playerX = this.width / 2 - PLAYER_W / 2
    this.bullets = []
    this.invDir = 1
    this.invMoveTimer = 0
    this.enemyShootTimer = 1000
    this.shootCooldown = 0
  }

  private shoot() {
    if (this.shootCooldown > 0) return
    this.bullets.push({ x: this.playerX + PLAYER_W / 2, y: this.height - PLAYER_H - 16, dir: -1 })
    this.shootCooldown = 350
  }

  private enemyShoot(alive: Invader[]) {
    if (!alive.length) return
    const shooter = alive[Math.floor(Math.random() * alive.length)]!
    this.bullets.push({ x: shooter.x + INV_W / 2, y: shooter.y + INV_H, dir: 1 })
  }

  protected update(dt: number) {
    if (this.state !== 'running') return
    this.input.shouldPreventScroll = true
    const dtSec = dt / 1000
    const h = this.height
    const alive = this.invaders.filter(i => i.alive)

    if (this.input.isDown('arrowLeft'))  this.playerX = Math.max(0, this.playerX - PLAYER_SPEED * dtSec)
    if (this.input.isDown('arrowRight')) this.playerX = Math.min(this.width - PLAYER_W, this.playerX + PLAYER_SPEED * dtSec)

    this.shootCooldown = Math.max(0, this.shootCooldown - dt)
    this.enemyShootTimer -= dt
    if (this.enemyShootTimer <= 0) {
      this.enemyShootTimer = Math.max(600, 2200 - this.clampedSpeed * 150)
      this.enemyShoot(alive)
    }

    const moveInterval = Math.max(80, (800 - (this.clampedSpeed - 1) * 60) - (INVADER_COLS * INVADER_ROWS - alive.length) * 12)
    this.invMoveTimer += dt
    if (this.invMoveTimer >= moveInterval) {
      this.invMoveTimer = 0
      const stepX = 8 * this.invDir
      const hitEdge = alive.some(inv => inv.x + stepX < 0 || inv.x + INV_W + stepX > this.width)
      if (hitEdge) {
        this.invDir *= -1
        for (const inv of this.invaders) inv.y += INV_H + 4
      } else {
        for (const inv of this.invaders) inv.x += stepX
      }
      if (alive.some(inv => inv.y + INV_H >= h - PLAYER_H - 20)) { this.endGame(); return }
    }

    const BULLET_SPEED = 280
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!
      b.y += b.dir * BULLET_SPEED * dtSec
      if (b.y < 0 || b.y > h) { this.bullets.splice(i, 1); continue }

      if (b.dir === -1) {
        let hit = false
        for (const inv of this.invaders) {
          if (!inv.alive) continue
          if (b.x >= inv.x && b.x <= inv.x + INV_W && b.y <= inv.y + INV_H && b.y >= inv.y) {
            inv.alive = false; this.score++; this.config.onScore?.(this.score); hit = true; break
          }
        }
        if (hit) { this.bullets.splice(i, 1); continue }
      }

      if (b.dir === 1) {
        const py = h - PLAYER_H - 8
        if (b.x >= this.playerX && b.x <= this.playerX + PLAYER_W && b.y >= py && b.y <= py + PLAYER_H) {
          this.endGame(); return
        }
      }
    }

    if (!this.invaders.some(i => i.alive)) { this.wave++; this.init() }
  }

  private endGame() {
    this.setState('gameover')
    this.loop.stop()
    this.input.shouldPreventScroll = false
    this.config.onGameOver?.(this.score)
  }

  protected render() {
    const { ctx, theme } = this
    const w = this.width
    const h = this.height

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    for (const inv of this.invaders) {
      if (!inv.alive) continue
      ctx.fillStyle = inv.row % 2 === 0 ? theme.accent : theme.primary
      ctx.fillRect(inv.x + 3, inv.y + 3, INV_W - 6, INV_H - 6)
      ctx.fillRect(inv.x + 4, inv.y, 3, 4)
      ctx.fillRect(inv.x + INV_W - 7, inv.y, 3, 4)
      ctx.fillRect(inv.x, inv.y + INV_H - 5, 4, 3)
      ctx.fillRect(inv.x + INV_W - 4, inv.y + INV_H - 5, 4, 3)
    }

    const py = h - PLAYER_H - 8
    ctx.fillStyle = theme.primary
    ctx.fillRect(this.playerX + 4, py, PLAYER_W - 8, PLAYER_H - 4)
    ctx.fillRect(this.playerX, py + 4, PLAYER_W, PLAYER_H - 4)
    ctx.fillRect(this.playerX + PLAYER_W / 2 - 2, py - 5, 4, 6)

    for (const b of this.bullets) {
      ctx.fillStyle = b.dir === -1 ? theme.accent : '#ef4444'
      ctx.fillRect(b.x - BULLET_W / 2, b.y, BULLET_W, BULLET_H * b.dir)
    }

    ctx.fillStyle = theme.text
    ctx.font = '12px monospace'
    ctx.fillText(`${this.score}`, 8, 20)
    ctx.textAlign = 'center'
    ctx.fillText(`WAVE ${this.wave}`, w / 2, 20)
    ctx.textAlign = 'left'

    if (this.state === 'gameover') this.renderGameOver(`Score: ${this.score}`)
  }

  getScore() { return this.score }

  destroy() {
    super.destroy()
    this.input.shouldPreventScroll = false
    this.input.destroy()
  }
}

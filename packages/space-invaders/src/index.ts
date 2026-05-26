import { BaseEngine, InputManager } from '@load-games/core'
import type { GameConfig } from '@load-games/core'

// All visual dims tuned at REF=320 and scaled by min(w,h)/REF so invaders,
// ship, and bullets stay proportional on small canvases. Player + bullet
// speed scale by width/REF so the reaction window is the same at any size.
const REF = 320
const INVADER_COLS = 8
const INVADER_ROWS = 4
const INV_W_REF = 22
const INV_H_REF = 14
const INV_PAD_X_REF = 10
const INV_PAD_Y_REF = 8
const INV_TOP_REF = 36
const INV_STEP_REF = 8
const PLAYER_W_REF = 28
const PLAYER_H_REF = 12
const PLAYER_BOTTOM_REF = 8
const BULLET_W_REF = 3
const BULLET_H_REF = 10
const PLAYER_SPEED_REF = 240
const BULLET_SPEED_REF = 280

interface Invader {
  x: number
  y: number
  alive: boolean
  row: number
}
interface Bullet {
  x: number
  y: number
  dir: 1 | -1
}

export class SpaceInvadersEngine extends BaseEngine {
  protected readonly gameName = 'Space Invaders'
  protected readonly controlHints = [
    'Arrow keys ← → or drag — move ship',
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
  private pointerX: number | null = null

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    this.pointerX = e.clientX - rect.left
    if (this.state === 'idle') this.beginGame()
  }
  private onPointerLeave = () => {
    this.pointerX = null
  }

  private get scale() {
    return Math.min(this.width, this.height) / REF
  }
  private get widthScale() {
    return this.width / REF
  }
  private get invW() {
    return INV_W_REF * this.scale
  }
  private get invH() {
    return INV_H_REF * this.scale
  }
  private get invPadY() {
    return INV_PAD_Y_REF * this.scale
  }
  private get invTop() {
    return INV_TOP_REF * this.scale
  }
  private get invStep() {
    return INV_STEP_REF * this.widthScale
  }
  private get playerW() {
    return PLAYER_W_REF * this.scale
  }
  private get playerH() {
    return PLAYER_H_REF * this.scale
  }
  private get playerBottom() {
    return PLAYER_BOTTOM_REF * this.scale
  }
  private get bulletW() {
    return BULLET_W_REF * this.scale
  }
  private get bulletH() {
    return BULLET_H_REF * this.scale
  }
  private get playerSpeed() {
    return PLAYER_SPEED_REF * this.widthScale
  }
  private get bulletSpeed() {
    return BULLET_SPEED_REF * (this.height / REF)
  }

  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    super(canvas, config)
    this.input = new InputManager(canvas)
    this.input.on('tap', () => {
      if (this.state === 'idle') {
        this.beginGame()
        return
      }
      if (this.state === 'gameover') {
        this.tryGameOverRestart(() => {
          this.wave = 1
          this.score = 0
          this.init()
          this.restartGame()
        })
        return
      }
      this.shoot()
    })
    this.input.on('arrowLeft', () => {
      if (this.state === 'idle') this.beginGame()
    })
    this.input.on('arrowRight', () => {
      if (this.state === 'idle') this.beginGame()
    })
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerleave', this.onPointerLeave)
    this.init()
  }

  private init() {
    const w = this.width
    const invW = this.invW
    const invH = this.invH
    const invPadY = this.invPadY
    // Adaptive horizontal spacing: at the reference 320px width the layout uses
    // INV_PAD_X (10px scaled). On narrower canvases we squeeze the gaps (down to
    // 2px minimum) so all 8 columns always fit. Beyond 320 the spacing stays at the reference value.
    const invPadXNatural = INV_PAD_X_REF * this.scale
    const naturalTotalW = INVADER_COLS * (invW + invPadXNatural) - invPadXNatural
    const minTotalW = INVADER_COLS * (invW + 2) - 2
    const totalW = Math.min(naturalTotalW, Math.max(minTotalW, w - 12))
    const padX = (totalW - INVADER_COLS * invW + invW) / (INVADER_COLS - 1) - invW
    const startX = (w - totalW) / 2
    this.invaders = []
    for (let r = 0; r < INVADER_ROWS; r++) {
      for (let c = 0; c < INVADER_COLS; c++) {
        this.invaders.push({
          x: startX + c * (invW + padX),
          y: this.invTop + r * (invH + invPadY),
          alive: true,
          row: r,
        })
      }
    }
    this.playerX = this.width / 2 - this.playerW / 2
    this.bullets = []
    this.invDir = 1
    this.invMoveTimer = 0
    this.enemyShootTimer = 1000
    this.shootCooldown = 0
  }

  private shoot() {
    if (this.shootCooldown > 0) return
    this.bullets.push({
      x: this.playerX + this.playerW / 2,
      y: this.height - this.playerH - 16 * this.scale,
      dir: -1,
    })
    this.shootCooldown = 350
  }

  private enemyShootRandom() {
    // Reservoir-sample one alive invader in a single pass — no filter allocation.
    let chosen: Invader | null = null
    let aliveCount = 0
    for (const inv of this.invaders) {
      if (!inv.alive) continue
      aliveCount++
      if (Math.random() < 1 / aliveCount) chosen = inv
    }
    if (!chosen) return
    this.bullets.push({ x: chosen.x + this.invW / 2, y: chosen.y + this.invH, dir: 1 })
  }

  protected update(dt: number) {
    if (this.state !== 'running') return
    this.input.shouldPreventScroll = true
    const dtSec = dt / 1000
    const h = this.height
    const invW = this.invW
    const invH = this.invH
    const invPadY = this.invPadY
    const invStep = this.invStep
    const playerW = this.playerW
    const playerH = this.playerH
    const bulletW = this.bulletW
    const bulletH = this.bulletH
    const bulletSpeed = this.bulletSpeed
    const playerSpeed = this.playerSpeed

    if (this.pointerX !== null) {
      // Pointer drag (mouse / touch / pen) directly positions the ship — primary mobile control.
      this.playerX = Math.max(0, Math.min(this.width - playerW, this.pointerX - playerW / 2))
    } else {
      if (this.input.isDown('arrowLeft')) this.playerX = Math.max(0, this.playerX - playerSpeed * dtSec)
      if (this.input.isDown('arrowRight'))
        this.playerX = Math.min(this.width - playerW, this.playerX + playerSpeed * dtSec)
    }

    this.shootCooldown = Math.max(0, this.shootCooldown - dt)
    this.enemyShootTimer -= dt
    if (this.enemyShootTimer <= 0) {
      this.enemyShootTimer = Math.max(600, 2200 - this.clampedSpeed * 150)
      this.enemyShootRandom()
    }

    // Single-pass scan: count alive, find edge violation, find ship-reach. No allocations.
    let aliveCount = 0
    let hitEdgeLeft = false
    let hitEdgeRight = false
    let shipReached = false
    const stepXPreview = invStep * this.invDir
    const reachY = h - playerH - 20 * this.scale
    for (const inv of this.invaders) {
      if (!inv.alive) continue
      aliveCount++
      if (inv.x + stepXPreview < 0) hitEdgeLeft = true
      if (inv.x + invW + stepXPreview > this.width) hitEdgeRight = true
      if (inv.y + invH >= reachY) shipReached = true
    }
    const hitEdge = hitEdgeLeft || hitEdgeRight

    const moveInterval = Math.max(
      80,
      800 - (this.clampedSpeed - 1) * 60 - (INVADER_COLS * INVADER_ROWS - aliveCount) * 12,
    )
    this.invMoveTimer += dt
    if (this.invMoveTimer >= moveInterval) {
      this.invMoveTimer = 0
      const stepX = invStep * this.invDir
      if (hitEdge) {
        this.invDir *= -1
        for (const inv of this.invaders) inv.y += invH + invPadY / 2
      } else {
        for (const inv of this.invaders) inv.x += stepX
      }
      if (shipReached) {
        this.endGame()
        return
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i]!
      b.y += b.dir * bulletSpeed * dtSec
      if (b.y < 0 || b.y > h) {
        this.bullets.splice(i, 1)
        continue
      }

      if (b.dir === -1) {
        let hit = false
        for (const inv of this.invaders) {
          if (!inv.alive) continue
          if (b.x >= inv.x && b.x <= inv.x + invW && b.y <= inv.y + invH && b.y >= inv.y) {
            inv.alive = false
            this.score++
            this.config.onScore?.(this.score)
            hit = true
            break
          }
        }
        if (hit) {
          this.bullets.splice(i, 1)
          continue
        }
      }

      if (b.dir === 1) {
        const py = h - playerH - this.playerBottom
        if (b.x >= this.playerX && b.x <= this.playerX + playerW && b.y >= py && b.y <= py + playerH) {
          this.endGame()
          return
        }
      }
    }

    // ignore bulletW/bulletH in collision; rendered separately
    void bulletW
    void bulletH

    if (aliveCount === 0) {
      this.wave++
      this.init()
    }
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
    const invW = this.invW
    const invH = this.invH
    const playerW = this.playerW
    const playerH = this.playerH
    const bulletW = this.bulletW
    const bulletH = this.bulletH
    const s = this.scale
    const hudFont = Math.max(9, Math.round(12 * s))

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    const invInset = Math.max(1, 3 * s)
    const invEyeW = Math.max(2, 3 * s)
    const invEyeH = Math.max(2, 4 * s)
    const invLegW = Math.max(2, 4 * s)
    const invLegH = Math.max(2, 3 * s)
    const invEyeOffset = Math.max(3, 4 * s)
    const invFootGap = Math.max(3, 5 * s)
    for (const inv of this.invaders) {
      if (!inv.alive) continue
      ctx.fillStyle = inv.row % 2 === 0 ? theme.accent : theme.primary
      ctx.fillRect(inv.x + invInset, inv.y + invInset, invW - invInset * 2, invH - invInset * 2)
      ctx.fillRect(inv.x + invEyeOffset, inv.y, invEyeW, invEyeH)
      ctx.fillRect(inv.x + invW - invEyeOffset - invEyeW, inv.y, invEyeW, invEyeH)
      ctx.fillRect(inv.x, inv.y + invH - invFootGap, invLegW, invLegH)
      ctx.fillRect(inv.x + invW - invLegW, inv.y + invH - invFootGap, invLegW, invLegH)
    }

    const py = h - playerH - this.playerBottom
    const shipInsetX = Math.max(2, 4 * s)
    const shipInsetY = Math.max(2, 4 * s)
    const cannonW = Math.max(2, 4 * s)
    const cannonH = Math.max(3, 6 * s)
    ctx.fillStyle = theme.primary
    ctx.fillRect(this.playerX + shipInsetX, py, playerW - shipInsetX * 2, playerH - shipInsetY)
    ctx.fillRect(this.playerX, py + shipInsetY, playerW, playerH - shipInsetY)
    ctx.fillRect(this.playerX + playerW / 2 - cannonW / 2, py - cannonH + 1, cannonW, cannonH)

    for (const b of this.bullets) {
      ctx.fillStyle = b.dir === -1 ? theme.accent : '#ef4444'
      ctx.fillRect(b.x - bulletW / 2, b.y, bulletW, bulletH * b.dir)
    }

    ctx.fillStyle = theme.text
    ctx.font = `${hudFont}px monospace`
    ctx.fillText(`${this.score}`, 8, hudFont + 6)
    ctx.textAlign = 'center'
    ctx.fillText(`WAVE ${this.wave}`, w / 2, hudFont + 6)
    ctx.textAlign = 'left'

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
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave)
  }
}

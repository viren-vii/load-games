import { BaseEngine, InputManager } from '@load-games/core'
import type { GameConfig, Point } from '@load-games/core'

type Direction = 'up' | 'down' | 'left' | 'right'

// GRID is computed per-instance from canvas dims so small canvases stay playable.
// Target ~16 cells across; clamped to [10, 24]px so cells stay visible but not chunky.
function computeGridPx(canvasW: number, canvasH: number) {
  const target = Math.floor(Math.min(canvasW, canvasH) / 16)
  return Math.max(10, Math.min(24, target))
}

function randomCell(cols: number, rows: number): Point {
  return { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) }
}

function pointsEqual(a: Point, b: Point) { return a.x === b.x && a.y === b.y }

export class SnakeEngine extends BaseEngine {
  protected readonly gameName = 'Snake'
  protected readonly controlHints = [
    'Arrow keys / WASD — change direction',
    'Swipe on mobile',
  ]

  private snake: Point[] = []
  private food: Point = { x: 0, y: 0 }
  private direction: Direction = 'right'
  private nextDirection: Direction = 'right'
  private score = 0
  private elapsed = 0
  private readonly input: InputManager
  private cols = 0
  private rows = 0
  private grid = 20

  private get stepMs() {
    return 600 - (this.clampedSpeed - 1) * 55
  }

  constructor(canvas: HTMLCanvasElement, config: GameConfig = {}) {
    super(canvas, config)
    this.grid = computeGridPx(this.width, this.height)
    this.cols = Math.floor(this.width / this.grid)
    this.rows = Math.floor(this.height / this.grid)
    this.input = new InputManager(canvas)
    this.bindInput()
    this.reset()
  }

  private bindInput() {
    const startOrTurn = (dir?: Direction) => {
      if (this.state === 'idle') { this.beginGame(); if (dir) this.nextDirection = dir; return }
      if (dir) {
        if (dir === 'up' && this.direction !== 'down') this.nextDirection = 'up'
        if (dir === 'down' && this.direction !== 'up') this.nextDirection = 'down'
        if (dir === 'left' && this.direction !== 'right') this.nextDirection = 'left'
        if (dir === 'right' && this.direction !== 'left') this.nextDirection = 'right'
      }
    }

    this.input.on('arrowUp',    () => startOrTurn('up'))
    this.input.on('arrowDown',  () => startOrTurn('down'))
    this.input.on('arrowLeft',  () => startOrTurn('left'))
    this.input.on('arrowRight', () => startOrTurn('right'))
    this.input.on('tap', () => {
      if (this.state === 'idle') { this.beginGame(); return }
      if (this.state === 'gameover') { this.tryGameOverRestart(() => { this.reset(); this.restartGame() }) }
    })
  }

  private reset() {
    const midX = Math.floor(this.cols / 2)
    const midY = Math.floor(this.rows / 2)
    this.snake = [{ x: midX, y: midY }, { x: midX - 1, y: midY }, { x: midX - 2, y: midY }]
    this.direction = 'right'
    this.nextDirection = 'right'
    this.score = 0
    this.elapsed = 0
    this.spawnFood()
  }

  private spawnFood() {
    let cell: Point
    do { cell = randomCell(this.cols, this.rows) } while (this.snake.some(s => pointsEqual(s, cell)))
    this.food = cell
  }

  protected update(dt: number) {
    if (this.state !== 'running') return
    this.input.shouldPreventScroll = true
    this.elapsed += dt
    if (this.elapsed < this.stepMs) return
    this.elapsed = 0

    this.direction = this.nextDirection
    const head = this.snake[0]!
    const next: Point = {
      x: (head.x + (this.direction === 'right' ? 1 : this.direction === 'left' ? -1 : 0) + this.cols) % this.cols,
      y: (head.y + (this.direction === 'down' ? 1 : this.direction === 'up' ? -1 : 0) + this.rows) % this.rows,
    }

    if (this.snake.some(s => pointsEqual(s, next))) {
      this.setState('gameover')
      this.loop.stop()
      this.input.shouldPreventScroll = false
      this.config.onGameOver?.(this.score)
      return
    }

    this.snake.unshift(next)
    if (pointsEqual(next, this.food)) {
      this.score++
      this.config.onScore?.(this.score)
      this.spawnFood()
    } else {
      this.snake.pop()
    }
  }

  protected render() {
    const { ctx, theme } = this
    const w = this.width
    const h = this.height

    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, w, h)

    const g = this.grid
    ctx.fillStyle = theme.accent
    ctx.fillRect(this.food.x * g + 2, this.food.y * g + 2, g - 4, g - 4)

    this.snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? theme.primary : theme.accent
      ctx.fillRect(seg.x * g + 1, seg.y * g + 1, g - 2, g - 2)
    })

    ctx.fillStyle = theme.text
    ctx.font = '12px monospace'
    ctx.fillText(`${this.score}`, 8, 20)

    if (this.state === 'gameover') this.renderGameOver(`Score: ${this.score}`)
  }

  getScore() { return this.score }

  destroy() {
    super.destroy()
    this.input.shouldPreventScroll = false
    this.input.destroy()
  }
}

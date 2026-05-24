export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface GameTheme {
  bg: string
  primary: string
  accent: string
  text: string
}

export interface GameConfig {
  width?: number
  height?: number
  speed?: number
  theme?: Partial<GameTheme>
  onScore?: (score: number) => void
  onGameOver?: (score: number) => void
}

export const DEFAULT_THEME: GameTheme = {
  bg: '#0a0a0a',
  primary: '#ffffff',
  accent: '#22c55e',
  text: '#ffffff',
}

export const DEFAULT_CONFIG = {
  speed: 5,
} satisfies Partial<GameConfig>

export type GameState = 'idle' | 'running' | 'paused' | 'gameover'

export interface GameEngine {
  start(): void
  pause(): void
  resume(): void
  destroy(): void
  readonly state: GameState
}

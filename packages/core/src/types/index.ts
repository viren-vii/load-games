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
  /** Fires when the in-game score changes. */
  onScore?: (score: number) => void
  /** Fires once per life when the player dies / fails. */
  onGameOver?: (score: number) => void
  /**
   * Fires once when the host signals that the underlying work is done
   * (i.e. when `<GameCanvas ready/>` flips true, or `engine.signalReady()` is called).
   * Useful for analytics ("user was still playing when content arrived").
   */
  onReady?: () => void
  /**
   * Fires when the player chooses to exit a ready game (taps the "tap to continue"
   * overlay after a game-over), or when the host calls `engine.dismiss()` directly.
   * The host should unmount the canvas in response.
   */
  onDismiss?: (score: number) => void
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

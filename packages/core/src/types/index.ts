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

/** Why `onDismiss` fired. Lets the host distinguish player choice from host-driven exit. */
export type DismissReason =
  | 'user'        // Player tapped the in-canvas return button while playing.
  | 'gameover'    // Player game-over'd while ready was set; tapped "continue".
  | 'idle-ready'  // Player hit the idle screen while ready was set; tapped to skip.
  | 'forced'      // Host called engine.dismiss() directly (timeout, content-now, etc).

/** Text shown by the engine. Override any subset to localise or rebrand. */
export interface GameLabels {
  /** Idle screen, not-ready: "tap / press any key to start" */
  idleStart: string
  /** Idle screen, ready: "content ready · tap to continue" */
  idleReady: string
  /** Game-over banner: "GAME OVER" */
  gameOver: string
  /** Game-over prompt, not-ready: "tap to restart" */
  tapRestart: string
  /** Game-over prompt, ready: "tap to continue →" */
  tapContinue: string
  /** Top-right badge during ready+running: "● READY" (also the return-button label) */
  readyBadge: string
  /** Pong/Breakout pre-serve hint: "tap to serve" */
  tapServe: string
}

export const DEFAULT_LABELS: GameLabels = {
  idleStart: 'tap / press any key to start',
  idleReady: 'content ready · tap to continue',
  gameOver: 'GAME OVER',
  tapRestart: 'tap to restart',
  tapContinue: 'tap to continue →',
  readyBadge: '● READY',
  tapServe: 'tap to serve',
}

export interface GameConfig {
  width?: number
  height?: number
  speed?: number
  theme?: Partial<GameTheme>
  /** Override any of the engine's hardcoded strings. Missing keys fall back to defaults. */
  labels?: Partial<GameLabels>
  /**
   * Disable the in-canvas return button shown top-right during ready+running.
   * When disabled, player must wait for game-over (auto continue prompt) or
   * the host must call `engine.dismiss()` programmatically.
   * @default true (return button shown)
   */
  returnButton?: boolean

  /** Fires when the in-game score changes (de-duplicated against last value). */
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
   * Fires when the game exits. Reason tells you who initiated it:
   * - `user`        — player tapped the return button mid-play
   * - `gameover`    — player died and tapped "continue" (only when ready was set)
   * - `idle-ready`  — player tapped the idle screen while ready was set
   * - `forced`     — host called engine.dismiss() directly
   * The host should unmount the canvas in response.
   */
  onDismiss?: (score: number, reason: DismissReason) => void
  /** Fires when the game is paused (tab hidden, off-screen, or programmatic). */
  onPause?: () => void
  /** Fires when the game resumes from paused. */
  onResume?: () => void
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

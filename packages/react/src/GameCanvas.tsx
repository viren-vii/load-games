'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { BaseEngine, GameConfig, GameState } from '@load-games/core'

export interface GameHandle {
  /** Pause the game (also auto-happens on tab hide / canvas off-screen). */
  pause(): void
  /** Resume from paused. */
  resume(): void
  /** Signal that the host's underlying work is done. Game keeps playing; ready badge appears. */
  signalReady(): void
  /** Force-dismiss now. Fires onDismiss with current score. Use as a fallback timeout. */
  dismiss(): void
  /** Current score (game-defined; pong returns player score). */
  getScore(): number
  getState(): GameState
  isReady(): boolean
}

/** Constructor signature any load-games engine class satisfies. */
export type EngineClass = new (canvas: HTMLCanvasElement, config: GameConfig) => BaseEngine

interface GameCanvasProps extends GameConfig {
  /**
   * The engine class to instantiate. Pass the class itself (not an instance):
   * `<GameCanvas engine={SnakeEngine} />`.
   * Changing this prop remounts the engine. All other config props (width, theme, etc.)
   * are captured on mount — change them by remounting via React `key`.
   */
  engine: EngineClass
  /**
   * Declarative ready signal. When flipped true, calls `engine.signalReady()`.
   * The engine will offer "tap to continue" at the next game-over and fire `onDismiss`.
   */
  ready?: boolean
  className?: string
  style?: React.CSSProperties
}

export const GameCanvas = forwardRef<GameHandle, GameCanvasProps>(function GameCanvas(
  { engine: EngineClass, ready, className, style, ...config },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<BaseEngine | null>(null)

  // Capture latest callbacks/config in a ref so the mount effect doesn't reinit
  // when consumers pass inline arrow callbacks (a common React footgun).
  const configRef = useRef(config)
  configRef.current = config

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new EngineClass(canvas, configRef.current)
    engineRef.current = engine
    engine.start()
    return () => { engineRef.current = null; engine.destroy() }
  }, [EngineClass])

  useEffect(() => {
    if (ready) engineRef.current?.signalReady()
  }, [ready])

  useImperativeHandle(ref, () => ({
    pause: () => engineRef.current?.pause(),
    resume: () => engineRef.current?.resume(),
    signalReady: () => engineRef.current?.signalReady(),
    dismiss: () => engineRef.current?.dismiss(),
    getScore: () => engineRef.current?.getScore() ?? 0,
    getState: () => engineRef.current?.state ?? 'idle',
    isReady: () => engineRef.current?.ready ?? false,
  }), [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ ...CANVAS_BASE_STYLE, ...style }}
      tabIndex={0}
      role="application"
      aria-label="Interactive game loader. Use arrow keys or tap to play."
    />
  )
})

// Mobile / cross-browser hardening:
// - touchAction:none → swipes never scroll/zoom the page; required for snake.
// - userSelect:none + touchCallout:none → no text-selection or iOS context menu on long-press.
// - tapHighlightColor:transparent → no blue flash on every iOS tap.
// - outline:none → no focus ring when canvas receives keyboard focus.
// - maxWidth:100% → canvas shrinks to fit narrow viewports; intrinsic width keeps the layout.
const CANVAS_BASE_STYLE: React.CSSProperties = {
  display: 'block',
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent',
  outline: 'none',
  maxWidth: '100%',
}

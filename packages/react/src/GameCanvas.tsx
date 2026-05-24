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

interface GameCanvasProps extends GameConfig {
  createEngine: (canvas: HTMLCanvasElement, config: GameConfig) => BaseEngine
  /**
   * Declarative ready signal. When flipped true, calls `engine.signalReady()`.
   * The engine will offer "tap to continue" at the next game-over and fire `onDismiss`.
   */
  ready?: boolean
  className?: string
  style?: React.CSSProperties
}

export const GameCanvas = forwardRef<GameHandle, GameCanvasProps>(function GameCanvas(
  { createEngine, ready, className, style, ...config },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<BaseEngine | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = createEngine(canvas, config)
    engineRef.current = engine
    engine.start()
    return () => { engineRef.current = null; engine.destroy() }
    // config intentionally excluded — engine owns its state after mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createEngine])

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
      style={style}
      tabIndex={0}
      role="application"
      aria-label="Interactive game loader. Use arrow keys or tap to play."
    />
  )
})

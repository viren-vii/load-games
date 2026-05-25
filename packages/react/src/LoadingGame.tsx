'use client'

import { forwardRef, useRef, useImperativeHandle } from 'react'
import type { GameConfig } from '@load-games/core'
import { GameCanvas, type EngineClass, type GameHandle } from './GameCanvas.js'

export interface LoadingGameProps extends GameConfig {
  engine: EngineClass
  ready?: boolean
  className?: string
  style?: React.CSSProperties
  /** Show the external "Skip" button next to the canvas. Default: true. */
  skipButton?: boolean
  /** Custom label for the skip button. Default: "Skip". */
  skipLabel?: string
  /** Where to position the skip button relative to the canvas. Default: 'bottom'. */
  skipPosition?: 'top' | 'bottom' | 'right'
  /** Visual style of the wrapper div. */
  wrapperStyle?: React.CSSProperties
  /** Style of the skip button. */
  skipButtonStyle?: React.CSSProperties
}

/**
 * Bundled loading-game UX: canvas + optional external Skip button.
 * Use this when you don't want to compose your own UI around `<GameCanvas/>`.
 * For composition control, use `<GameCanvas/>` directly and render your own button via the ref.
 */
export const LoadingGame = forwardRef<GameHandle, LoadingGameProps>(function LoadingGame(
  { skipButton = true, skipLabel = 'Skip', skipPosition = 'bottom', wrapperStyle, skipButtonStyle, ...gameProps },
  ref,
) {
  const handleRef = useRef<GameHandle>(null)
  useImperativeHandle(ref, () => handleRef.current as GameHandle, [])

  const flexDirection: React.CSSProperties['flexDirection'] =
    skipPosition === 'top' ? 'column-reverse' : skipPosition === 'right' ? 'row' : 'column'

  return (
    <div style={{ display: 'inline-flex', flexDirection, gap: 8, alignItems: 'center', ...wrapperStyle }}>
      <GameCanvas {...gameProps} ref={handleRef} />
      {skipButton && (
        <button
          type="button"
          onClick={() => handleRef.current?.dismiss()}
          style={{
            background: 'transparent',
            border: '1px solid currentColor',
            color: 'inherit',
            padding: '4px 12px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 11,
            borderRadius: 3,
            letterSpacing: 1,
            opacity: 0.7,
            ...skipButtonStyle,
          }}
          aria-label="Skip the game and continue"
        >
          {skipLabel}
        </button>
      )}
    </div>
  )
})

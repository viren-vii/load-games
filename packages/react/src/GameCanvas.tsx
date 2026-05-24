'use client'

import { useEffect, useRef } from 'react'
import type { BaseEngine } from '@load-games/core'
import type { GameConfig } from '@load-games/core'

interface GameCanvasProps extends GameConfig {
  createEngine: (canvas: HTMLCanvasElement, config: GameConfig) => BaseEngine
  className?: string
  style?: React.CSSProperties
}

export function GameCanvas({ createEngine, className, style, ...config }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = createEngine(canvas, config)
    engine.start()
    return () => engine.destroy()
    // config intentionally excluded — engine owns its state after mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createEngine])

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
}

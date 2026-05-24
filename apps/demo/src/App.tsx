import { useCallback, useEffect, useRef, useState } from 'react'
import { GameCanvas, type GameHandle } from '@load-games/react'
import { QrButton } from './QrButton'
import { SnakeEngine } from '@load-games/snake'
import { FlappyEngine } from '@load-games/flappy'
import { BreakoutEngine } from '@load-games/breakout'
import { PongEngine } from '@load-games/pong'
import { SpaceInvadersEngine } from '@load-games/space-invaders'
import { RunnerEngine } from '@load-games/runner'
import type { BaseEngine, GameConfig, GameTheme } from '@load-games/core'
import { DEFAULT_THEME } from '@load-games/core'

type GameId = 'snake' | 'flappy' | 'breakout' | 'pong' | 'space-invaders' | 'runner'

type EngineFactory = (canvas: HTMLCanvasElement, config: GameConfig) => BaseEngine

interface Config {
  width: number
  height: number
  speed: number
  theme: GameTheme
}

const DEFAULTS: Config = {
  width: 320,
  height: 320,
  speed: 5,
  theme: { ...DEFAULT_THEME },
}

const GAME_META: Record<GameId, { label: string; controls: string; factory: EngineFactory }> = {
  snake:          { label: 'Snake',          controls: 'Arrow keys / WASD / swipe',  factory: (c, cfg) => new SnakeEngine(c, cfg) },
  flappy:         { label: 'Flappy',         controls: 'Space / tap / click',         factory: (c, cfg) => new FlappyEngine(c, cfg) },
  breakout:       { label: 'Breakout',       controls: 'Mouse / Arrow keys',          factory: (c, cfg) => new BreakoutEngine(c, cfg) },
  pong:           { label: 'Pong',           controls: 'Arrow Up / Down',             factory: (c, cfg) => new PongEngine(c, cfg) },
  'space-invaders': { label: 'Space Invaders', controls: 'Arrows to move, Space to shoot', factory: (c, cfg) => new SpaceInvadersEngine(c, cfg) },
  runner:         { label: 'Runner',         controls: 'Space / tap to jump',         factory: (c, cfg) => new RunnerEngine(c, cfg) },
}

export function App() {
  const [active, setActive] = useState<GameId>('snake')
  const [cfg, setCfg] = useState<Config>(DEFAULTS)
  const [score, setScore] = useState(0)
  const [events, setEvents] = useState<string[]>([])
  const [mounted, setMounted] = useState(true)
  const [ready, setReady] = useState(false)
  const [loadingMs, setLoadingMs] = useState<number | null>(null)
  const gameRef = useRef<GameHandle>(null)

  const log = (msg: string) =>
    setEvents(prev => [`${new Date().toLocaleTimeString()} ${msg}`, ...prev].slice(0, 10))

  const createEngine = useCallback<EngineFactory>(
    (canvas, config) => GAME_META[active]!.factory(canvas, config),
    [active]
  )

  const set = <K extends keyof Config>(key: K, val: Config[K]) =>
    setCfg(prev => ({ ...prev, [key]: val }))

  const setTheme = (key: keyof GameTheme, val: string) =>
    setCfg(prev => ({ ...prev, theme: { ...prev.theme, [key]: val } }))

  const handleScore = (n: number) => { setScore(n); log(`onScore(${n})`) }
  const handleGameOver = (n: number) => { setScore(n); log(`onGameOver(${n})`) }
  const handleReady = () => log('onReady()')
  const handleDismiss = (n: number) => { log(`onDismiss(${n}) → unmount`); setMounted(false) }

  const resetGameCycle = () => { setReady(false); setMounted(true); setScore(0); setEvents([]); setLoadingMs(null) }

  // Simulated loading countdown.
  useEffect(() => {
    if (loadingMs === null || loadingMs <= 0) return
    const id = setInterval(() => {
      setLoadingMs(ms => (ms !== null && ms > 100 ? ms - 100 : 0))
    }, 100)
    return () => clearInterval(id)
  }, [loadingMs !== null])

  useEffect(() => {
    if (loadingMs === 0 && !ready) { setReady(true) }
  }, [loadingMs, ready])

  return (
    <div style={s.root}>
      <header style={s.header}>
        <h1 style={s.title}>load-games</h1>
        <QrButton />
      </header>

      <div style={s.tabs}>
        {(Object.keys(GAME_META) as GameId[]).map(id => (
          <button
            key={id}
            style={{ ...s.tab, ...(active === id ? s.tabActive : {}) }}
            onClick={() => { setActive(id); resetGameCycle() }}
          >
            {GAME_META[id]!.label}
          </button>
        ))}
      </div>

      <div style={s.body}>
        <div style={s.canvasCol}>
          <div style={s.canvasWrap}>
            {mounted
              ? <GameCanvas
                  ref={gameRef}
                  key={JSON.stringify({ active, cfg })}
                  createEngine={createEngine}
                  width={cfg.width}
                  height={cfg.height}
                  speed={cfg.speed}
                  theme={cfg.theme}
                  ready={ready}
                  onScore={handleScore}
                  onGameOver={handleGameOver}
                  onReady={handleReady}
                  onDismiss={handleDismiss}
                  style={s.canvas}
                />
              : <div style={{ ...s.canvas, width: cfg.width, height: cfg.height, ...s.dismissedScreen }}>
                  <div style={s.dismissedTitle}>content delivered</div>
                  <div style={s.dismissedSub}>final score: {score}</div>
                  <button style={s.replay} onClick={resetGameCycle}>↻ play again</button>
                </div>
            }
          </div>
          <div style={s.scorebar}>
            <span>Score: <strong>{score}</strong></span>
            <span style={s.hint}>{GAME_META[active]!.controls}</span>
          </div>
          <div style={s.log}>
            {events.length === 0
              ? <span style={s.logEmpty}>callbacks fire here</span>
              : events.map((e, i) => <div key={i} style={s.logLine}>{e}</div>)
            }
          </div>
        </div>

        <div style={s.panel}>
          <Section label="Loading Simulator">
            <div style={s.simulatorNote}>
              Simulates your AI/work finishing while user plays.<br />
              At "ready", the next game-over becomes "tap to continue".
            </div>
            <div style={s.rowWrap}>
              <button
                style={{ ...s.simBtn, ...(ready || loadingMs !== null ? s.simBtnDisabled : {}) }}
                onClick={() => setLoadingMs(5000)}
                disabled={ready || loadingMs !== null}
              >
                {loadingMs !== null ? `loading… ${(loadingMs / 1000).toFixed(1)}s` : '▶ simulate 5s loading'}
              </button>
            </div>
            <div style={s.rowWrap}>
              <button
                style={{ ...s.simBtn, ...(ready ? s.simBtnDisabled : {}) }}
                onClick={() => { setReady(true); setLoadingMs(null) }}
                disabled={ready}
              >
                signalReady() now
              </button>
            </div>
            <div style={s.rowWrap}>
              <button
                style={s.simBtn}
                onClick={() => gameRef.current?.dismiss()}
                disabled={!mounted}
              >
                force dismiss()
              </button>
            </div>
            <div style={s.rowWrap}>
              <button style={s.simBtn} onClick={() => gameRef.current?.pause()} disabled={!mounted}>pause()</button>
              <button style={s.simBtn} onClick={() => gameRef.current?.resume()} disabled={!mounted}>resume()</button>
            </div>
            <div style={s.rowWrap}>
              <button style={s.simBtn} onClick={resetGameCycle}>reset cycle</button>
            </div>
            <div style={s.simulatorState}>
              state: <span style={{ color: ready ? '#22c55e' : '#666' }}>{ready ? 'READY (badge visible)' : 'working…'}</span>
            </div>
          </Section>

          <Section label="Canvas">
            <Slider label="width"  value={cfg.width}  min={160} max={600} step={8}  onChange={v => set('width', v)} />
            <Slider label="height" value={cfg.height} min={160} max={600} step={8}  onChange={v => set('height', v)} />
          </Section>

          <Section label="Gameplay">
            <Slider label="speed" value={cfg.speed} min={1} max={10} step={1} onChange={v => set('speed', v)} />
          </Section>

          <Section label="Theme">
            <ColorRow label="bg"      value={cfg.theme.bg}      onChange={v => setTheme('bg', v)} />
            <ColorRow label="primary" value={cfg.theme.primary} onChange={v => setTheme('primary', v)} />
            <ColorRow label="accent"  value={cfg.theme.accent}  onChange={v => setTheme('accent', v)} />
            <ColorRow label="text"    value={cfg.theme.text}    onChange={v => setTheme('text', v)} />
          </Section>

          <button style={s.reset} onClick={() => { setCfg(DEFAULTS); resetGameCycle() }}>
            reset to defaults
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>{label}</div>
      {children}
    </div>
  )
}

function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void
}) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} style={s.slider} />
      <span style={s.rowVal}>{value}</span>
    </div>
  )
}

function ColorRow({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} style={s.colorPicker} />
      <span style={s.rowVal}>{value}</span>
    </div>
  )
}

const s = {
  root: { fontFamily: 'monospace', color: '#fff', minHeight: '100dvh', padding: '24px 16px' },
  header: { marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const },
  title: { fontSize: 20, letterSpacing: 2 },
  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 20 },
  tab: {
    background: 'transparent', border: '1px solid #333', color: '#666',
    padding: '5px 14px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, borderRadius: 3,
  },
  tabActive: { borderColor: '#22c55e', color: '#22c55e' },
  body: { display: 'flex', gap: 32, flexWrap: 'wrap' as const, alignItems: 'flex-start' },
  canvasCol: { display: 'flex', flexDirection: 'column' as const, gap: 8, maxWidth: '100%' },
  canvasWrap: { border: '1px solid #222', borderRadius: 4, overflow: 'hidden', display: 'inline-block', maxWidth: '100%' },
  canvas: { display: 'block', maxWidth: '100%' },
  dismissedScreen: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
    background: '#0a0a0a', color: '#22c55e', fontFamily: 'monospace', gap: 12,
  },
  dismissedTitle: { fontSize: 14, letterSpacing: 2 },
  dismissedSub: { fontSize: 11, color: '#666' },
  replay: {
    background: 'transparent', border: '1px solid #22c55e', color: '#22c55e',
    padding: '6px 14px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, borderRadius: 3, marginTop: 8,
  },
  scorebar: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#888' },
  hint: { color: '#444', fontSize: 11 },
  log: {
    border: '1px solid #1a1a1a', borderRadius: 3, padding: '8px 10px',
    minHeight: 80, fontSize: 11, color: '#555', background: '#050505',
  },
  logEmpty: { color: '#333' },
  logLine: { lineHeight: 1.6 },
  panel: { display: 'flex', flexDirection: 'column' as const, gap: 0, minWidth: 260 },
  section: { borderBottom: '1px solid #1a1a1a', paddingBottom: 12, marginBottom: 12 },
  sectionLabel: { fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 10 },
  row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  rowWrap: { display: 'flex', gap: 6, marginBottom: 6 },
  rowLabel: { fontSize: 12, color: '#666', width: 56, flexShrink: 0 },
  rowVal: { fontSize: 11, color: '#555', width: 48 },
  slider: { accentColor: '#22c55e', flex: 1 },
  colorPicker: { width: 32, height: 24, border: 'none', background: 'none', cursor: 'pointer', padding: 0 },
  simulatorNote: { fontSize: 11, color: '#555', lineHeight: 1.5, marginBottom: 10 },
  simBtn: {
    background: 'transparent', border: '1px solid #333', color: '#aaa',
    padding: '5px 10px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 11,
    borderRadius: 3, flex: 1, textAlign: 'left' as const,
  },
  simBtnDisabled: { color: '#444', cursor: 'not-allowed', borderColor: '#222' },
  simulatorState: { fontSize: 10, color: '#444', marginTop: 8, letterSpacing: 1 },
  reset: {
    background: 'transparent', border: '1px solid #333', color: '#555',
    padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12,
    borderRadius: 3, marginTop: 4,
  },
} as const

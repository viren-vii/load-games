import { useEffect, useRef, useState } from 'react'
import { LoadingGame, type GameHandle, type EngineClass } from '@load-games/react'
import type { DismissReason, GameLabels, GameTheme } from '@load-games/core'
import { DEFAULT_LABELS, DEFAULT_THEME } from '@load-games/core'
import { QrButton } from './QrButton'
import { SnakeEngine } from '@load-games/snake'
import { FlappyEngine } from '@load-games/flappy'
import { BreakoutEngine } from '@load-games/breakout'
import { PongEngine } from '@load-games/pong'
import { SpaceInvadersEngine } from '@load-games/space-invaders'
import { RunnerEngine } from '@load-games/runner'

type GameId = 'snake' | 'flappy' | 'breakout' | 'pong' | 'space-invaders' | 'runner'
type SkipPosition = 'top' | 'bottom' | 'right'

interface Config {
  width: number
  height: number
  speed: number
  theme: GameTheme
  labels: GameLabels
  returnButton: boolean
  // LoadingGame-only:
  skipButton: boolean
  skipLabel: string
  skipPosition: SkipPosition
}

const DEFAULTS: Config = {
  width: 320,
  height: 320,
  speed: 5,
  theme: { ...DEFAULT_THEME },
  labels: { ...DEFAULT_LABELS },
  returnButton: true,
  skipButton: true,
  skipLabel: 'Skip',
  skipPosition: 'bottom',
}

const GAME_META: Record<GameId, { label: string; controls: string; engine: EngineClass }> = {
  snake: { label: 'Snake', controls: 'Arrow keys / WASD / swipe', engine: SnakeEngine },
  flappy: { label: 'Flappy', controls: 'Space / tap / click', engine: FlappyEngine },
  breakout: { label: 'Breakout', controls: 'Mouse / Arrow keys', engine: BreakoutEngine },
  pong: { label: 'Pong', controls: 'Arrow Up / Down / drag', engine: PongEngine },
  'space-invaders': {
    label: 'Space Invaders',
    controls: 'Arrows / drag to move, Space / tap to shoot',
    engine: SpaceInvadersEngine,
  },
  runner: { label: 'Runner', controls: 'Space / tap to jump', engine: RunnerEngine },
}

const GAME_IDS = Object.keys(GAME_META) as GameId[]

function readGameFromUrl(): GameId | null {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('game')
  return v && GAME_IDS.includes(v as GameId) ? (v as GameId) : null
}

export function App() {
  const [active, setActive] = useState<GameId>(() => readGameFromUrl() ?? 'snake')
  const [cfg, setCfg] = useState<Config>(DEFAULTS)
  // Debounced copy used in the LoadingGame `key`. Without this, every slider tick
  // would remount the game.
  const [appliedCfg, setAppliedCfg] = useState<Config>(DEFAULTS)
  useEffect(() => {
    const t = setTimeout(() => setAppliedCfg(cfg), 250)
    return () => clearTimeout(t)
  }, [cfg])

  // Keep ?game= in sync with the active tab so the URL is always shareable.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('game') !== active) {
      url.searchParams.set('game', active)
      window.history.replaceState({}, '', url)
    }
  }, [active])

  const [score, setScore] = useState(0)
  const [events, setEvents] = useState<string[]>([])
  const [mounted, setMounted] = useState(true)
  const [ready, setReady] = useState(false)
  const [loadingMs, setLoadingMs] = useState<number | null>(null)
  const gameRef = useRef<GameHandle>(null)

  const log = (msg: string) => setEvents(prev => [`${new Date().toLocaleTimeString()} ${msg}`, ...prev].slice(0, 10))

  const set = <K extends keyof Config>(key: K, val: Config[K]) => setCfg(prev => ({ ...prev, [key]: val }))
  const setTheme = (key: keyof GameTheme, val: string) =>
    setCfg(prev => ({ ...prev, theme: { ...prev.theme, [key]: val } }))
  const setLabel = (key: keyof GameLabels, val: string) =>
    setCfg(prev => ({ ...prev, labels: { ...prev.labels, [key]: val } }))

  const handleScore = (n: number) => {
    setScore(n)
    log(`onScore(${n})`)
  }
  const handleGameOver = (n: number) => {
    setScore(n)
    log(`onGameOver(${n})`)
  }
  const handleReady = () => log('onReady()')
  const handleDismiss = (n: number, reason: DismissReason) => {
    log(`onDismiss(${n}, '${reason}') → unmount`)
    setMounted(false)
  }
  const handlePause = () => log('onPause()')
  const handleResume = () => log('onResume()')

  const resetGameCycle = () => {
    setReady(false)
    setMounted(true)
    setScore(0)
    setEvents([])
    setLoadingMs(null)
  }

  useEffect(() => {
    if (loadingMs === null || loadingMs <= 0) return
    const id = setInterval(() => {
      setLoadingMs(ms => (ms !== null && ms > 100 ? ms - 100 : 0))
    }, 100)
    return () => clearInterval(id)
  }, [loadingMs !== null])

  useEffect(() => {
    if (loadingMs === 0 && !ready) {
      setReady(true)
    }
  }, [loadingMs, ready])

  return (
    <div style={s.root}>
      <header style={s.header}>
        <h1 style={s.title}>load-games</h1>
        <QrButton />
      </header>

      <div style={s.tabs}>
        {GAME_IDS.map(id => (
          <button
            type="button"
            key={id}
            style={{ ...s.tab, ...(active === id ? s.tabActive : {}) }}
            onClick={() => {
              setActive(id)
              resetGameCycle()
            }}
          >
            {GAME_META[id]!.label}
          </button>
        ))}
      </div>

      <div style={s.body}>
        <div style={s.canvasCol}>
          <div style={s.gameArea}>
            {mounted ? (
              <LoadingGame
                ref={gameRef}
                // Re-key on any config change (debounced) so the engine picks up new mount-time props.
                key={JSON.stringify({ active, c: appliedCfg })}
                engine={GAME_META[active]!.engine}
                width={appliedCfg.width}
                height={appliedCfg.height}
                speed={appliedCfg.speed}
                theme={appliedCfg.theme}
                labels={appliedCfg.labels}
                returnButton={appliedCfg.returnButton}
                ready={ready}
                skipButton={appliedCfg.skipButton}
                skipLabel={appliedCfg.skipLabel}
                skipPosition={appliedCfg.skipPosition}
                onScore={handleScore}
                onGameOver={handleGameOver}
                onReady={handleReady}
                onDismiss={handleDismiss}
                onPause={handlePause}
                onResume={handleResume}
                style={{ ...s.canvas, border: '1px solid #222', borderRadius: 4 }}
                skipButtonStyle={{ color: '#22c55e' }}
                wrapperStyle={{ gap: 12 }}
              />
            ) : (
              <div style={{ ...s.canvas, width: appliedCfg.width, height: appliedCfg.height, ...s.dismissedScreen }}>
                <div style={s.dismissedTitle}>content delivered</div>
                <div style={s.dismissedSub}>final score: {score}</div>
                <button type="button" style={s.replay} onClick={resetGameCycle}>
                  ↻ play again
                </button>
              </div>
            )}
          </div>
          <div style={s.scorebar}>
            <span>
              Score: <strong>{score}</strong>
            </span>
            <span style={s.hint}>{GAME_META[active]!.controls}</span>
          </div>
          <div style={s.log}>
            {events.length === 0 ? (
              <span style={s.logEmpty}>callbacks fire here</span>
            ) : (
              events.map((e, i) => (
                <div key={i} style={s.logLine}>
                  {e}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={s.panel}>
          <Section label="Loading Simulator" defaultOpen>
            <div style={s.simulatorNote}>
              Simulates your AI / work finishing while user plays.
              <br />
              At "ready", the next game-over becomes "tap to continue".
            </div>
            <div style={s.rowWrap}>
              <button
                type="button"
                style={{ ...s.simBtn, ...(ready || loadingMs !== null ? s.simBtnDisabled : {}) }}
                onClick={() => setLoadingMs(5000)}
                disabled={ready || loadingMs !== null}
              >
                {loadingMs !== null ? `loading… ${(loadingMs / 1000).toFixed(1)}s` : '▶ simulate 5s loading'}
              </button>
            </div>
            <div style={s.rowWrap}>
              <button
                type="button"
                style={{ ...s.simBtn, ...(ready ? s.simBtnDisabled : {}) }}
                onClick={() => {
                  setReady(true)
                  setLoadingMs(null)
                }}
                disabled={ready}
              >
                signalReady() now
              </button>
            </div>
            <div style={s.rowWrap}>
              <button type="button" style={s.simBtn} onClick={() => gameRef.current?.dismiss()} disabled={!mounted}>
                force dismiss()
              </button>
            </div>
            <div style={s.rowWrap}>
              <button type="button" style={s.simBtn} onClick={() => gameRef.current?.pause()} disabled={!mounted}>
                pause()
              </button>
              <button type="button" style={s.simBtn} onClick={() => gameRef.current?.resume()} disabled={!mounted}>
                resume()
              </button>
            </div>
            <div style={s.rowWrap}>
              <button type="button" style={s.simBtn} onClick={resetGameCycle}>
                reset cycle
              </button>
            </div>
            <div style={s.simulatorState}>
              state:{' '}
              <span style={{ color: ready ? '#22c55e' : '#666' }}>{ready ? 'READY (badge visible)' : 'working…'}</span>
            </div>
          </Section>

          <Section label="Canvas / Gameplay" defaultOpen>
            <Slider label="width" value={cfg.width} min={160} max={600} step={8} onChange={v => set('width', v)} />
            <Slider label="height" value={cfg.height} min={160} max={600} step={8} onChange={v => set('height', v)} />
            <Slider label="speed" value={cfg.speed} min={1} max={10} step={1} onChange={v => set('speed', v)} />
          </Section>

          <Section label="Theme">
            <ColorRow label="bg" value={cfg.theme.bg} onChange={v => setTheme('bg', v)} />
            <ColorRow label="primary" value={cfg.theme.primary} onChange={v => setTheme('primary', v)} />
            <ColorRow label="accent" value={cfg.theme.accent} onChange={v => setTheme('accent', v)} />
            <ColorRow label="text" value={cfg.theme.text} onChange={v => setTheme('text', v)} />
          </Section>

          <Section label="Labels (i18n / branding)">
            <TextRow label="idleStart" value={cfg.labels.idleStart} onChange={v => setLabel('idleStart', v)} />
            <TextRow label="idleReady" value={cfg.labels.idleReady} onChange={v => setLabel('idleReady', v)} />
            <TextRow label="gameOver" value={cfg.labels.gameOver} onChange={v => setLabel('gameOver', v)} />
            <TextRow label="tapRestart" value={cfg.labels.tapRestart} onChange={v => setLabel('tapRestart', v)} />
            <TextRow label="tapContinue" value={cfg.labels.tapContinue} onChange={v => setLabel('tapContinue', v)} />
            <TextRow label="readyBadge" value={cfg.labels.readyBadge} onChange={v => setLabel('readyBadge', v)} />
            <TextRow label="tapServe" value={cfg.labels.tapServe} onChange={v => setLabel('tapServe', v)} />
          </Section>

          <Section label="Behavior">
            <ToggleRow
              label="returnButton"
              value={cfg.returnButton}
              onChange={v => set('returnButton', v)}
              hint="in-canvas top-right exit"
            />
          </Section>

          <Section label="Skip Button (LoadingGame)">
            <ToggleRow
              label="skipButton"
              value={cfg.skipButton}
              onChange={v => set('skipButton', v)}
              hint="render external Skip button"
            />
            <TextRow label="skipLabel" value={cfg.skipLabel} onChange={v => set('skipLabel', v)} />
            <SelectRow
              label="skipPosition"
              value={cfg.skipPosition}
              options={['top', 'bottom', 'right'] as const}
              onChange={v => set('skipPosition', v as SkipPosition)}
            />
          </Section>

          <button
            type="button"
            style={s.reset}
            onClick={() => {
              setCfg(DEFAULTS)
              resetGameCycle()
            }}
          >
            reset to defaults
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({
  label,
  defaultOpen,
  children,
}: {
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={defaultOpen} style={s.section}>
      <summary style={s.sectionLabel}>{label}</summary>
      <div style={s.sectionBody}>{children}</div>
    </details>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={s.slider}
      />
      <span style={s.rowVal}>{value}</span>
    </div>
  )
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} style={s.colorPicker} />
      <span style={s.rowVal}>{value}</span>
    </div>
  )
}

function TextRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={s.rowText}>
      <span style={s.rowLabelText}>{label}</span>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} style={s.textInput} />
    </div>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  hint?: string
}) {
  return (
    <label style={s.toggleRow}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} style={s.checkbox} />
      <span style={s.toggleLabel}>{label}</span>
      {hint && <span style={s.toggleHint}>— {hint}</span>}
    </label>
  )
}

function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}) {
  return (
    <div style={s.rowText}>
      <span style={s.rowLabelText}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value as T)} style={s.select}>
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

const s = {
  root: { fontFamily: 'monospace', color: '#fff', minHeight: '100dvh', padding: '24px 16px' },
  header: {
    marginBottom: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  title: { fontSize: 20, letterSpacing: 2 },
  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 20 },
  tab: {
    background: 'transparent',
    border: '1px solid #333',
    color: '#666',
    padding: '5px 14px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 12,
    borderRadius: 3,
  },
  tabActive: { borderColor: '#22c55e', color: '#22c55e' },
  body: { display: 'flex', gap: 32, flexWrap: 'wrap' as const, alignItems: 'flex-start' },
  canvasCol: { display: 'flex', flexDirection: 'column' as const, gap: 8, maxWidth: '100%' },
  gameArea: { display: 'inline-block', maxWidth: '100%' },
  canvas: { display: 'block', maxWidth: '100%' },
  dismissedScreen: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0a',
    color: '#22c55e',
    fontFamily: 'monospace',
    gap: 12,
  },
  dismissedTitle: { fontSize: 14, letterSpacing: 2 },
  dismissedSub: { fontSize: 11, color: '#666' },
  replay: {
    background: 'transparent',
    border: '1px solid #22c55e',
    color: '#22c55e',
    padding: '6px 14px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 11,
    borderRadius: 3,
    marginTop: 8,
  },
  scorebar: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#888' },
  hint: { color: '#444', fontSize: 11 },
  log: {
    border: '1px solid #1a1a1a',
    borderRadius: 3,
    padding: '8px 10px',
    minHeight: 80,
    fontSize: 11,
    color: '#555',
    background: '#050505',
  },
  logEmpty: { color: '#333' },
  logLine: { lineHeight: 1.6 },
  panel: { display: 'flex', flexDirection: 'column' as const, gap: 0, minWidth: 280 },
  section: {
    borderBottom: '1px solid #1a1a1a',
    paddingBottom: 8,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    color: '#666',
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    padding: '8px 0',
    userSelect: 'none' as const,
    listStyle: 'revert',
  },
  sectionBody: { marginTop: 6 },
  row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  rowWrap: { display: 'flex', gap: 6, marginBottom: 6 },
  rowText: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  rowLabel: { fontSize: 12, color: '#666', width: 56, flexShrink: 0 },
  rowLabelText: { fontSize: 11, color: '#666', width: 90, flexShrink: 0 },
  rowVal: { fontSize: 11, color: '#555', width: 48 },
  slider: { accentColor: '#22c55e', flex: 1 },
  colorPicker: { width: 32, height: 24, border: 'none', background: 'none', cursor: 'pointer', padding: 0 },
  textInput: {
    flex: 1,
    background: '#0a0a0a',
    border: '1px solid #222',
    color: '#ccc',
    padding: '3px 6px',
    fontFamily: 'monospace',
    fontSize: 11,
    borderRadius: 2,
  },
  select: {
    flex: 1,
    background: '#0a0a0a',
    border: '1px solid #222',
    color: '#ccc',
    padding: '3px 6px',
    fontFamily: 'monospace',
    fontSize: 11,
    borderRadius: 2,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    cursor: 'pointer' as const,
  },
  checkbox: { accentColor: '#22c55e' },
  toggleLabel: { fontSize: 11, color: '#aaa' },
  toggleHint: { fontSize: 10, color: '#555' },
  simulatorNote: { fontSize: 11, color: '#555', lineHeight: 1.5, marginBottom: 10 },
  simBtn: {
    background: 'transparent',
    border: '1px solid #333',
    color: '#aaa',
    padding: '5px 10px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 11,
    borderRadius: 3,
    flex: 1,
    textAlign: 'left' as const,
  },
  simBtnDisabled: { color: '#444', cursor: 'not-allowed', borderColor: '#222' },
  simulatorState: { fontSize: 10, color: '#444', marginTop: 8, letterSpacing: 1 },
  reset: {
    background: 'transparent',
    border: '1px solid #333',
    color: '#555',
    padding: '6px 12px',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: 12,
    borderRadius: 3,
    marginTop: 4,
  },
} as const

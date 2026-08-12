import { useEffect, useState } from 'react'
import { DEFAULT_THEME, THEMES, applyTheme, type ThemeId } from '../themes/themes'
import { fmt } from '@shared/model'
import type { MiniTick } from '@shared/ipc'

/** Narrow an arbitrary persisted theme string to a known ThemeId. */
function coerceTheme(id: string): ThemeId {
  return THEMES.some((t) => t.id === id) ? (id as ThemeId) : DEFAULT_THEME
}

/**
 * Pinned mini widget (`#/mini`) — a small always-on-top card shown in the
 * corner of the screen while the main window is minimized (see
 * `App.tsx`'s "pin mini view" toggle and `registerMiniIpc` in the main
 * process). A dumb view driven entirely by the main window's timer engine
 * over IPC, same pull+push pattern as the ambient bar and takeover window.
 * Its Pause/Stop buttons don't act locally — they tell the main window what
 * to do and restore it, matching the contract "clicking pause or stop brings
 * back the normal window".
 */
export default function MiniView(): JSX.Element {
  const [tick, setTick] = useState<MiniTick | null>(null)

  useEffect(() => {
    let cancelled = false
    void window.pompom.mini.get().then((t) => {
      if (!cancelled && t) setTick(t)
    })
    const off = window.pompom.mini.onTick((t) => setTick(t))
    return () => {
      cancelled = true
      off()
    }
  }, [])

  useEffect(() => {
    if (!tick) return
    applyTheme(document.documentElement, coerceTheme(tick.theme), tick.state)
  }, [tick])

  if (!tick) return <div className="mini-card" />

  return (
    <div className={`mini-card state-${tick.state}`}>
      <div className="mini-main">
        <div className="mini-badge">
          <span className="pulse-dot" />
          <span>{tick.state === 'work' ? 'Work' : 'Rest'}</span>
        </div>
        <div className="mini-label">{tick.label}</div>
        <div className="mini-time tabular">
          {fmt(tick.remaining)}
          {tick.paused && <span className="mini-paused"> · Paused</span>}
        </div>
      </div>
      <div className="mini-actions">
        <button
          className="mini-btn"
          title="Pause and reopen PomPom"
          aria-label="Pause and reopen PomPom"
          onClick={() => window.pompom.mini.action('pause')}
        >
          ❙❙
        </button>
        <button
          className="mini-btn"
          title="Stop and reopen PomPom"
          aria-label="Stop and reopen PomPom"
          onClick={() => window.pompom.mini.action('stop')}
        >
          ■
        </button>
      </div>
    </div>
  )
}

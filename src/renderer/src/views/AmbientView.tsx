import { useEffect, useState } from 'react'
import { DEFAULT_THEME, THEMES, applyTheme, type ThemeId } from '../themes/themes'
import type { AmbientTick } from '@shared/ipc'

/** Narrow an arbitrary persisted theme string to a known ThemeId. */
function coerceTheme(id: string): ThemeId {
  return THEMES.some((t) => t.id === id) ? (id as ThemeId) : DEFAULT_THEME
}

/**
 * Ambient meter bar (`#/ambient`) — a thin, always-on-top, click-through strip
 * pinned to the top of the primary display. It is a dumb view driven entirely by
 * the main window's timer engine over IPC: a fill whose width mirrors the current
 * step's ELAPSED fraction (`1 - frac`, matching the sequence strip + the mock),
 * recolouring with the work/rest accent. Clock authority stays in the main window;
 * this view never runs its own timer.
 */
export default function AmbientView(): JSX.Element {
  const [tick, setTick] = useState<AmbientTick | null>(null)

  // Seed the last tick on mount, then keep listening for live pushes.
  useEffect(() => {
    let cancelled = false
    void window.pompom.ambient.get().then((t) => {
      if (!cancelled && t) setTick(t)
    })
    const off = window.pompom.ambient.onTick((t) => setTick(t))
    return () => {
      cancelled = true
      off()
    }
  }, [])

  // Match the accent hue to the main window's theme + current work/rest state so
  // the `--accent`/`--accent-glow` CSS vars driving the fill resolve correctly.
  useEffect(() => {
    if (!tick) return
    applyTheme(document.documentElement, coerceTheme(tick.theme), tick.state)
  }, [tick])

  const elapsed = tick ? Math.max(0, Math.min(1, tick.elapsedFrac)) : 0

  return (
    <div className="ambient-bar on">
      <div className="fill" style={{ width: `${elapsed * 100}%` }} />
    </div>
  )
}

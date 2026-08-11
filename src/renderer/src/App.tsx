import { useEffect, useState } from 'react'
import { THEMES, DEFAULT_THEME, applyTheme, type ThemeId, type SessionState } from './themes/themes'

/**
 * Scaffold placeholder that now also exercises the theme system (plan step 2).
 * The three palettes are swappable live and the work/rest accent hue shift can
 * be toggled — proving applyTheme() drives the CSS-variable sets correctly.
 * The real config / timer / complete views replace this in later plan steps.
 */
export default function App(): JSX.Element {
  const [bridge, setBridge] = useState<string>('…')
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME)
  const [state, setState] = useState<SessionState>('work')

  useEffect(() => {
    try {
      setBridge(window.pompom?.ping?.() ?? 'unavailable')
    } catch {
      setBridge('unavailable')
    }
  }, [])

  // Apply the active theme + work/rest state to the document root so the
  // theme's CSS variables cascade to the whole app (including future windows).
  useEffect(() => {
    applyTheme(document.documentElement, theme, state)
  }, [theme, state])

  return (
    <div className="scaffold">
      <h1>PomPom</h1>
      <p>Electron + React scaffold is running.</p>
      <p className="dim">preload bridge: {bridge}</p>

      <div className="swatch-row">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`swatch${t.id === theme ? ' active' : ''}`}
            title={t.name}
            onClick={() => setTheme(t.id)}
          >
            <span style={{ background: t.swatchWork }} />
            <span style={{ background: t.swatchRest }} />
          </button>
        ))}
      </div>

      <button className="state-toggle" onClick={() => setState((s) => (s === 'work' ? 'rest' : 'work'))}>
        {state === 'work' ? 'Work' : 'Rest'} — tap to shift accent
      </button>
    </div>
  )
}

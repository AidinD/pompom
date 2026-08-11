import { useEffect } from 'react'
import { DEFAULT_THEME, applyTheme } from './themes/themes'
import { buildTimeline, type Cfg } from '@shared/model'
import ConfigView from './views/ConfigView'

/**
 * Main-window shell. For now it renders the config view inside the themed
 * window frame. Timer / complete views and hash-routed aux windows arrive in
 * later plan steps; the theme picker + persistence land in step 4, so the
 * theme is fixed to the default here.
 */
export default function App(): JSX.Element {
  // Apply the default theme (work state) to the document root so the theme's
  // CSS variables cascade to the whole app.
  useEffect(() => {
    applyTheme(document.documentElement, DEFAULT_THEME, 'work')
  }, [])

  function handleStart(cfg: Cfg): void {
    // The timer engine + view are built in a later step; for now, prove the
    // config → timeline wiring is correct.
    const timeline = buildTimeline(cfg)
    // eslint-disable-next-line no-console
    console.log('[PomPom] start session', cfg, timeline)
  }

  return (
    <div className="window state-work" id="window">
      <div className="titlebar">
        <span className="app-name">
          <span className="brand-mark" />
          PomPom
        </span>
      </div>
      <ConfigView onStart={handleStart} />
    </div>
  )
}

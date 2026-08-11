import { useEffect, useState } from 'react'
import { DEFAULT_THEME, THEMES, applyTheme, type ThemeId } from './themes/themes'
import {
  buildTimeline,
  SEED_TEMPLATES,
  DEFAULT_CFG,
  type Cfg,
  type Template
} from '@shared/model'
import type { StoreData } from '@shared/store'
import ConfigView from './views/ConfigView'

/** Narrow an arbitrary persisted theme string to a known ThemeId. */
function coerceTheme(id: string): ThemeId {
  return THEMES.some((t) => t.id === id) ? (id as ThemeId) : DEFAULT_THEME
}

/**
 * Main-window shell. Loads the durable store on mount, owns the templates +
 * theme + last config, and renders the config view inside the themed window
 * frame. Timer / complete views and hash-routed aux windows arrive in later
 * plan steps; the timer engine still stubs out `onStart`.
 */
export default function App(): JSX.Element {
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG)
  // Bumped whenever a template loads, to remount ConfigView with fresh state.
  const [cfgKey, setCfgKey] = useState(0)
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME)
  const [templates, setTemplates] = useState<Template[]>(SEED_TEMPLATES)

  // Load persisted state from disk once on mount.
  useEffect(() => {
    let cancelled = false
    void window.pompom.store.get().then((s: StoreData) => {
      if (cancelled) return
      setTemplates(s.templates?.length ? s.templates : SEED_TEMPLATES)
      setTheme(coerceTheme(s.theme))
      if (s.lastConfig) setCfg(s.lastConfig)
      // Remount ConfigView so its local state re-seeds from the loaded config.
      setCfgKey((k) => k + 1)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Apply the active theme (work state) to the document root so its CSS
  // variables cascade to the whole app; re-runs when the theme changes.
  useEffect(() => {
    applyTheme(document.documentElement, theme, 'work')
  }, [theme])

  function handleLoadTemplate(id: string): void {
    const tpl = templates.find((t) => t.id === id)
    if (!tpl) return
    // Clone so editing the form never mutates the stored template.
    setCfg({ ...tpl.cfg, labels: tpl.cfg.labels.slice() })
    setCfgKey((k) => k + 1)
  }

  function handleSaveTemplate(current: Cfg): void {
    const name = `Custom · ${current.count}×${current.work}/${current.rest}`
    const tpl: Template = {
      id: `custom-${Date.now()}`,
      name,
      cfg: { ...current, labels: current.labels.slice() }
    }
    const next = [...templates, tpl]
    setTemplates(next)
    void window.pompom.store.set({ templates: next })
  }

  function handleThemeChange(id: ThemeId): void {
    setTheme(id)
    void window.pompom.store.set({ theme: id })
  }

  function handleStart(next: Cfg): void {
    setCfg(next)
    void window.pompom.store.set({ lastConfig: next })
    // The timer engine + view are built in a later step; for now, prove the
    // config → timeline wiring is correct.
    const timeline = buildTimeline(next)
    // eslint-disable-next-line no-console
    console.log('[PomPom] start session', next, timeline)
  }

  return (
    <div className="window state-work" id="window">
      <div className="titlebar">
        <span className="app-name">
          <span className="brand-mark" />
          PomPom
        </span>
      </div>
      <ConfigView
        key={cfgKey}
        initialCfg={cfg}
        templates={templates}
        theme={theme}
        onStart={handleStart}
        onLoadTemplate={handleLoadTemplate}
        onSaveTemplate={handleSaveTemplate}
        onThemeChange={handleThemeChange}
      />
    </div>
  )
}

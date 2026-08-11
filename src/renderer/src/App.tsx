import { useEffect, useState } from 'react'
import { DEFAULT_THEME, THEMES, applyTheme, type ThemeId } from './themes/themes'
import { SEED_TEMPLATES, DEFAULT_CFG, type Cfg, type Template } from '@shared/model'
import type { StoreData } from '@shared/store'
import ConfigView from './views/ConfigView'
import TimerView from './views/TimerView'
import CompleteView from './views/CompleteView'
import { useTimerEngine } from './hooks/useTimerEngine'

/** Narrow an arbitrary persisted theme string to a known ThemeId. */
function coerceTheme(id: string): ThemeId {
  return THEMES.some((t) => t.id === id) ? (id as ThemeId) : DEFAULT_THEME
}

/**
 * Main-window shell. Loads the durable store on mount, owns the templates +
 * theme + last config, and hosts the wall-clock timer engine. It routes between
 * the config, timer, and complete surfaces by the engine phase, applying the
 * active theme + work/rest state class to both the document root (so the
 * theme-scoped `--accent` hue overrides cascade) and the `#window` card (for the
 * accent glow). The takeover + ambient windows arrive in later plan steps.
 */
export default function App(): JSX.Element {
  const [cfg, setCfg] = useState<Cfg>(DEFAULT_CFG)
  // Bumped whenever a template loads, to remount ConfigView with fresh state.
  const [cfgKey, setCfgKey] = useState(0)
  const [theme, setTheme] = useState<ThemeId>(DEFAULT_THEME)
  const [templates, setTemplates] = useState<Template[]>(SEED_TEMPLATES)
  const [ambientEnabled, setAmbientEnabled] = useState(false)

  const engine = useTimerEngine()

  // Load persisted state from disk once on mount.
  useEffect(() => {
    let cancelled = false
    void window.pompom.store.get().then((s: StoreData) => {
      if (cancelled) return
      setTemplates(s.templates?.length ? s.templates : SEED_TEMPLATES)
      setTheme(coerceTheme(s.theme))
      setAmbientEnabled(!!s.ambientEnabled)
      if (s.lastConfig) setCfg(s.lastConfig)
      // Remount ConfigView so its local state re-seeds from the loaded config.
      setCfgKey((k) => k + 1)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Derive the work/rest state from the current step (defaults to 'work' when
  // idle, so the config/complete surfaces show the primary accent).
  const state: 'work' | 'rest' = engine.step?.type === 'rest' ? 'rest' : 'work'

  // Apply the active theme + state to the document root so the theme's CSS
  // variables (incl. the state-scoped `--accent` overrides) cascade app-wide.
  useEffect(() => {
    applyTheme(document.documentElement, theme, state)
  }, [theme, state])

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
    engine.start(next)
  }

  function handleToggleAmbient(): void {
    setAmbientEnabled((prev) => {
      const next = !prev
      void window.pompom.store.set({ ambientEnabled: next })
      return next
    })
    // The actual always-on-top ambient window is created in a later plan step.
  }

  const windowClass = `window state-${state}`

  return (
    <div className={windowClass} id="window">
      <div className="titlebar">
        <span className="app-name">
          <span className="brand-mark" />
          PomPom
        </span>
      </div>

      {engine.phase === 'idle' && (
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
      )}

      {(engine.phase === 'running' || engine.phase === 'awaiting') && (
        <TimerView
          engine={engine}
          ambientEnabled={ambientEnabled}
          onToggleAmbient={handleToggleAmbient}
        />
      )}

      {engine.phase === 'complete' && (
        <CompleteView cfg={engine.cfg} onNewSession={() => engine.stop()} />
      )}
    </div>
  )
}

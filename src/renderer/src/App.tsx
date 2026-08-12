import { useEffect, useRef, useState } from 'react'
import { DEFAULT_THEME, THEMES, applyTheme, type ThemeId } from './themes/themes'
import { SEED_TEMPLATES, DEFAULT_CFG, type Cfg, type Template } from '@shared/model'
import type { StoreData } from '@shared/store'
import { GRACE_SECS } from '@shared/ipc'
import ConfigView from './views/ConfigView'
import TimerView from './views/TimerView'
import CompleteView from './views/CompleteView'
import { useTimerEngine } from './hooks/useTimerEngine'
import { playChime } from './sound'

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
  const [miniPinned, setMiniPinned] = useState(false)

  // Latest theme, reachable from the engine callbacks below without making the
  // callbacks (or a re-subscribe) depend on it.
  const themeRef = useRef<ThemeId>(DEFAULT_THEME)

  // The timer engine drives the takeover window: when a step finishes it asks
  // the main process to show the fullscreen takeover for the next step; the
  // takeover's Confirm click comes back via `takeover:confirmed` (below) and
  // calls engine.confirm(). On stop/complete the takeover is force-hidden.
  const engine = useTimerEngine({
    onStepPending: (nextIdx, timeline) => {
      const next = timeline[nextIdx]
      if (!next) return
      playChime()
      window.pompom.takeover.show({
        type: next.type,
        label: next.label,
        mins: next.mins,
        theme: themeRef.current,
        graceSecs: GRACE_SECS
      })
    },
    onComplete: () => {
      playChime()
      window.pompom.takeover.hide()
    },
    onStop: () => window.pompom.takeover.hide()
  })

  // Keep a stable handle to the engine's confirm so the subscription below never
  // needs to re-run (engine action identities change every tick).
  const confirmRef = useRef(engine.confirm)
  confirmRef.current = engine.confirm

  // The takeover window's Confirm click advances the timer into the pending step.
  useEffect(() => {
    return window.pompom.takeover.onConfirmed(() => confirmRef.current())
  }, [])

  // The mini widget's Pause/Stop buttons act on the engine and turn the pin off
  // (the main process already restores the main window itself; this just keeps
  // React state — and the persisted toggle — in sync with that).
  const engineRef = useRef(engine)
  engineRef.current = engine
  useEffect(() => {
    return window.pompom.mini.onAction((action) => {
      if (action === 'pause') engineRef.current.pause()
      else engineRef.current.stop()
      setMiniPinned(false)
      void window.pompom.store.set({ miniPinned: false })
    })
  }, [])

  // Load persisted state from disk once on mount.
  useEffect(() => {
    let cancelled = false
    void window.pompom.store.get().then((s: StoreData) => {
      if (cancelled) return
      // The store always carries a real templates array (DEFAULT_STORE seeds it
      // on first run), so trust it as-is — an intentionally emptied list (the
      // user deleted every template) must stay empty, not bounce back to seeds.
      setTemplates(s.templates ?? SEED_TEMPLATES)
      setTheme(coerceTheme(s.theme))
      setAmbientEnabled(!!s.ambientEnabled)
      setMiniPinned(!!s.miniPinned)
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
    themeRef.current = theme
    applyTheme(document.documentElement, theme, state)
  }, [theme, state])

  // The ambient bar window should be up only while a session is live (running or
  // awaiting the takeover) AND the toggle is on. It honours a persisted
  // `ambientEnabled` automatically: the moment a session starts with it true,
  // `shouldShowAmbient` flips and the effect below reveals the window.
  const shouldShowAmbient =
    ambientEnabled && (engine.phase === 'running' || engine.phase === 'awaiting')

  // Create/show ↔ hide the always-on-top ambient window. Stop/complete route
  // through `phase !== running/awaiting`, so this also hides it on session end.
  useEffect(() => {
    window.pompom.ambient.setVisible(shouldShowAmbient)
  }, [shouldShowAmbient])

  // Push the live elapsed fraction to the bar each time the engine snapshot
  // changes while it should be visible — no separate loop, just an effect keyed
  // on the relevant engine fields (matching the engine's ~200ms tick cadence).
  // We skip publishing while paused so the bar freezes at its last width.
  useEffect(() => {
    if (!shouldShowAmbient || engine.paused) return
    window.pompom.ambient.push({ theme, state, elapsedFrac: engine.elapsedFrac })
  }, [shouldShowAmbient, engine.paused, engine.elapsedFrac, theme, state])

  // The mini widget is pinned (main window minimized) whenever the toggle is on
  // AND a session is live — same "auto while running" contract as the ambient
  // bar. It also mirrors that shape once un-pinned via `stop`/`onComplete`.
  const shouldShowMini =
    miniPinned && (engine.phase === 'running' || engine.phase === 'awaiting')

  useEffect(() => {
    window.pompom.mini.setVisible(shouldShowMini)
  }, [shouldShowMini])

  // Push the live remaining/paused state to the widget. Unlike the ambient bar
  // this pushes even while paused, since the widget's whole job is to show
  // "Paused" rather than freeze silently.
  useEffect(() => {
    if (!shouldShowMini) return
    window.pompom.mini.push({
      theme,
      state,
      label: engine.step?.label || (state === 'rest' ? 'Rest' : ''),
      remaining: engine.remaining,
      paused: engine.paused
    })
  }, [shouldShowMini, engine.remaining, engine.paused, engine.step, theme, state])

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

  function handleDeleteTemplate(id: string): void {
    const next = templates.filter((t) => t.id !== id)
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
    // The effect keyed on `shouldShowAmbient` creates/hides the ambient window;
    // this handler only flips + persists the setting.
  }

  function handleToggleMini(): void {
    setMiniPinned((prev) => {
      const next = !prev
      void window.pompom.store.set({ miniPinned: next })
      return next
    })
    // The effect keyed on `shouldShowMini` minimizes/restores the main window
    // and shows/hides the widget; this handler only flips + persists the setting.
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
          onDeleteTemplate={handleDeleteTemplate}
          onThemeChange={handleThemeChange}
        />
      )}

      {(engine.phase === 'running' || engine.phase === 'awaiting') && (
        <TimerView
          engine={engine}
          ambientEnabled={ambientEnabled}
          onToggleAmbient={handleToggleAmbient}
          miniPinned={miniPinned}
          onToggleMini={handleToggleMini}
        />
      )}

      {engine.phase === 'complete' && (
        <CompleteView cfg={engine.cfg} onNewSession={() => engine.stop()} />
      )}
    </div>
  )
}

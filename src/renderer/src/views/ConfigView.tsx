import { useState } from 'react'
import {
  DEFAULT_CFG,
  clampCount,
  growLabels,
  type Cfg,
  type Template
} from '@shared/model'
import { THEMES, type ThemeId } from '../themes/themes'

interface ConfigViewProps {
  /** Initial config for the form (last-used config or a loaded template). */
  initialCfg?: Cfg
  /** Templates to render as chips. */
  templates: Template[]
  /** Currently selected theme id. */
  theme: ThemeId
  /** Called with the finalized config when the user starts a session. */
  onStart: (cfg: Cfg) => void
  /** Called when a template chip is clicked (parent loads it into the form). */
  onLoadTemplate: (id: string) => void
  /** Called with the current form config + a user-chosen name to save it as a new template. */
  onSaveTemplate: (cfg: Cfg, name: string) => void
  /** Called with a template's id when its remove ("x") button is clicked. */
  onDeleteTemplate: (id: string) => void
  /** Called with a template's id + new name when a rename is committed. */
  onRenameTemplate: (id: string, name: string) => void
  /** Called when a theme swatch is picked. */
  onThemeChange: (id: ThemeId) => void
}

/**
 * Config view (`#/`) — "New session".
 *
 * Ports the mock's config surface: pomodoro stepper (clamped 1..8, grows the
 * labels array), work/rest duration inputs, one editable task-label row per
 * pomodoro, reusable template chips, and a theme-picker swatch row. cfg is kept
 * local to the view; loading a template remounts this component (via a `key` in
 * the parent) so the initialCfg re-seeds the local state cleanly.
 *
 * Duration inputs are kept as raw strings so the fields can be cleared/edited
 * smoothly; they resolve to numbers (with the mock's 25/5 fallbacks) on start.
 */
export default function ConfigView({
  initialCfg = DEFAULT_CFG,
  templates,
  theme,
  onStart,
  onLoadTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  onRenameTemplate,
  onThemeChange
}: ConfigViewProps): JSX.Element {
  const [count, setCount] = useState(initialCfg.count)
  const [work, setWork] = useState(String(initialCfg.work))
  const [rest, setRest] = useState(String(initialCfg.rest))
  const [labels, setLabels] = useState<string[]>(growLabels(initialCfg.labels, initialCfg.count))

  // Inline "save as" naming: clicking "+ Save current" opens a text input
  // (pre-filled with the old auto-generated name) instead of saving instantly.
  const [savingName, setSavingName] = useState<string | null>(null)
  // Inline rename: clicking a chip's pencil turns its label into a text input.
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  function changeCount(delta: number): void {
    const next = clampCount(count + delta)
    setCount(next)
    // Grow (never shrink) the labels array so extra labels survive count changes.
    setLabels((prev) => growLabels(prev, next))
  }

  function setLabel(i: number, value: string): void {
    setLabels((prev) => {
      const next = prev.slice()
      next[i] = value
      return next
    })
  }

  /** Resolve the current form fields into a concrete Cfg (mock 25/5 fallbacks). */
  function currentCfg(): Cfg {
    return {
      count,
      work: parseInt(work, 10) || DEFAULT_CFG.work,
      rest: parseInt(rest, 10) || DEFAULT_CFG.rest,
      labels: growLabels(labels, count)
    }
  }

  function defaultTemplateName(): string {
    return `Custom · ${count}×${work || DEFAULT_CFG.work}/${rest || DEFAULT_CFG.rest}`
  }

  function commitSave(): void {
    const name = savingName?.trim() || defaultTemplateName()
    onSaveTemplate(currentCfg(), name)
    setSavingName(null)
  }

  function startRename(tpl: Template): void {
    setRenamingId(tpl.id)
    setRenameValue(tpl.name)
  }

  function commitRename(): void {
    if (renamingId) onRenameTemplate(renamingId, renameValue.trim() || 'Untitled')
    setRenamingId(null)
  }

  const workHint = work === '' ? '' : `${work}m`

  return (
    <section className="view" id="view-config">
      <div className="view-title">New session</div>

      <div className="field">
        <label>Pomodoros</label>
        <div className="stepper">
          <button onClick={() => changeCount(-1)} disabled={count <= 1} aria-label="Fewer pomodoros">
            –
          </button>
          <span className="val tabular">{count}</span>
          <button onClick={() => changeCount(1)} disabled={count >= 8} aria-label="More pomodoros">
            +
          </button>
        </div>
      </div>

      <div className="duration-row">
        <div className="field">
          <label>Work</label>
          <div className="num-input">
            <input
              type="number"
              min={1}
              value={work}
              onChange={(e) => setWork(e.target.value)}
              aria-label="Work minutes"
            />
            <span className="unit">min</span>
          </div>
        </div>
        <div className="field">
          <label>Rest</label>
          <div className="num-input">
            <input
              type="number"
              min={1}
              value={rest}
              onChange={(e) => setRest(e.target.value)}
              aria-label="Rest minutes"
            />
            <span className="unit">min</span>
          </div>
        </div>
      </div>

      <div className="field">
        <label>Task per pomodoro</label>
        <div className="steps-list">
          {Array.from({ length: count }, (_, i) => (
            <div className="step-row" key={i}>
              <span className="step-index">{i + 1}</span>
              <input
                value={labels[i] ?? ''}
                placeholder={`Task ${i + 1}`}
                onChange={(e) => setLabel(i, e.target.value)}
              />
              <span className="work-min">{workHint}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Templates</label>
        <div className="template-bar">
          {templates.map((tpl) =>
            renamingId === tpl.id ? (
              <input
                key={tpl.id}
                className="chip-rename-input"
                value={renameValue}
                autoFocus
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  else if (e.key === 'Escape') setRenamingId(null)
                }}
                aria-label={`Rename template ${tpl.name}`}
              />
            ) : (
              <div className="chip-wrap" key={tpl.id}>
                <button className="chip" onClick={() => onLoadTemplate(tpl.id)}>
                  {tpl.name}
                </button>
                <button
                  className="chip-edit"
                  title={`Rename "${tpl.name}"`}
                  aria-label={`Rename template ${tpl.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    startRename(tpl)
                  }}
                >
                  ✎
                </button>
                <button
                  className="chip-remove"
                  title={`Remove "${tpl.name}"`}
                  aria-label={`Remove template ${tpl.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteTemplate(tpl.id)
                  }}
                >
                  ×
                </button>
              </div>
            )
          )}
          {savingName !== null ? (
            <div className="chip-wrap chip-saving">
              <input
                className="chip-rename-input"
                value={savingName}
                autoFocus
                onChange={(e) => setSavingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitSave()
                  else if (e.key === 'Escape') setSavingName(null)
                }}
                aria-label="New template name"
              />
              <button className="chip-edit" title="Save" aria-label="Save template" onClick={commitSave}>
                ✓
              </button>
              <button
                className="chip-remove"
                title="Cancel"
                aria-label="Cancel saving template"
                onClick={() => setSavingName(null)}
              >
                ×
              </button>
            </div>
          ) : (
            <button className="chip add" onClick={() => setSavingName(defaultTemplateName())}>
              + Save current
            </button>
          )}
        </div>
      </div>

      <div className="field">
        <label>Theme</label>
        <div className="theme-picker">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`swatch${t.id === theme ? ' selected' : ''}`}
              onClick={() => onThemeChange(t.id)}
              title={t.name}
              aria-label={`Theme: ${t.name}`}
              aria-pressed={t.id === theme}
            >
              <span
                className="swatch-fill"
                style={{
                  background: `linear-gradient(135deg, ${t.swatchWork} 0 50%, ${t.swatchRest} 50% 100%)`
                }}
              />
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" onClick={() => onStart(currentCfg())}>
        Start session
      </button>
      <p className="hint">
        Between every step, PomPom takes over the screen with a short grace countdown — you confirm
        before the next step begins.
      </p>
    </section>
  )
}

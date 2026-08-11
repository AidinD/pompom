import { useState } from 'react'
import {
  DEFAULT_CFG,
  clampCount,
  growLabels,
  type Cfg
} from '@shared/model'

interface ConfigViewProps {
  /** Called with the finalized config when the user starts a session. */
  onStart: (cfg: Cfg) => void
}

/**
 * Config view (`#/`) — "New session".
 *
 * Ports the mock's config surface: pomodoro stepper (clamped 1..8, grows the
 * labels array), work/rest duration inputs, and one editable task-label row per
 * pomodoro. Templates persistence + the theme picker land in the next plan step;
 * this step keeps state local to the view.
 *
 * Duration inputs are kept as raw strings so the fields can be cleared/edited
 * smoothly; they resolve to numbers (with the mock's 25/5 fallbacks) on start.
 */
export default function ConfigView({ onStart }: ConfigViewProps): JSX.Element {
  const [count, setCount] = useState(DEFAULT_CFG.count)
  const [work, setWork] = useState(String(DEFAULT_CFG.work))
  const [rest, setRest] = useState(String(DEFAULT_CFG.rest))
  const [labels, setLabels] = useState<string[]>(DEFAULT_CFG.labels)

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

  function handleStart(): void {
    const cfg: Cfg = {
      count,
      work: parseInt(work, 10) || DEFAULT_CFG.work,
      rest: parseInt(rest, 10) || DEFAULT_CFG.rest,
      labels: growLabels(labels, count)
    }
    onStart(cfg)
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

      <button className="btn btn-primary" onClick={handleStart}>
        Start session
      </button>
      <p className="hint">
        Between every step, PomPom takes over the screen with a short grace countdown — you confirm
        before the next step begins.
      </p>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { DEFAULT_THEME, THEMES, applyTheme, type ThemeId } from '../themes/themes'
import type { TakeoverStep } from '@shared/ipc'

/** Grace-ring geometry (matches the mock: r=68 in a 150×150 viewBox). */
const GRACE_R = 68
const GRACE_C = 2 * Math.PI * GRACE_R

/** Narrow an arbitrary persisted theme string to a known ThemeId. */
function coerceTheme(id: string): ThemeId {
  return THEMES.some((t) => t.id === id) ? (id as ThemeId) : DEFAULT_THEME
}

/**
 * Takeover window (`#/takeover`) — the fullscreen, always-on-top step-change
 * screen. It shows a short grace countdown, then requires an explicit
 * "Confirm & continue" click before the timer advances. It NEVER auto-advances:
 * when the grace hits zero the timer stays paused indefinitely until the user
 * clicks confirm (mock `showTakeover` / `confirmStep` flow).
 *
 * This is a dumb view driven entirely by the main window's timer engine over
 * IPC: the pending step is fetched on mount (and via `onStep` pushes), and the
 * confirm click is relayed back through the main process to the main window.
 */
export default function TakeoverView(): JSX.Element {
  const [step, setStep] = useState<TakeoverStep | null>(null)
  const [graceLeft, setGraceLeft] = useState(0)
  const [ready, setReady] = useState(false)

  // Seed the pending step on mount, then keep listening for pushes.
  useEffect(() => {
    let cancelled = false
    void window.pompom.takeover.get().then((s) => {
      if (!cancelled && s) setStep(s)
    })
    const off = window.pompom.takeover.onStep((s) => setStep(s))
    return () => {
      cancelled = true
      off()
    }
  }, [])

  // Apply the active theme + the NEXT step's work/rest state so the takeover's
  // accent hue matches the step the user is about to enter.
  useEffect(() => {
    if (!step) return
    const state = step.type === 'rest' ? 'rest' : 'work'
    applyTheme(document.documentElement, coerceTheme(step.theme), state)
  }, [step])

  // Run the grace countdown. Derived from Date.now() so it stays honest, but the
  // display counts whole seconds like the mock. When it hits zero we only unlock
  // the confirm button — we do NOT advance the timer.
  useEffect(() => {
    if (!step) return
    const grace = step.graceSecs
    const endsAt = Date.now() + grace * 1000
    setReady(false)
    setGraceLeft(grace)
    const id = setInterval(() => {
      const now = Date.now()
      setGraceLeft(Math.max(0, Math.ceil((endsAt - now) / 1000)))
      if (now >= endsAt) {
        setGraceLeft(0)
        setReady(true)
        clearInterval(id)
      }
    }, 150)
    return () => clearInterval(id)
  }, [step])

  if (!step) return <div className="takeover active" />

  const isWork = step.type === 'work'
  const eyebrow = isWork ? 'Break over' : 'Nice work'
  const headline = isWork ? 'Back to focus' : 'Time for a break'
  const nextLabel = isWork ? step.label : 'Rest'
  const graceOffset = GRACE_C * (1 - graceLeft / step.graceSecs)

  return (
    <div className={`takeover active state-${isWork ? 'work' : 'rest'}`}>
      <div className="to-eyebrow">{eyebrow}</div>
      <div className="to-headline">{headline}</div>
      <div className="to-next">
        Up next:{' '}
        <b>
          {nextLabel} · {step.mins} min
        </b>
      </div>

      <div className={`grace-ring${ready ? ' done' : ''}`}>
        <div className="pulse-ring" />
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle className="grace-track" cx="75" cy="75" r={GRACE_R} />
          <circle
            className="grace-prog"
            cx="75"
            cy="75"
            r={GRACE_R}
            style={{ strokeDasharray: GRACE_C, strokeDashoffset: graceOffset }}
          />
        </svg>
        <div className="grace-num tabular">{graceLeft}</div>
      </div>
      <div className="grace-label">{ready ? 'Confirm to continue' : 'Get ready…'}</div>

      <button
        className={`btn-confirm${ready ? ' ready' : ''}`}
        onClick={() => window.pompom.takeover.confirm()}
      >
        Confirm &amp; continue
      </button>
      <div className="to-confirm-hint">
        {ready ? 'Waiting for you — the timer stays paused until you confirm.' : ''}
      </div>
    </div>
  )
}

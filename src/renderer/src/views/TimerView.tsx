import { useEffect, useState } from 'react'
import { fmt } from '@shared/model'
import { pickRestTip } from '@shared/restTips'
import type { TimerEngine } from '../hooks/useTimerEngine'

/** SVG ring geometry (matches the mock: r=110 in a 240×240 viewBox). */
const RING_R = 110
const RING_C = 2 * Math.PI * RING_R

interface TimerViewProps {
  engine: TimerEngine
  /** Whether the ambient meter bar is enabled (persisted in the parent). */
  ambientEnabled: boolean
  /** Toggle the ambient meter bar on/off. */
  onToggleAmbient: () => void
  /** Whether the pinned mini view is enabled (persisted in the parent). */
  miniPinned: boolean
  /** Toggle the pinned mini view on/off. */
  onToggleMini: () => void
}

/**
 * Timer view (`#/`) — the running-session surface.
 *
 * Ports the mock's timer markup: step badge, task label, circular countdown
 * ring, session sequence strip (with live fill on the current segment), next-up
 * hint, transport controls, and the ambient-meter toggle row. It is a pure view
 * over the engine snapshot — all timing/authority lives in `useTimerEngine`.
 *
 * The countdown ring draws `frac = remaining/total` of the circle and empties as
 * the step elapses; the sequence-strip fill and (later) the ambient bar mirror
 * the ELAPSED fraction `1 - frac`, exactly as in the mock.
 */
export default function TimerView({
  engine,
  ambientEnabled,
  onToggleAmbient,
  miniPinned,
  onToggleMini
}: TimerViewProps): JSX.Element {
  const { timeline, curIdx, step, cfg, remaining, frac, paused } = engine
  const isWork = step?.type !== 'rest'
  const count = cfg?.count ?? 0
  const pomoNum = (step?.pomoIndex ?? 0) + 1

  // Pick one rest-break suggestion per rest step (not on every render).
  const [restTip, setRestTip] = useState('')
  useEffect(() => {
    setRestTip(!isWork ? pickRestTip() : '')
  }, [curIdx, isWork])

  const ringSub = isWork ? `Pomodoro ${pomoNum} of ${count}` : `Break after pomodoro ${pomoNum}`

  const next = timeline[curIdx + 1]
  const nextText = next
    ? `${next.type === 'work' ? next.label : 'Rest'} · ${next.mins} min`
    : 'Session complete'

  return (
    <section className="view" id="view-timer">
      <div className="timer-wrap">
        <div className="step-badge">
          <span className="pulse-dot" />
          <span>{isWork ? 'Work' : 'Rest'}</span>
        </div>
        <div className="task-label">{isWork ? step?.label ?? '' : restTip}</div>

        <div className="ring-wrap">
          <svg width="240" height="240" viewBox="0 0 240 240">
            <circle className="ring-track" cx="120" cy="120" r={RING_R} />
            {/* keyed on curIdx so entering a step remounts the circle and
                replays the one-shot pulse animation (mock's `.pulsing` toggle). */}
            <circle
              key={curIdx}
              className="ring-prog pulse"
              cx="120"
              cy="120"
              r={RING_R}
              style={{
                strokeDasharray: RING_C,
                strokeDashoffset: RING_C * (1 - frac)
              }}
            />
          </svg>
          <div className="ring-center">
            <div className="ring-time tabular">{fmt(remaining)}</div>
            <div className="ring-sub">{ringSub}</div>
          </div>
        </div>

        <div className="sequence">
          {timeline.map((s, i) => {
            const cls = ['seg']
            if (s.type === 'rest') cls.push('rest-seg')
            if (i < curIdx) cls.push('done')
            else if (i === curIdx) cls.push('current')
            const fillWidth = i === curIdx ? `${(1 - frac) * 100}%` : '0%'
            return (
              <div className={cls.join(' ')} key={i}>
                <div className="seg-fill" style={{ width: fillWidth }} />
              </div>
            )
          })}
        </div>
        <div className="seq-caption">Session progress</div>

        <div className="next-up">
          Next: <b>{nextText}</b>
        </div>

        <div className="controls">
          <button className="btn btn-ghost" onClick={() => engine.togglePause()}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button className="btn btn-ghost" onClick={() => engine.skip()}>
            Skip →
          </button>
          <button
            className="btn btn-ghost icon-btn"
            title="Stop session"
            aria-label="Stop session"
            onClick={() => engine.stop()}
          >
            ■
          </button>
        </div>

        <div className="toggle-row">
          <span className="lbl">
            <span className="brand-mark" style={{ width: 12, height: 12 }} />
            Ambient meter bar
          </span>
          <button
            className={`switch${ambientEnabled ? ' on' : ''}`}
            role="switch"
            aria-checked={ambientEnabled}
            aria-label="Toggle ambient meter bar"
            onClick={onToggleAmbient}
          />
        </div>

        <div className="toggle-row">
          <span className="lbl">
            <span className="brand-mark" style={{ width: 12, height: 12 }} />
            Pin mini view
          </span>
          <button
            className={`switch${miniPinned ? ' on' : ''}`}
            role="switch"
            aria-checked={miniPinned}
            aria-label="Toggle pinned mini view"
            onClick={onToggleMini}
          />
        </div>
      </div>
    </section>
  )
}

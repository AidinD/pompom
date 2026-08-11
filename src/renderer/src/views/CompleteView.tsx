import type { Cfg } from '@shared/model'

interface CompleteViewProps {
  /** The config that just finished (drives the focus-time summary). */
  cfg: Cfg | null
  /** Return to the config view to start a new session. */
  onNewSession: () => void
}

/**
 * Session complete view (`#/`). Ports the mock's done surface: a check icon,
 * "Session complete", and a `{count} pomodoros · {h}h {m}m focused` summary
 * (total focus minutes = count × work). "New session" returns to config.
 */
export default function CompleteView({ cfg, onNewSession }: CompleteViewProps): JSX.Element {
  const count = cfg?.count ?? 0
  const totalMin = count * (cfg?.work ?? 0)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const summary = `${count} pomodoros · ${h ? `${h}h ` : ''}${m}m focused`

  return (
    <section className="view" id="view-done">
      <div className="complete-wrap">
        <div className="complete-check">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <div className="task-label" style={{ marginBottom: 8 }}>
          Session complete
        </div>
        <p className="hint" style={{ marginBottom: 24 }}>
          {summary}
        </p>
        <button className="btn btn-primary" onClick={onNewSession}>
          New session
        </button>
      </div>
    </section>
  )
}

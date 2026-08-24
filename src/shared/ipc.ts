/**
 * Cross-window IPC payloads (main <-> renderer windows).
 *
 * Kept in `src/shared` so the main process, the preload bridge, and the renderer
 * all agree on the exact shape. `theme` is a plain string here to avoid coupling
 * the main process to the renderer-only ThemeId union (the takeover renderer
 * narrows/validates it on load, exactly like the persisted store's `theme`).
 */

/**
 * Grace-period length before the takeover's "Confirm & continue" unlocks.
 * Hard-coded for v1 (configurable later).
 */
export const GRACE_SECS = 5

/** Info about the NEXT (pending) step, pushed to the takeover window. */
export interface TakeoverStep {
  /** Whether the next step is a work or rest block. */
  type: 'work' | 'rest'
  /** The next work step's task label (empty for rest). */
  label: string
  /** Duration of the next step in minutes. */
  mins: number
  /** Active theme id, so the takeover matches the main window. */
  theme: string
  /** Grace-period length in seconds. */
  graceSecs: number
}

/**
 * Live-state payload pushed to the ambient bar window (plan steps 9-10). The
 * bar is a dumb view: it just draws a fill whose width is the current step's
 * ELAPSED fraction, recolouring with the work/rest accent. The main-window timer
 * engine publishes one of these each tick while the ambient bar should be shown.
 */
export interface AmbientTick {
  /** Active theme id, so the bar's accent matches the main window. */
  theme: string
  /** Whether the current step is a work or rest block (drives the accent hue). */
  state: 'work' | 'rest'
  /** `1 - frac` — elapsed fraction of the current step; the bar's fill width. */
  elapsedFrac: number
}

/**
 * Live-state payload pushed to the pinned mini view (a tiny always-on-top
 * widget in the corner of the screen, shown while the main window is
 * minimized). Unlike the ambient bar it needs enough info to render a small
 * readable card with working Pause/Stop controls.
 */
export interface MiniTick {
  /** Active theme id, so the widget's accent matches the main window. */
  theme: string
  /** Whether the current step is a work or rest block. */
  state: 'work' | 'rest'
  /** Current step's task label ('Rest' for a rest step). */
  label: string
  /** Whole seconds remaining in the current step. */
  remaining: number
  paused: boolean
}

/** An action fired from the mini widget's controls, forwarded to the main window. */
export type MiniAction = 'pause' | 'stop'

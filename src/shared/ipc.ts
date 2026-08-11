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
 * Hard-coded for v1 (configurable later — see .helm-goal/plan.md).
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

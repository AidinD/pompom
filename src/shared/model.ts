/**
 * PomPom shared session model.
 *
 * The config `Cfg` and the derived `timeline` are the behavioral contract
 * ported verbatim from mock/index.html. Kept in `src/shared` so both the
 * renderer (config/timer views) and — later — the timer engine and IPC layer
 * can reuse the exact same types and helpers.
 */

export type StepType = 'work' | 'rest'

/** User-authored session configuration. `count` is clamped to 1..8. */
export interface Cfg {
  count: number
  work: number
  rest: number
  labels: string[]
}

/** One resolved step in the running session timeline. */
export interface TimelineStep {
  type: StepType
  label: string
  mins: number
  /** Index of the pomodoro this step belongs to (rest carries the pomo it follows). */
  pomoIndex: number
}

/** A reusable, named session template (persisted to disk in a later step). */
export interface Template {
  id: string
  name: string
  cfg: Cfg
}

export const LABELS_DEFAULT = [
  'Task A',
  'Task B',
  'Task C',
  'Task D',
  'Task E',
  'Task F',
  'Task G',
  'Task H'
]

export const MIN_COUNT = 1
export const MAX_COUNT = 8

/** Default config shown on a fresh session (matches the mock). */
export const DEFAULT_CFG: Cfg = {
  count: 4,
  work: 25,
  rest: 5,
  labels: ['Task A', 'Task B', 'Task C', 'Task D']
}

export function clampCount(n: number): number {
  return Math.max(MIN_COUNT, Math.min(MAX_COUNT, n))
}

/** Sensible default label for the i-th pomodoro (0-based). */
export function defaultLabel(i: number): string {
  return LABELS_DEFAULT[i] ?? `Task ${i + 1}`
}

/**
 * Grow the labels array up to `count` with default labels. Never shrinks the
 * stored labels — extra labels beyond count are just unused (mock behavior).
 */
export function growLabels(labels: string[], count: number): string[] {
  const next = labels.slice()
  while (next.length < count) next.push(defaultLabel(next.length))
  return next
}

/**
 * Build the running timeline: work,rest,work,rest,…,work.
 * A rest is inserted only BETWEEN pomodoros — no trailing rest after the last.
 * Task labels attach to work steps only.
 */
export function buildTimeline(cfg: Cfg): TimelineStep[] {
  const timeline: TimelineStep[] = []
  for (let i = 0; i < cfg.count; i++) {
    timeline.push({
      type: 'work',
      label: cfg.labels[i] || `Task ${i + 1}`,
      mins: cfg.work,
      pomoIndex: i
    })
    if (i < cfg.count - 1) {
      timeline.push({ type: 'rest', label: 'Rest', mins: cfg.rest, pomoIndex: i })
    }
  }
  return timeline
}

/**
 * Format a seconds value as `MM:SS`, zero-padded. Negative values clamp to 0
 * (ported from the mock's `fmt`). Fractional seconds are floored.
 */
export function fmt(s: number): string {
  const clamped = Math.max(0, Math.floor(s))
  const m = Math.floor(clamped / 60)
  const ss = clamped % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

/** Seed templates shown on first run (matches the mock's two chips). */
export const SEED_TEMPLATES: Template[] = [
  {
    id: 'deep',
    name: 'Deep work · 4×50/10',
    cfg: { count: 4, work: 50, rest: 10, labels: ['Writing', 'Writing', 'Review', 'Planning'] }
  },
  {
    id: 'classic',
    name: 'Classic · 4×25/5',
    cfg: { count: 4, work: 25, rest: 5, labels: ['Task A', 'Task B', 'Task C', 'Task D'] }
  }
]

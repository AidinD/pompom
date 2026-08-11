/**
 * PomPom wall-clock timer engine (plan step 5).
 *
 * The main-window renderer owns the running timeline + countdown. This hook is
 * the single source of truth for the timer's state; the timer view (step 6) and
 * the IPC fan-out to the takeover / ambient windows (steps 8-10) subscribe to
 * the snapshot it publishes.
 *
 * Timing is derived from `Date.now()` deltas, NOT a decrementing counter, so it
 * stays correct across pause and tab/window backgrounding (the mock decremented
 * a counter every second — fine for a demo, wrong for real wall-clock time).
 *
 * Step-finish contract (mirrors the mock's `stepFinished`): when a step's time
 * runs out we STOP — if it was the last step the session completes, otherwise we
 * move to the `awaiting` phase and signal the takeover for the next step. We do
 * NOT auto-advance; only an explicit `confirm()` enters the next step.
 */
import { useEffect, useRef, useState } from 'react'
import { buildTimeline, type Cfg, type TimelineStep } from '@shared/model'

/** How often the engine recomputes/publishes while a step is running (ms). */
const TICK_MS = 200

export type TimerPhase =
  | 'idle' // no session running
  | 'running' // a step is counting down (may be paused)
  | 'awaiting' // step finished, waiting for the user to confirm the next one
  | 'complete' // the whole session finished

/** Immutable snapshot of the engine, consumed by the views. */
export interface TimerSnapshot {
  timeline: TimelineStep[]
  cfg: Cfg | null
  /** Index into `timeline` of the current (or just-finished) step. */
  curIdx: number
  step: TimelineStep | null
  /** Whole seconds remaining in the current step, clamped >= 0. */
  remaining: number
  /** Total seconds in the current step. */
  total: number
  /** `remaining / total` (1 → full, 0 → done). Drives the countdown ring. */
  frac: number
  /** `1 - frac` — elapsed fraction; drives the sequence strip + ambient bar. */
  elapsedFrac: number
  paused: boolean
  phase: TimerPhase
  /** When `phase === 'awaiting'`, the timeline index the takeover is gating. */
  pendingIdx: number | null
}

/** Optional lifecycle callbacks (used to drive takeover / complete / stop). */
export interface TimerCallbacks {
  /** A step just finished and the next one is pending confirmation. */
  onStepPending?(nextIdx: number, timeline: TimelineStep[]): void
  /** A step just became active (fresh start or confirmed advance). */
  onEnterStep?(idx: number, timeline: TimelineStep[]): void
  /** The final step finished — the session is complete. */
  onComplete?(cfg: Cfg): void
  /** The session was stopped early via `stop()`. */
  onStop?(): void
}

export interface TimerEngine extends TimerSnapshot {
  start(cfg: Cfg): void
  togglePause(): void
  pause(): void
  resume(): void
  /** Cut the current step short → goes to the takeover for the next step. */
  skip(): void
  /** Abort the whole session and return to idle. */
  stop(): void
  /** Enter the pending step (only valid in the `awaiting` phase). */
  confirm(): void
}

function idleSnapshot(): TimerSnapshot {
  return {
    timeline: [],
    cfg: null,
    curIdx: 0,
    step: null,
    remaining: 0,
    total: 0,
    frac: 0,
    elapsedFrac: 0,
    paused: false,
    phase: 'idle',
    pendingIdx: null
  }
}

export function useTimerEngine(callbacks: TimerCallbacks = {}): TimerEngine {
  const [snap, setSnap] = useState<TimerSnapshot>(idleSnapshot)

  // Mutable timing internals live in refs so they never trigger a render on
  // their own and are never stale inside the interval callback.
  const timelineRef = useRef<TimelineStep[]>([])
  const cfgRef = useRef<Cfg | null>(null)
  const curIdxRef = useRef(0)
  /** `Date.now()` (ms) at which the current step ends. */
  const endsAtRef = useRef(0)
  /** `Date.now()` (ms) captured when paused, or null when running. */
  const pausedAtRef = useRef<number | null>(null)
  const phaseRef = useRef<TimerPhase>('idle')
  const pendingIdxRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep the latest callbacks + tick logic reachable from the stable interval.
  const cbRef = useRef(callbacks)
  cbRef.current = callbacks
  const tickRef = useRef<() => void>(() => {})

  function computeRemaining(): number {
    const step = timelineRef.current[curIdxRef.current]
    if (!step) return 0
    // While paused, freeze "now" at the pause instant so remaining holds steady.
    const now = pausedAtRef.current ?? Date.now()
    return Math.max(0, Math.ceil((endsAtRef.current - now) / 1000))
  }

  function publish(): void {
    const timeline = timelineRef.current
    const idx = curIdxRef.current
    const step = timeline[idx] ?? null
    const total = step ? step.mins * 60 : 0
    const remaining = computeRemaining()
    const frac = total ? remaining / total : 0
    setSnap({
      timeline,
      cfg: cfgRef.current,
      curIdx: idx,
      step,
      remaining,
      total,
      frac,
      elapsedFrac: 1 - frac,
      paused: pausedAtRef.current !== null,
      phase: phaseRef.current,
      pendingIdx: pendingIdxRef.current
    })
  }

  function stopTicking(): void {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }
  function ensureTicking(): void {
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => tickRef.current(), TICK_MS)
    }
  }

  function enterStep(idx: number): void {
    const step = timelineRef.current[idx]
    if (!step) return
    curIdxRef.current = idx
    pendingIdxRef.current = null
    pausedAtRef.current = null
    phaseRef.current = 'running'
    endsAtRef.current = Date.now() + step.mins * 60 * 1000
    ensureTicking()
    cbRef.current.onEnterStep?.(idx, timelineRef.current)
    publish()
  }

  function stepFinished(): void {
    stopTicking()
    const timeline = timelineRef.current
    const nextIdx = curIdxRef.current + 1
    if (nextIdx >= timeline.length) {
      phaseRef.current = 'complete'
      pendingIdxRef.current = null
      publish()
      if (cfgRef.current) cbRef.current.onComplete?.(cfgRef.current)
      return
    }
    // Do NOT auto-advance — hand off to the takeover and wait for confirm().
    phaseRef.current = 'awaiting'
    pendingIdxRef.current = nextIdx
    publish()
    cbRef.current.onStepPending?.(nextIdx, timeline)
  }

  function onTick(): void {
    if (phaseRef.current !== 'running' || pausedAtRef.current !== null) return
    if (Date.now() >= endsAtRef.current) {
      stepFinished()
      return
    }
    publish()
  }
  tickRef.current = onTick

  // ---- actions ------------------------------------------------------------

  function start(cfg: Cfg): void {
    timelineRef.current = buildTimeline(cfg)
    cfgRef.current = cfg
    enterStep(0)
  }

  function pause(): void {
    if (phaseRef.current !== 'running' || pausedAtRef.current !== null) return
    pausedAtRef.current = Date.now()
    publish()
  }

  function resume(): void {
    if (phaseRef.current !== 'running' || pausedAtRef.current === null) return
    // Push the end time forward by however long we were paused.
    endsAtRef.current += Date.now() - pausedAtRef.current
    pausedAtRef.current = null
    publish()
  }

  function togglePause(): void {
    if (pausedAtRef.current === null) pause()
    else resume()
  }

  function skip(): void {
    if (phaseRef.current !== 'running') return
    stepFinished()
  }

  function stop(): void {
    stopTicking()
    timelineRef.current = []
    cfgRef.current = null
    curIdxRef.current = 0
    endsAtRef.current = 0
    pausedAtRef.current = null
    pendingIdxRef.current = null
    phaseRef.current = 'idle'
    publish()
    cbRef.current.onStop?.()
  }

  function confirm(): void {
    if (phaseRef.current !== 'awaiting' || pendingIdxRef.current === null) return
    enterStep(pendingIdxRef.current)
  }

  // Clear the interval if the hook unmounts mid-session.
  useEffect(() => stopTicking, [])

  return {
    ...snap,
    start,
    togglePause,
    pause,
    resume,
    skip,
    stop,
    confirm
  }
}

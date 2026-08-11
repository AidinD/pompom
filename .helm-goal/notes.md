# Goal orchestrator notes

This file is the ONLY continuity mechanism between iterations — each
iteration runs in a fresh subprocess with no conversation memory. See
DECISIONS.md / PLAN.md (Fas 3 Point 11) in the Helm repo for why.

---

# RESEARCH FINDINGS (iteration 1 — 2026-08-11)

## ⚠️ CRITICAL: where the mock files actually live
This worktree is at
`D:/Repo/Tools/PomPom-worktrees/goal-308c740c-...` on branch
`helm/goal-308c740c-...`, based on commit e3278b9 which only has
README/PLAN/DECISIONS (the OLD, "pre-mock" versions) and **no `mock/`
directory**.

The `mock/` HTML files AND the newer, fuller PLAN.md/DECISIONS.md exist ONLY
as **uncommitted files in the MAIN repo working tree**:
- `D:/Repo/Tools/PomPom/mock/index.html`          (Neon Dark — primary spec, 819 lines)
- `D:/Repo/Tools/PomPom/mock/variant-b-paper.html` (Warm Paper Dark)
- `D:/Repo/Tools/PomPom/mock/variant-d-nature.html`(Nature)
- `D:/Repo/Tools/PomPom/mock/compare.html`         (just a comparison index page — ignore)
- `D:/Repo/Tools/PomPom/PLAN.md` and `.../DECISIONS.md` (newer than the worktree copies)

The main repo is a sibling on disk and is readable. **Future iterations: read
the mocks from `D:/Repo/Tools/PomPom/mock/*.html`** (they are not in this
worktree and not on any branch). Do NOT edit them. This notes file already
captures the full spec below, so re-reading is optional.

## Toolchain (verified available)
- node v24.11.1, npm 11.6.2 present. Windows environment (Git Bash shell).
- `npm run dev` must launch the Electron app for the sanity check at the end.

## Recommended stack / structure
- **electron-vite** (`npm create @quick-start/electron` scaffolds main/preload/
  renderer with Vite + React + TS cleanly) OR a manual Vite+Electron setup.
  electron-vite is the simplest standard path and gives HMR for the renderer.
- TypeScript is fine (node 24, no time sink with electron-vite template).
- Three BrowserWindows: main (config/timer), takeover (fullscreen+alwaysOnTop),
  ambient bar (frameless transparent alwaysOnTop click-through). Keep timer
  state authority in the MAIN process (or the main renderer) and drive the two
  auxiliary windows via IPC, so they stay in sync. Simplest: keep the timeline/
  countdown engine in the main-window renderer and use `ipcRenderer`→main→
  `webContents.send` to push state to takeover + ambient windows. Either works;
  decide in plan phase. Main-process-owned timer is cleaner for multi-window.
- Persistence: JSON file in `app.getPath('userData')` (e.g. `pompom-store.json`)
  or `electron-store`. Store: templates[], last config, chosen theme, ambient
  toggle. Must survive restart (NOT localStorage).

## THE FOUR SURFACES (all in index.html — this is the behavioral contract)

### Shared state model (from inline JS, lines 502-816)
```
cfg = { count:4, work:25, rest:5, labels:['Task A','Task B','Task C','Task D'] }
LABELS_DEFAULT = ['Task A'..'Task H']
timeline = [{type:'work'|'rest', label, mins, pomoIndex}]
```
- `changeCount(delta)`: clamp count to **1..8**; grow `labels` array with
  `LABELS_DEFAULT[i] || 'Task '+(i+1)` when count increases (never shrinks the
  stored labels — extra labels beyond count are just unused).
- **Timeline build**: for i in 0..count-1: push work step; if i < count-1 push a
  rest step. => work,rest,work,rest,...,work. **No trailing rest** after last
  pomodoro. Rest steps carry `pomoIndex:i` (the pomo they follow). Work labels =
  `cfg.labels[i]`.

### 1. CONFIG VIEW (`#view-config`)
- Title "New session".
- Pomodoro stepper: `– [count] +`, buttons call changeCount(±1), clamp 1..8.
- Work/Rest number inputs (min=1), default 25 / 5, unit "min".
- "Task per pomodoro": one `.step-row` per count with numbered `.step-index`
  badge, editable input (placeholder `Task {i+1}`, value `cfg.labels[i]`), and a
  `{workDur}m` hint on the right. Re-renders on count change AND on workDur input.
- Templates: chips. Two seed templates in mock:
  - `deep`   => {count:4, work:50, rest:10, labels:['Writing','Writing','Review','Planning']}, chip "Deep work · 4×50/10"
  - `classic`=> {count:4, work:25, rest:5,  labels:['Task A','Task B','Task C','Task D']}, chip "Classic · 4×25/5"
  - `+ Save current` (dashed chip) => saveTemplate(): name `Custom · {count}×{work}/{rest}`.
  In the REAL app these must persist to disk & reload as clickable chips.
- "Start session" primary button => startSession(): reads work/rest inputs,
  builds timeline, renderSequence(), enterStep(0), showView('timer').
- Hint copy: "Between every step, PomPom takes over the screen with a short
  grace countdown — you confirm before the next step begins."

### 2. TIMER VIEW (`#view-timer`)
- `.step-badge`: pulsing dot + text "Work"/"Rest", colored with `--accent`.
- `.task-label`: current step.label (big).
- **Ring**: SVG 240×240, `<circle r=110>` track + prog. `RING_C = 2π·110`.
  `strokeDasharray = RING_C`; `strokeDashoffset = RING_C * (1 - frac)` where
  `frac = remaining/total`. svg rotated -90deg. Prog stroke = --accent + glow.
- Center: `.ring-time` = `fmt(remaining)` (MM:SS, zero-padded); `.ring-sub` =
  work→`Pomodoro {pomoNum} of {count}`, rest→`Break after pomodoro {pomoNum}`
  (pomoNum = pomoIndex+1).
- **Sequence strip** (`#sequence`): one `.seg` per timeline step; rest steps get
  `.rest-seg` (narrower, dimmer). States: `.done` (i<curIdx), `.current`
  (i===curIdx). Current seg has `.seg-fill` whose width = **elapsed** %
  `((1-frac)*100)%`. Caption "Session progress".
- **Next-up**: `Next: <b>{next work label | 'Rest'} · {mins} min</b>`, or
  `Next: <b>Session complete</b>` on last step.
- **Controls**: Pause/Resume (togglePause), `Skip →` (skipStep → jumps straight
  to takeover for next step), Stop `■` (stopSession → back to config).
- **Toggle row**: "Ambient meter bar" switch → toggleAmbient().
- **Ring pulse on step change**: enterStep removes+reflows+adds `.pulsing` on
  `.window` (`void win.offsetWidth` forces reflow to restart the CSS animation).

### Timer engine details (MUST get right per goal)
- Mock uses naive `remaining -= 1` each tick (setInterval 1000ms real / 33ms
  fast-demo). **The real app must base remaining time off `Date.now()` deltas**
  (wall-clock), not decrement counters, so pause and background drift are
  correct. Track e.g. `stepEndsAt` timestamp and accumulated paused time.
- `fmt(s)`: clamp ≥0, MM:SS zero-padded.
- On step end (`stepFinished`): if `curIdx+1 >= timeline.length` → showComplete;
  else showTakeover(curIdx+1). Timer does NOT auto-advance; takeover gates it.
- The mock's `fast`/demo-speed + `.mocknav` + `.speed-toggle` + `.back-link`
  are MOCK-ONLY dev scaffolding — DO NOT port them to the app.

### 3. TAKEOVER (`.takeover` overlay in mock; a SEPARATE fullscreen+alwaysOnTop
   BrowserWindow in the app)
- Trigger: whenever a step FINISHES (work→rest or rest→work), before next step.
- Content: eyebrow, headline, "up next", a **grace ring** counting DOWN from
  `GRACE_SECS = 5`, grace label, and a **Confirm & continue** button that is
  DISABLED/dimmed (`opacity:.45; pointer-events:none`) during grace, then gets
  `.ready` (pulsing) when grace hits 0.
- Copy depends on the NEXT step type:
  - next is WORK (i.e. break just ended): eyebrow "Break over", headline
    "Back to focus", next `Up next: <b>{label} · {mins} min</b>`.
  - next is REST: eyebrow "Nice work", headline "Time for a break", next
    `Up next: <b>Rest · {mins} min</b>`.
- Grace ring: SVG 150×150, r=68, `GRACE_C=2π·68`. Counts down 5→0, offset goes
  `GRACE_C*(1 - g/5)`. At 0: graceNum "0", label "Confirm to continue", ring
  gets `.done` (pulse-ring animation), confirmBtn `.ready`, hint "Waiting for
  you — the timer stays paused until you confirm."
- **CONTRACT (critical, from DECISIONS): after grace expires the timer STAYS
  paused and does NOT auto-start. It waits indefinitely for the explicit
  Confirm click.** confirmStep() → hide takeover → enterStep(pendingIdx).
- In the real app: takeover is `fullscreen:true, alwaysOnTop:true`, suppresses
  taskbar/other windows as far as Electron allows (no hard OS lock — out of
  scope). Show it on step change, hide/destroy on confirm.

### 4. SESSION COMPLETE (`#view-done`)
- Check icon, "Session complete", summary `{count} pomodoros · {h}h {m}m
  focused` (totalMin = count*work), "New session" → config.

### AMBIENT BAR (optional, toggled from timer view)
- App: a THIRD frameless, transparent-bg BrowserWindow pinned to top of primary
  display, alwaysOnTop, click-through via `win.setIgnoreMouseEvents(true,
  {forward:true})`. Thin bar (4px in mock).
- Fill width = **elapsed** fraction of current step `((1-frac)*100)%` (mirrors
  ring). Recolors with work/rest accent. Toggled by the switch; persist toggle.
- In mock it's just a strip inside `.window` (`.ambient-bar.on`); in the app
  it's a real separate window.

## THEME SYSTEM — port these CSS-var palettes verbatim (3 themes)
All themes = same markup/behavior, only CSS custom properties swap at app root.
`.state-work`/`.state-rest` override `--accent`(+soft/glow) for hue shift.

### Neon Dark (index.html) — DEFAULT. Font: Inter/sans. Uses glow.
```
--bg:#0d0f13; --bg-2:#14171d; --surface:#191d25; --surface-2:#20252f;
--border:#2a303b; --text:#eef1f6; --text-dim:#9aa3b2; --text-faint:#5c6472;
work:  --accent:#3ddc97; --accent-soft:rgba(61,220,151,.14); --accent-glow:rgba(61,220,151,.40)
rest:  --accent:#ffab4d; --accent-soft:rgba(255,171,77,.14); --accent-glow:rgba(255,171,77,.40)
--radius:16px --radius-sm:10px  ease:cubic-bezier(.22,.61,.36,1)
button text on accent: #0d0f13
```

### Warm Paper Dark (variant-b-paper.html). Font: serif (Iowan/Georgia/Charter).
**No glow** (no --accent-glow); uses `--accent-ink` for on-accent text.
```
--bg:#1b1712; --bg-2:#221c15; --surface:#262019; --surface-2:#2e271d;
--border:#3d3324; --text:#efe6d4; --text-dim:#b7a98d; --text-faint:#7c715c;
work: --accent:#d99567; --accent-soft:rgba(217,149,103,.14)
rest: --accent:#9db179; --accent-soft:rgba(157,177,121,.14)
--accent-ink:#241b11  --radius:14px --radius-sm:9px
```

### Nature (variant-d-nature.html). Font: Inter/sans. No glow. --accent-ink.
```
--bg:#11150e; --bg-2:#161c11; --surface:#1a2114; --surface-2:#212a19;
--border:#2c3722; --text:#e7ecd9; --text-dim:#9fac89; --text-faint:#616f4c;
work: --accent:#86a563; --accent-soft:rgba(134,165,99,.14)
rest: --accent:#c6883f; --accent-soft:rgba(198,136,63,.14)
--accent-ink:#12160c  --radius:18px --radius-sm:12px
```
Design note (DECISIONS): "Slate Mono" variant was dropped; Warm Paper was
reworked from light to dark. Only these 3 themes ship in v1. Add a theme picker
(row of swatch buttons) in config; persist the choice.
On-accent text color differs per theme (`#0d0f13` neon vs `--accent-ink` others)
— parameterize it as a CSS var (e.g. `--accent-ink`) across all themes so
buttons read correctly. Glow effects should degrade gracefully when a theme has
no `--accent-glow` (define it as transparent/none for paper & nature).

## DELIVERABLES CHECKLIST (from goal)
- Runnable app; `npm install && npm run dev` documented in README.md.
- package.json scripts: dev + build.
- Update PLAN.md "Current status" to say the Electron app now exists + what's
  left (packaging/dist, real icon, deferred features).
- Do NOT touch mock/ HTML. No `git commit` (orchestrator commits).
- **Sanity check: launch the app once (background/short-lived) to confirm
  `npm run dev` starts without crashing, then STOP it before finishing.**

## OPEN QUESTIONS / decisions to make in PLAN phase
1. Timer authority: main process vs main renderer? (Recommend main-window
   renderer owns the engine for v1 simplicity, pushes state to takeover+ambient
   windows via a small IPC bridge in preload.) Revisit if it gets messy.
2. Since the worktree lacks the mock + updated PLAN/DECISIONS, decide whether to
   ALSO copy the mock/ dir + updated docs into this worktree (goal says "do not
   touch the mock/ directory's HTML files" — that's about editing, not about
   whether they exist here). Recommend: create the app scaffold in this worktree;
   read mocks from the main repo path. The updated PLAN.md we must edit is the
   worktree's copy (older) — bring its "Current status"/theme line up to date.
3. Grace period configurable "later" — 5s hard default is fine for v1.
4. electron-vite multi-window: entry per window (or single renderer with hash
   routes and separate BrowserWindow loading `#takeover` / `#ambient`). Hash/
   query-routed single renderer bundle is the least-setup approach.


## Iteration 1 — success

Summary: Research PomPom build: capture mock spec, theme palettes, and toolchain into .helm-goal/notes.md

Key changes:
- Appended detailed RESEARCH FINDINGS to .helm-goal/notes.md covering all four surfaces, the shared state/timeline model, timer engine requirements, and the takeover grace/confirm contract extracted from mock/index.html
- Documented all three theme CSS-variable palettes (Neon Dark, Warm Paper Dark, Nature) verbatim for direct porting
- Flagged the critical location issue: mock/ and updated PLAN/DECISIONS exist only in the sibling main repo D:/Repo/Tools/PomPom, not in this worktree
- Recorded recommended stack (electron-vite+React+TS, 3 BrowserWindows, userData JSON persistence) and open questions for the plan phase

Key learnings:
- Mocks are NOT in this worktree/branch — read them from D:/Repo/Tools/PomPom/mock/index.html, variant-b-paper.html, variant-d-nature.html (uncommitted in the main repo, readable on disk). compare.html is just an index page.
- The worktree's PLAN.md/DECISIONS.md are the OLD pre-mock versions; the main repo has newer fuller copies. The PLAN.md we must update is the worktree's older copy.
- node v24.11.1 / npm 11.6.2 available; Windows + Git Bash. Sanity check requires `npm run dev` to launch Electron without crashing, then stop it.
- Timeline rule: work,rest,...,work with NO trailing rest; labels attach to work steps only; count clamped 1-8. Takeover must NOT auto-advance after 5s grace — requires explicit Confirm click.
- Real app must derive remaining time from Date.now() deltas (not decrement counters). Mock's fast/demo-speed, .mocknav, .speed-toggle, .back-link are mock-only scaffolding — do not port.
- Only 3 themes ship (Slate Mono dropped, Warm Paper is dark). Neon uses --accent-glow; Paper/Nature have no glow and use --accent-ink for on-accent text — parameterize on-accent text and glow as CSS vars across all themes.

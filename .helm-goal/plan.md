# PomPom implementation plan

Build the PomPom Electron + React (Windows-only) desktop app from scratch in
this worktree. The behavioral/visual contract is fully captured in
`.helm-goal/notes.md` (RESEARCH FINDINGS) and in the mock files at
`D:/Repo/Tools/PomPom/mock/index.html` (Neon Dark = primary spec),
`variant-b-paper.html` (Warm Paper Dark), `variant-d-nature.html` (Nature).
**Read those from the sibling main repo — they are NOT in this worktree. Never
edit them.** compare.html is only an index page; ignore it.

## Architecture decisions (locked for this plan)

- **Scaffold:** `electron-vite` + React + TypeScript. It is the simplest
  standard multi-window path with renderer HMR. If TS setup ever becomes a real
  time sink, fall back to plain JS/JSX — do not burn an iteration fighting types.
- **Windows:** three `BrowserWindow`s —
  1. **main** (config/timer/complete views),
  2. **takeover** (`fullscreen:true`, `alwaysOnTop:true`),
  3. **ambient** (frameless, transparent, `alwaysOnTop`, click-through via
     `setIgnoreMouseEvents(true,{forward:true})`, pinned to top of primary
     display).
- **Timer authority:** the **main-window renderer** owns the timeline +
  countdown engine (React state/hook). It pushes state to the takeover and
  ambient windows over IPC (`ipcRenderer.send` → main relays via
  `webContents.send`). The two aux windows are dumb views. This keeps v1 simple;
  revisit only if it gets messy.
- **Routing:** single renderer bundle, window role selected by URL hash/query
  (`#/` main, `#/takeover`, `#/ambient`). Main creates aux windows loading the
  same bundle with the corresponding hash. (electron-vite serves one renderer;
  hash routing avoids multiple build entries.)
- **Persistence:** JSON file at `app.getPath('userData')/pompom-store.json`
  (hand-rolled read/write in main; expose get/set over IPC). Stores:
  `templates[]`, `lastConfig`, `theme`, `ambientEnabled`. Must survive restart
  (NOT localStorage). `electron-store` is an acceptable substitute if preferred,
  but hand-rolled JSON keeps deps minimal.
- **Grace period:** hard-coded `GRACE_SECS = 5` for v1 (comment it as
  "configurable later").
- **Do NOT port mock-only scaffolding:** `fast`/demo-speed, `.mocknav`,
  `.speed-toggle`, `.back-link`.

## Shared model (port verbatim from notes/mock)

```
cfg = { count, work, rest, labels[] }          // count clamped 1..8
LABELS_DEFAULT = ['Task A'..'Task H']
timeline: for i in 0..count-1 { push work(label=labels[i], pomoIndex=i);
          if i<count-1 push rest(pomoIndex=i) }   // NO trailing rest
step = { type:'work'|'rest', label, mins, pomoIndex }
```
Seed templates: `deep` = 4×50/10 labels [Writing,Writing,Review,Planning]
(chip "Deep work · 4×50/10"); `classic` = 4×25/5 labels [Task A..D]
(chip "Classic · 4×25/5").

## Implementation steps (small, sequential — one per implement iteration)

Each step should end in a compiling/coherent tree. `npm run dev` need not launch
until the scaffold step is done; after that, keep it launchable.

1. **Scaffold the app.** Run the electron-vite React+TS scaffold into this
   worktree root (keep `PLAN.md`/`DECISIONS.md`/`README.md`/`.gitignore`; do not
   clobber them — scaffold into a temp dir and move files in if needed, or use a
   scaffold that respects existing files). Result: `package.json` with `dev` and
   `build` scripts, `electron.vite.config.*`, `src/main`, `src/preload`,
   `src/renderer`. Verify `npm install` succeeds. Do NOT yet worry about the
   three-window setup. Confirm `.gitignore` still covers `node_modules/ dist/
   out/`. (Don't launch yet if scaffold's default demo needs trimming — next
   steps handle that.)

2. **Theme system (CSS variables).** Create a `themes` module/CSS defining the
   three palettes exactly as in notes.md (Neon Dark default, Warm Paper Dark,
   Nature) as sets of CSS custom properties on a root element, with
   `.state-work`/`.state-rest` overriding `--accent`/`--accent-soft`/
   `--accent-glow`. Parameterize on-accent text as `--accent-ink` in ALL themes
   (Neon `#0d0f13`, others their listed ink). Define `--accent-glow` as
   transparent/none for Paper & Nature so glow degrades gracefully. Include the
   per-theme `--radius`/`--radius-sm` and font-family. Provide a helper to apply
   a theme by id to the app root and a work/rest state class.

3. **Config view (React).** Build `#/` config view matching the mock: title
   "New session"; pomodoro stepper `– [count] +` (clamp 1..8, grow labels with
   `LABELS_DEFAULT[i] || 'Task '+(i+1)`, never shrink stored labels); work/rest
   number inputs (min=1, default 25/5, unit "min"); "Task per pomodoro" rows
   (numbered badge, editable input placeholder `Task {i+1}`, `{work}m` hint),
   re-rendering on count AND work changes; hint copy about the takeover grace
   countdown; a "Start session" primary button (wire to a stub for now). No
   persistence yet. Use local React state for `cfg`.

4. **Templates persistence.** Add the persistence IPC bridge (main:
   read/write `pompom-store.json`; preload: expose `store.get/set`). Render
   template chips (seed `deep` + `classic` on first run), a dashed
   `+ Save current` chip (saveTemplate → name `Custom · {count}×{work}/{rest}`),
   clicking a chip loads its cfg. Persist `templates[]` + `lastConfig` to disk;
   reload on launch. Also persist chosen theme + add a theme-picker swatch row in
   config (persists selection, applies immediately).

5. **Timer engine hook.** Implement a wall-clock countdown hook that owns
   `timeline`, `curIdx`, and per-step timing derived from `Date.now()` deltas
   (track `stepEndsAt` + accumulated paused ms; NOT decrementing counters).
   Exposes `remaining`, `total`, `frac = remaining/total`, `paused`, and
   actions: `start(cfg)`, `pause/resume`, `skip`, `stop`, plus a `stepFinished`
   callback. On step finish: if `curIdx+1 >= timeline.length` → complete; else
   signal takeover for `curIdx+1` and DO NOT auto-advance. `fmt(s)` = clamp ≥0,
   MM:SS zero-padded.

6. **Timer view (React).** Build `#/` timer view: `.step-badge` (pulsing dot +
   "Work"/"Rest", `--accent`); big `.task-label`; SVG ring 240×240, `r=110`,
   `RING_C=2π·110`, `strokeDasharray=RING_C`,
   `strokeDashoffset=RING_C*(1-frac)`, rotated -90°, prog stroke `--accent`+glow;
   center `.ring-time`=`fmt(remaining)`, `.ring-sub` (work→`Pomodoro {n} of
   {count}`, rest→`Break after pomodoro {n}`, n=pomoIndex+1); sequence strip
   (`.seg` per step, `.rest-seg` narrower/dimmer, `.done` i<curIdx, `.current`
   i===curIdx with `.seg-fill` width=`(1-frac)*100`% = ELAPSED; caption "Session
   progress"); next-up hint (`Next: {next work label|'Rest'} · {mins} min` or
   "Session complete"); controls Pause/Resume, `Skip →`, Stop `■`; toggle row
   "Ambient meter bar". Apply `.state-work`/`.state-rest` class on the root for
   hue shift. Ring pulse on step change: toggle `.pulsing` on the `.window`
   element with a forced reflow (`void el.offsetWidth`) to restart the CSS anim.

7. **Session complete view.** `#/` done view: check icon, "Session complete",
   summary `{count} pomodoros · {h}h {m}m focused` (totalMin=count*work),
   "New session" button → back to config.

8. **Takeover window.** In main, on the "step finished, next step pending"
   signal, create/show the takeover `BrowserWindow` (`fullscreen:true`,
   `alwaysOnTop:true`, `skipTaskbar:true`) loading `#/takeover`; pass the next
   step's info via IPC. Takeover renders: eyebrow/headline/up-next copy per NEXT
   step type (next=WORK: "Break over" / "Back to focus" / `Up next: {label} ·
   {mins} min`; next=REST: "Nice work" / "Time for a break" / `Up next: Rest ·
   {mins} min`); grace ring SVG 150×150, `r=68`, `GRACE_C=2π·68`, counting
   5→0, offset `GRACE_C*(1-g/5)`; **Confirm & continue** button disabled/dimmed
   (`opacity:.45; pointer-events:none`) during grace, gets `.ready` (pulsing) at
   0; at 0 label "Confirm to continue", ring `.done`, hint "Waiting for you — the
   timer stays paused until you confirm." **Timer stays paused indefinitely; only
   an explicit Confirm click advances.** Confirm → IPC to main → close/hide
   takeover → main tells main-window to `enterStep(pendingIdx)`. Skip control in
   the timer view jumps straight to the takeover for the next step.

9. **Ambient bar window.** Third `BrowserWindow`: frameless, transparent bg,
   `alwaysOnTop`, `skipTaskbar`, positioned full-width at top of primary display
   (use `screen.getPrimaryDisplay().workArea`/`bounds`), thin (~4px) bar. After
   `didFinishLoad`, set `setIgnoreMouseEvents(true,{forward:true})` for
   click-through. `#/ambient` renders the bar; fill width = ELAPSED fraction
   `(1-frac)*100`%, recolors with work/rest accent. Driven by the same live
   state IPC push. Toggled by the timer view switch (create/show ↔ hide/destroy),
   and the toggle is persisted (`ambientEnabled`) and honored on next session.

10. **Wire IPC state fan-out.** Ensure the main-window timer engine pushes a
    compact live-state message (`{type, label, frac, remaining, ...}`) each tick
    to main → relayed to takeover (for grace context if needed) and ambient
    windows. Confirm pause/skip/stop propagate and aux windows stay in sync.
    Handle window lifecycle cleanly (destroy aux windows on stop/complete and on
    app quit; guard against sends to destroyed windows).

11. **Polish pass to match mock timing/animation.** Cross-check against the
    mocks: pulse/grow ring animation on step start, accent hue transitions, ring
    glow (Neon only), sequence-strip live fill, easing
    `cubic-bezier(.22,.61,.36,1)`, fonts per theme. Fix any copy/layout drift.

12. **Docs + scripts + sanity launch.** Update `README.md` with
    `npm install && npm run dev` (and `npm run build`). Ensure `package.json`
    has `dev` + `build` scripts. Update `PLAN.md` "Current status" (replace
    "Pre-mock." with: the Electron app now exists; note what's left —
    packaging/distribution, real app icon, any deferred features). **Launch the
    app once via a background/short-lived `npm run dev` to confirm it starts
    without crashing, verify at least the config→timer→takeover flow renders,
    then STOP the process before finishing.** Do NOT `git commit` (orchestrator
    commits). Do NOT edit `mock/`.

## Verification checklist (any iteration touching behavior)

- Timeline: work,rest,…,work with NO trailing rest; labels on work steps only;
  count clamps 1..8.
- Remaining time derives from `Date.now()` deltas; pause/background drift correct.
- Takeover NEVER auto-advances after grace — requires explicit Confirm.
- Ambient/sequence fill mirror ELAPSED fraction, not remaining.
- Templates/theme/ambient toggle persist across full app restart (disk, not
  localStorage).
- All three themes selectable and visually correct (glow only on Neon;
  `--accent-ink` on-accent text everywhere).
- No mock-only scaffolding ported.

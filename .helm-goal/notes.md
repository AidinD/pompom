# Goal orchestrator notes

This file is the ONLY continuity mechanism between iterations — each
iteration runs in a fresh subprocess with no conversation memory. See
DECISIONS.md / PLAN.md (Fas 3 Point 11) in the Helm repo for why.

---

# RESEARCH FINDINGS (iteration 1 — 2026-08-11)

## ⚠️ CRITICAL: where the mock files actually live
This worktree is at
`D:/Repo/Tools/PomPom-worktrees/goal-308c74

## Preserved key learnings (from truncated earlier iterations)

- Mocks are NOT in this worktree/branch — read them from D:/Repo/Tools/PomPom/mock/index.html, variant-b-paper.html, variant-d-nature.html (uncommitted in the main repo, readable on disk). compare.html is just an index page.
- The worktree's PLAN.md/DECISIONS.md are the OLD pre-mock versions; the main repo has newer fuller copies. The PLAN.md we must update is the worktree's older copy.
- node v24.11.1 / npm 11.6.2 available; Windows + Git Bash. Sanity check requires `npm run dev` to launch Electron without crashing, then stop it.
- Timeline rule: work,rest,...,work with NO trailing rest; labels attach to work steps only; count clamped 1-8. Takeover must NOT auto-advance after 5s grace — requires explicit Confirm click.
- Real app must derive remaining time from Date.now() deltas (not decrement counters). Mock's fast/demo-speed, .mocknav, .speed-toggle, .back-link are mock-only scaffolding — do not port.
- Only 3 themes ship (Slate Mono dropped, Warm Paper is dark). Neon uses --accent-glow; Paper/Nature have no glow and use --accent-ink for on-accent text — parameterize on-accent text and glow as CSS vars across all themes.
- plan.md now exists at .helm-goal/plan.md; implement iterations should follow it one step at a time and cross-check .helm-goal/notes.md for exact palettes/copy/geometry
- Worktree has only OLD PLAN.md/DECISIONS.md/README.md at root plus .gitignore (node_modules/dist/out ignored); scaffold must not clobber these files
- Mocks live only in sibling D:/Repo/Tools/PomPom/mock/*.html — read, never edit; the PLAN.md to update for 'Current status' is this worktree's older copy (currently says 'Pre-mock.')


[... earlier notes truncated - context fill crossed the 40% budget, older narrative dropped to keep future iterations' prompts small; durable key learnings preserved above ...]


Summary: Scaffold electron-vite + React + TypeScript app (plan step 1): package.json dev/build scripts, main/preload/renderer, verified install/typecheck/build/launch

Key changes:
- Added package.json with dev/build/preview/typecheck scripts and deps (electron 33, electron-vite 2.3, vite 5, react 18, typescript 5)
- Added electron.vite.config.ts (main/preload/renderer entries, @renderer alias, react plugin) and tsconfig.json + tsconfig.node.json + tsconfig.web.json project references
- Created src/main/index.ts (single BrowserWindow, contextIsolation on, loads ELECTRON_RENDERER_URL in dev / file in prod), src/preload/index.ts + index.d.ts (contextBridge 'pompom' api stub), src/renderer/index.html + src/main.tsx + App.tsx placeholder + styles/global.css
- Updated .gitignore to add .vite/ and *.tsbuildinfo; committed package-lock.json

Key learnings:
- Scaffold DONE and verified: `npm install` (140 pkgs), `npm run typecheck`, `npm run build`, and `npm run dev` all succeed; dev server runs on localhost:5173 and Electron launches without crashing. Build outputs to out/ (gitignored).
- Next plan step is #2: theme system (3 CSS-var palettes in notes.md) then #3 config view. Renderer entry is src/renderer/src/App.tsx; add a styles/ or themes module there. Hash routing (#/, #/takeover, #/ambient) not yet set up — do it when adding aux windows (steps 8-9).
- GOTCHA: to stop the dev app I ran `taskkill //F //IM electron.exe` which kills ALL electron.exe on the machine (there were ~8 pre-existing — likely the user's other Electron apps like VS Code/Claude). Future iterations: launch dev via the Bash tool's run_in_background so the process is tracked and can be killed by its own PID/tree instead of a blanket image kill.
- preload exposes window.pompom (typed via src/preload/index.d.ts, referenced from tsconfig.web.json includes). contextIsolation:true, sandbox:false, nodeIntegration:false — keep this security posture when adding IPC.
- TS is set up as composite project refs (tsconfig.node.json for main/preload/shared, tsconfig.web.json for renderer); *.tsbuildinfo now gitignored. A src/shared/**/* path is pre-included in both tsconfigs for future shared types (timeline model etc.).

## Iteration 4 — success

Summary: Implement theme system (plan step 2): 3 CSS-variable palettes + applyTheme helper, verified typecheck/build

Key changes:
- Added src/renderer/src/themes/themes.css: `.theme-neon` (default, has glow), `.theme-paper` and `.theme-nature` (glow set to transparent) with base vars + compound `.theme-X.state-work`/`.state-rest` accent overrides. Ported all palettes verbatim from mock/index.html + variant-b-paper.html + variant-d-nature.html, incl. --radius/--radius-sm, --ease, per-theme --font, and a new --app-bg var carrying each theme's body gradient. Parameterized --accent-ink in ALL themes (neon #0d0f13).
- Added src/renderer/src/themes/themes.ts: ThemeId ('neon'|'paper'|'nature'), THEMES[] with name+swatch colors, DEFAULT_THEME='neon', getTheme(), and applyTheme(root, id, state) which is idempotent (strips old theme/state classes then adds theme class + state-work/state-rest on the SAME element so compound selectors match).
- Rewrote global.css to consume theme vars (body uses --app-bg/--text/--font with neutral fallbacks) + added scaffold-demo styles (swatch buttons, state toggle).
- Updated App.tsx to apply the theme to document.documentElement via useEffect and demo live theme switching + work/rest accent shift. Imported themes.css before global.css in main.tsx.

Key learnings:
- CRITICAL contract for state hue shift: theme class AND state class must be on the SAME element (applyTheme puts both on document.documentElement) because themes.css uses compound selectors `.theme-neon.state-work` etc (theme-scoped, since all 3 themes coexist in one bundle — unlike the single-theme mocks which used bare `.state-work`).
- --accent-glow is `transparent` for paper/nature so glow effects (box-shadow/drop-shadow using it) degrade gracefully; only neon has real glow. Use `--accent-glow` freely in later components.
- --app-bg is a NEW var I added (not in mocks by that name) holding each theme's body radial-gradient; body reads it. Later window/component backgrounds should use --bg-2/--surface etc as in mocks.
- Next plan step is #3: Config view (React) at #/. App.tsx currently holds a theme-demo scaffold — replace its body with the real config view but KEEP the applyTheme(document.documentElement, theme, state) useEffect pattern. Theme picker swatch UI + persistence is step 4.
- typecheck + build both pass. Did NOT run `npm run dev` this iteration (pure renderer/CSS change, no main-process change); full launch sanity check is reserved for step 12. Reminder from iter 3: launch dev via Bash run_in_background so it can be killed by PID (avoid blanket `taskkill //IM electron.exe` which kills the user's other Electron apps).

## Iteration 4 — success

Summary: Implement theme system (plan step 2): three CSS-variable palettes plus applyTheme helper, verified typecheck and build

Key changes:
- Added src/renderer/src/themes/themes.css with .theme-neon (default, glow), .theme-paper and .theme-nature (glow transparent) palettes ported verbatim from the three mocks, incl. --radius/--ease/--font/--accent-ink and a new --app-bg body-gradient var, with compound .theme-X.state-work/.state-rest accent hue overrides
- Added src/renderer/src/themes/themes.ts exposing ThemeId, THEMES[] (name + swatch colors), DEFAULT_THEME='neon', getTheme(), and an idempotent applyTheme(root,id,state) that applies theme+state classes to one element
- Rewrote global.css to consume theme CSS variables (body uses --app-bg/--text/--font with neutral fallbacks) and added scaffold-demo swatch/toggle styles
- Updated App.tsx to apply the theme to document.documentElement and demo live theme switching + work/rest accent shift; imported themes.css before global.css in main.tsx

Key learnings:
- Theme class and state class MUST live on the same element (applyTheme uses document.documentElement) because themes.css uses theme-scoped compound selectors like .theme-neon.state-work — all three themes coexist in one bundle, unlike the single-theme mocks that used bare .state-work
- --accent-glow is transparent for paper/nature so glow effects degrade gracefully; only neon has real glow — later components can use --accent-glow freely
- --app-bg is a new var (not named in mocks) carrying each theme's body radial-gradient; component backgrounds should still use --bg-2/--surface as in the mocks
- Next is plan step 3 (Config view at #/): replace App.tsx body with the real config view but keep the applyTheme(document.documentElement, theme, state) useEffect; theme picker + persistence come in step 4
- typecheck + build both pass; did not run npm run dev (pure renderer/CSS change) — full launch sanity check is reserved for step 12, and dev should be launched via Bash run_in_background to kill by PID rather than a blanket electron.exe taskkill

## Iteration 5 — success

Summary: Implement config view (plan step 3): shared session model + React ConfigView with pomodoro stepper, work/rest inputs, task-label rows, and start-to-timeline wiring

Key changes:
- Added src/shared/model.ts: Cfg/TimelineStep/Template types, LABELS_DEFAULT, clampCount, growLabels, buildTimeline (work,rest,...,work with no trailing rest), DEFAULT_CFG, and SEED_TEMPLATES — ported verbatim from mock/index.html
- Added src/renderer/src/views/ConfigView.tsx: 'New session' form with – count + stepper (clamp 1..8, grows labels, disables at bounds), work/rest number inputs (raw-string buffered, 25/5 fallback on start), one editable task-label row per pomodoro with {work}m hint, hint copy, and Start button that builds the timeline via onStart
- Added src/renderer/src/styles/views.css: ported .window/.titlebar/.brand-mark/.view/config-form/.btn styles from the mock, using theme CSS vars (var(--accent-ink) for on-accent text, var(--accent) for step-index badges) so all three themes restyle automatically
- Rewrote App.tsx to render the themed .window frame + brand titlebar + ConfigView, applying DEFAULT_THEME (work state) to document root; Start logs cfg+timeline as a stub until the timer view exists
- Added @shared alias to electron.vite.config.ts and tsconfig.web.json paths; imported views.css in main.tsx; removed now-unused scaffold-demo CSS from global.css

Key learnings:
- Plan step 3 DONE and verified via `npm run typecheck` + `npm run build` (both pass, 35 modules, @shared import resolves). Did NOT launch dev (renderer-only change) — full Electron launch sanity check stays reserved for step 12; launch via Bash run_in_background to kill by PID, never blanket taskkill electron.exe.
- Shared model lives at src/shared/model.ts and is imported as '@shared/model' (alias now in vite config + tsconfig.web.json). buildTimeline/clampCount/growLabels/DEFAULT_CFG/SEED_TEMPLATES are ready for the timer engine (step 5) and templates (step 4) to reuse.
- ConfigView currently owns cfg entirely as LOCAL state (count/work/rest/labels); step 4 (templates + theme picker + persistence) must lift or wrap this state so loading a template can reset the work/rest string inputs and persist lastConfig/theme to disk. Duration inputs are kept as strings to allow smooth editing; resolved to numbers with 25/5 fallback on start.
- Templates section and theme picker are intentionally NOT in the config view yet (deferred to step 4). App applies a fixed DEFAULT_THEME='neon' work state; the mock's fake macOS traffic-light dots were intentionally omitted (OS provides real chrome) — only a brand-mark + 'PomPom' titlebar is rendered.
- Mock quirk noted: mock's .step-index uses `var(--accent-work, #3ddc97)` (undefined var → always green); I deliberately used `var(--accent)` instead so the badge matches each theme's accent. Next step is #4 (templates persistence + theme picker), then #5 timer engine hook.

## Iteration 6 — success

Summary: Implement templates persistence + theme picker (plan step 4): durable JSON store, store:get/set IPC bridge, template chips, and a persisted theme swatch row

Key changes:
- Added src/shared/store.ts (StoreData: templates/lastConfig/theme/ambientEnabled + DEFAULT_STORE) and src/main/store.ts (cached read/write to app.getPath('userData')/pompom-store.json, merges over defaults)
- Registered store:get/store:set ipcMain.handle in src/main/index.ts (via registerStoreIpc on app ready) and exposed window.pompom.store.get/set through preload contextBridge (ipcRenderer.invoke)
- Reworked ConfigView.tsx to take initialCfg/templates/theme + callbacks; renders template chips (click loads), a dashed '+ Save current' chip (Custom · N×W/R), and a theme-picker swatch row (work/rest split gradient, selected ring)
- Reworked App.tsx to load the store on mount, own templates/theme/cfg, remount ConfigView via a cfgKey on template load, and persist lastConfig on Start, templates on save, theme on pick; coerceTheme() narrows the persisted theme string to ThemeId
- Added .theme-picker/.swatch/.swatch-fill styles to views.css; verified typecheck + build + a live npm run dev launch (no crash, store IPC registered)

Key learnings:
- Plan step 4 DONE + verified (typecheck, build, and a real launch all pass). Next is step 5: the wall-clock timer engine hook (Date.now()-delta based, tracks stepEndsAt + accumulated paused ms), then step 6 timer view. App.handleStart currently just buildTimeline + console.log — replace that stub with the engine/timer view.
- Persistence store lives at src/shared/store.ts (StoreData + DEFAULT_STORE) and src/main/store.ts. main/preload import it via RELATIVE path '../shared/store' (NOT the @shared alias — that alias is only wired in the renderer vite config + tsconfig.web.json; tsconfig.node.json just includes src/shared/**/*). ambientEnabled already exists in StoreData for the step-9 ambient toggle to persist.
- Renderer accesses persistence via window.pompom.store.get()/set(partial) (Promise-based, ipcRenderer.invoke). preload/index.d.ts types it automatically from `typeof api` so no manual d.ts edit was needed. store.set does a partial merge, so pass only changed keys.
- Config state pattern: App owns cfg/theme/templates; ConfigView is remounted (React key=cfgKey, bumped on template load AND after the async store load) to re-seed its local string-buffered work/rest state. When the timer view is added, don't break this remount trick.
- LAUNCH-CLEANUP RECIPE (avoids blanket taskkill electron.exe that kills the user's VS Code/Claude): the dev tree is cmd.exe 'electron-vite dev' -> node electron-vite -> electron.exe (+3 child electron). Find them with PowerShell Get-CimInstance Win32_Process | Where CommandLine -match 'goal-308c740c', then `taskkill /F /T /PID <the electron-vite cmd.exe pid>` to kill just that tree. Verified this leaves other Electron apps alone.
- Backgrounding gotcha: `npm run dev >log 2>&1 &` inside a Bash run_in_background call makes the wrapper 'complete' immediately (exit 0) while npm keeps running detached — the npm output goes to the redirected log file, not the task output file. Read the redirect target to see real dev output.
- The mock has NO theme picker (each mock file is a single fixed theme); the swatch-row picker in config is my own design per the goal, using THEMES[].swatchWork/swatchRest from themes.ts for the split-gradient swatches.

## Iteration 7 — success

Summary: Implement wall-clock timer engine hook (plan step 5): useTimerEngine with Date.now()-delta countdown, pause/resume/skip/stop/confirm, and no-auto-advance step-finish contract

Key changes:
- Added src/renderer/src/hooks/useTimerEngine.ts: a React hook owning timeline/curIdx and per-step timing from Date.now() deltas (endsAt + frozen pausedAt), publishing a TimerSnapshot {phase, remaining, total, frac, elapsedFrac, paused, pendingIdx, ...} on a 200ms tick; actions start/pause/resume/togglePause/skip/stop/confirm and callbacks onEnterStep/onStepPending/onComplete/onStop
- Step-finish contract mirrors the mock: on time-out it STOPS ticking, and either completes (last step) or enters phase 'awaiting' signalling the takeover for curIdx+1 — it never auto-advances; only confirm() enters the pending step
- Added fmt(s) helper to src/shared/model.ts (clamp >=0, MM:SS zero-padded) ported from the mock, for reuse by the timer/takeover/ambient views
- Verified npm run typecheck and npm run build both pass

Key learnings:
- Plan step 5 DONE (typecheck + build pass). Hook lives at src/renderer/src/hooks/useTimerEngine.ts; it is NOT yet imported anywhere (build still shows 35 modules / tree-shaken out) — that's intentional. Step 6 (timer view) must call useTimerEngine in App and render its snapshot, replacing App.handleStart's console.log stub with engine.start(cfg).
- Timing internals are refs (endsAtRef/pausedAtRef/curIdxRef/phaseRef/pendingIdxRef); the interval calls a stable wrapper that reads tickRef.current so it never goes stale. remaining uses Math.ceil so the display counts whole seconds like the mock; frac = remaining/total, elapsedFrac = 1-frac (sequence strip + ambient use ELAPSED).
- Phase model: 'idle'|'running'|'awaiting'|'complete'. skip() routes through stepFinished() -> 'awaiting' (goes to takeover for next step), matching the mock; it does NOT jump straight into the next step. confirm() only valid in 'awaiting'. stop() resets to idle and fires onStop.
- Pure renderer/TS change this iteration; did NOT run npm run dev (reserved for step 12). When launching dev later, use Bash run_in_background and kill by the electron-vite cmd.exe PID tree (match commandline 'goal-308c740c') — never blanket taskkill electron.exe (kills the user's other Electron apps).
- App.tsx currently applies a fixed 'work' state to document root; step 6 must toggle state-work/state-rest on #window from the engine's current step type for the accent hue shift, and pulse the ring by toggling .pulsing on #window with a forced reflow (void el.offsetWidth) on step change (onEnterStep is the natural hook).

## Iteration 8 — success

Summary: Implement timer + complete views (plan steps 6-7): wire useTimerEngine into App with phase routing, countdown ring, sequence strip, controls, and work/rest accent state

Key changes:
- Added src/renderer/src/views/TimerView.tsx: step badge, task label, 240x240 SVG countdown ring (r=110, dashoffset=RING_C*(1-frac)) with a one-shot pulse on step entry (via React key on the prog circle), sequence strip with elapsed-fill on the current segment, next-up hint, Pause/Resume + Skip + Stop controls, and the ambient-meter toggle row
- Added src/renderer/src/views/CompleteView.tsx: check icon, 'Session complete', and '{count} pomodoros · {h}h {m}m focused' summary (totalMin=count*work) with a 'New session' button that stops the engine back to config
- Rewrote App.tsx to host useTimerEngine, route by phase (idle->Config, running/awaiting->Timer, complete->Complete), derive work/rest state from the current step and apply it to BOTH document root (applyTheme) and the #window card class, persist ambientEnabled on toggle, and start the engine on session start
- Ported the mock's timer + complete CSS (step-badge/dotPulse, ring-track/ring-prog/ringPulse, sequence/seg/seg-fill, next-up, controls/icon-btn, toggle-row/switch, complete-check) into src/renderer/src/styles/views.css using theme CSS vars
- Verified: typecheck + build pass (38 modules) and a real npm run dev launch boots the app cleanly with no renderer errors; dev tree stopped by PID afterward

Key learnings:
- Plan steps 6 AND 7 are DONE (timer view + complete view). Complete view was folded in because leaving the engine's 'complete' phase unrouted would render a blank window — they are the same running-session surface. Next is plan step 8: the takeover BrowserWindow (fullscreen+alwaysOnTop) for the 'awaiting' phase.
- IMPORTANT gap for step 8: during phase 'awaiting' the TimerView currently renders the just-finished step frozen at 00:00 with NO confirm/advance path except the Stop button. The takeover window (step 8) must supply the grace countdown + Confirm-&-continue that calls engine.confirm() to enter the pending step. Wire it off the engine's onStepPending callback (or watch phase==='awaiting' + pendingIdx in App).
- Pulse-on-step-start is done the React-idiomatic way: the .ring-prog circle has className 'ring-prog pulse' and key={curIdx}, so entering a new step remounts it and replays the one-shot ringPulse animation. Do NOT reintroduce the mock's imperative .window.pulsing + void offsetWidth reflow (it fights React re-renders every 200ms tick).
- State (work/rest) is applied in TWO places by App: applyTheme(document.documentElement, theme, state) for the theme-scoped --accent hue overrides, AND className `window state-${state}` on #window for the .window.state-work/-rest box-shadow glow. state derives from engine.step?.type (defaults 'work' when idle so config/complete show primary accent).
- The 1s-linear stroke-dashoffset transition on .ring-prog is correct even with 200ms engine ticks: remaining uses Math.ceil so frac only changes once per whole second, giving a smooth continuous sweep with no lag. Same for .seg-fill.
- Ambient toggle (step 6 UI) persists ambientEnabled to the store and reflects it, but does NOT yet create the always-on-top ambient BrowserWindow — that is plan step 9. App now loads ambientEnabled from the store on mount.
- Launch-cleanup that worked this time: launch `npm run dev > /tmp/pompom-dev.log 2>&1` via Bash run_in_background (wrapper 'completes' immediately; real output goes to the redirect log — read that). Find this worktree's procs with PowerShell Get-CimInstance Win32_Process | Where CommandLine -match 'goal-308c740c-e131', then `taskkill /F /T /PID <the electron-vite node.exe pid>` to kill just that tree. The background task shows exit-1 afterwards — that's just the kill, not a real failure. Never blanket-taskkill electron.exe.

## Iteration 9 — success

Summary: Implement takeover window (plan step 8): separate fullscreen alwaysOnTop BrowserWindow with grace countdown + required Confirm, wired via IPC to the timer engine

Key changes:
- Added src/shared/ipc.ts: TakeoverStep payload type + GRACE_SECS=5 constant shared across main/preload/renderer
- src/main/index.ts: getTakeoverWindow() (fullscreen+alwaysOnTop+skipTaskbar+frameless, screen-saver z-order), loadRoute() hash helper, registerTakeoverIpc() for takeover:show/hide/confirm/get, confirm relays takeover:confirmed to main window and closes takeover; main-window close/stop/complete tear it down
- src/preload/index.ts: exposed window.pompom.takeover.show/hide/confirm/get/onStep/onConfirmed over ipcRenderer
- src/renderer/src/main.tsx: hash routing so #/takeover renders TakeoverView (with body-fullbleed) else App
- src/renderer/src/views/TakeoverView.tsx (new): dumb IPC-driven view — eyebrow/headline/up-next per next step type, 150x150 grace ring r=68 counting 5->0, Confirm button gated with .ready at zero and 'timer stays paused' hint; NEVER auto-advances
- src/renderer/src/App.tsx: wired useTimerEngine callbacks (onStepPending->takeover.show, onComplete/onStop->takeover.hide) and onConfirmed->engine.confirm(); themeRef keeps takeover theme in sync
- src/renderer/src/styles/views.css: ported takeover/grace-ring/confirm-button styles (uses --accent-ink) + body.body-fullbleed #root padding reset

Key learnings:
- Plan step 8 DONE + verified: typecheck + build pass (40 modules) and a real npm run dev launch boots without crashing; dev tree stopped by PID. Next is plan step 9: the ambient bar BrowserWindow (frameless/transparent/click-through), then step 10 (IPC state fan-out each tick to takeover+ambient).
- Multi-window routing: ONE renderer bundle; window role chosen by URL hash. main/index.ts loadRoute(win,'takeover'|'ambient'|'') loads ELECTRON_RENDERER_URL+#/route in dev or loadFile(...,{hash}) in prod. main.tsx reads window.location.hash to pick TakeoverView vs App. Reuse loadRoute for the ambient window in step 9.
- Takeover flow is pull+push to dodge a load race: main stores pendingTakeoverStep; takeover renderer seeds via window.pompom.takeover.get() on mount AND subscribes onStep; main also pushes takeover:step after did-finish-load then shows the window. Confirm is the ONLY advance path: takeover.confirm() -> main closes takeover + sends takeover:confirmed -> App onConfirmed -> engine.confirm().
- App passes a FRESH callbacks object to useTimerEngine each render (hook does cbRef.current=callbacks every render) so onStepPending closes over the latest theme via themeRef; the onConfirmed subscription uses a confirmRef (engine.confirm identity changes every 200ms tick) and subscribes once on mount so it never resubscribes.
- Takeover window is fullscreen+alwaysOnTop+skipTaskbar+frame:false with setAlwaysOnTop(true,'screen-saver'); it covers the main window (which stays behind rendering the frozen just-finished step). There is intentionally NO Stop control inside the takeover (matches mock) — only Confirm advances. Grace countdown derives from Date.now() delta (whole-second ceil) with the CSS 1s-linear ring transition for smoothness.
- preload ipcRenderer.on listeners are typed (_e: unknown, ...) which passes strictFunctionTypes (unknown is a supertype of IpcRendererEvent). onStep/onConfirmed return an unsubscribe that calls removeListener — call it in the effect cleanup (StrictMode double-mounts, so net one listener).
- CSS: takeover uses body.body-fullbleed #root { padding:0 } (class added by main.tsx on the takeover route) to defeat global.css's #root centering padding so the overlay is edge-to-edge. Confirm button uses var(--accent-ink) not the mock's hardcoded #0d0f13 so it works across all 3 themes; grace-prog glow uses --accent-glow (transparent on paper/nature).

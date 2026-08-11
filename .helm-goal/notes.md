# Goal orchestrator notes

This file is the ONLY continuity mechanism between iterations — each
iteration runs in a fresh subprocess with no conversation memory. See
DECISIONS.md / PLAN.md (Fas 3 Point 11) in the Helm repo for why.

---

# RESEARCH FINDINGS (iteration 1 — 2026-08-11)

## ⚠️ CRITICAL: where the mock files actually live
This worktree is at
`D:/Repo/Tools/PomPom-worktrees/goal-308c74

[... earlier notes truncated - context fill crossed the 40% budget, older narrative dropped to keep future iterations' prompts small; durable key learnings preserved above ...]

ml) — DEFAULT. Font: Inter/sans. Uses glow.
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

## Iteration 2 — success

Summary: Write concrete 12-step PomPom implementation plan to .helm-goal/plan.md for the implement phase

Key changes:
- Created .helm-goal/plan.md with locked architecture decisions (electron-vite+React+TS, 3 BrowserWindows, main-renderer timer authority, hash routing, userData JSON persistence, GRACE_SECS=5)
- Broke the goal into 12 small sequential implement steps: scaffold, theme CSS vars, config view, templates persistence, wall-clock timer engine, timer view, complete view, takeover window, ambient bar window, IPC fan-out, polish, docs+sanity launch
- Included the shared timeline/cfg model and a behavior verification checklist

Key learnings:
- plan.md now exists at .helm-goal/plan.md; implement iterations should follow it one step at a time and cross-check .helm-goal/notes.md for exact palettes/copy/geometry
- Worktree has only OLD PLAN.md/DECISIONS.md/README.md at root plus .gitignore (node_modules/dist/out ignored); scaffold must not clobber these files
- Mocks live only in sibling D:/Repo/Tools/PomPom/mock/*.html — read, never edit; the PLAN.md to update for 'Current status' is this worktree's older copy (currently says 'Pre-mock.')

## Iteration 3 — success

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

# Handoff - latest session state

_Overwritten on each handoff (latest-only); prior handoffs are in git history._
_Saved 2026-08-12 09:59. For durable rationale see DECISIONS.md; for the roadmap, PLAN.md._

# PomPom — Session Handoff

## Current state

Repo: `D:\Repo\Tools\PomPom` (Windows Electron + React Pomodoro app). Working tree is clean, all work is committed and pushed to `origin/master` (GitHub: `AidinD/pompom`). Latest commit: `b59d86e`. `package.json` version: `0.1.6`.

This session ran as PomPom's coordinator ("second mate"). No autopilot/crew dispatches were running or needed — all work this session was done directly (small, well-scoped feature/bugfix work, not a candidate for delegation).

**Full history of what changed and why**: see `DECISIONS.md` and `PLAN.md` in the repo (both updated throughout this session) and the commit log (`git log --oneline`) — each commit message is self-contained. Don't re-derive that here; read those instead.

**Installed app is stale**: `C:\Users\<you>\AppData\Local\Programs\PomPom` has version `0.1.2` installed and was running during this session (verified via `app.asar`'s `package.json`). It predates the template delete/rename features (0.1.3–0.1.4), the titlebar version label (0.1.5), and the window-height fix (0.1.6). **The user has not yet said whether to close the running app and reinstall, or do it themselves** — this was the last open question when the session ended. A fresh installer already exists at `D:\Repo\Tools\pompom\dist\PomPom Setup 0.1.6.exe` (built, not yet installed).

## Key decisions and why

- **Versioning convention established and now written down**: bump the patch version on every commit, reset on minor/major. This wasn't documented anywhere (checked this repo's docs and the user's global Claude config) — it's now in `DECISIONS.md` (2026-08-12 entry) AND in the user's **global** canonical rules file `<your-claude-home>\CLAUDE.md` (under "Git & Version Control"), since it's a standing convention across all his projects, not just this one. Also saved as a memory file (`feedback_versioning.md` in this project's memory dir). **Apply this going forward**: bump the patch in `package.json` as part of every commit that touches tracked files.
- **`dist/` is now auto-cleaned before every packaged build**: `npm run dist` runs a `predist` script (added to `package.json`) that wipes `dist/` first, because electron-builder never removed its own previous output and stale installers/blockmaps were accumulating. No action needed — this is automatic now.
- **Icon source image had a baked-in opaque checkerboard**, not real alpha transparency — a plain alpha-threshold crop did nothing. The working approach (documented in `DECISIONS.md`) was luminance-based: detect the dark icon body, turn near-gray light pixels transparent. Relevant if the icon ever needs regenerating from a new source image.
- **Root cause of the "ambient overlay stalls after a while" bug**: Electron's `backgroundThrottling` (default on) freezes a backgrounded renderer's timers — and the main window (not a dedicated aux window) is the timer authority. Fixed by disabling `backgroundThrottling` on the main window and the ambient window. Relevant precedent if the mini-widget or any other window shows similar stalling later — check throttling first.
- **New "pinned mini view" feature** auto-minimizes the main window when a session is running (if the user has the toggle on) and shows a small always-on-top corner widget instead. Design call made without asking: it minimizes immediately when a session starts if the toggle was already on from a previous session, rather than waiting for some later trigger. **The user has not yet confirmed or objected to this default** — worth a light check if it comes up.
- **"Större default skärm" (window-too-small) task was interpreted** as "content clips instead of fitting/scrolling," not "start maximized." Window height is now derived from the screen's actual work area (capped at 980px) rather than a fixed guess — 860px still wasn't enough per user feedback, so this was tuned twice.

## Concrete next steps

1. **Resolve the stale-install question**: either close the running `0.1.2` PomPom.exe processes and install `dist\PomPom Setup 0.1.6.exe`, or wait for the user to do it themselves. Don't assume — ask if picking this back up.
2. All six original Jot backlog tasks for the PomPom category (icon, sound notification, rest-break tips, overlay stall bug, pinned mini view, window sizing) were completed and moved to **`review`** status in Jot (`<your-jot-data-dir>\todos.json`) — not `done`, since the user verifies and closes them himself. Two more small features (template delete, template rename, version label, window-height retune) were done ad hoc after the backlog was cleared and were **not** added to Jot (they came as direct chat requests, not board items) — consider whether they should be logged there too, or just left as-is since they're already fully committed.
3. If new Jot tasks appear in the PomPom category, follow the `jot-task-tracking` skill workflow (claim → in-progress → review, never done).
4. No known open bugs. If the user reports something behaving oddly, check first whether they're running the stale `0.1.2` install before assuming it's a code issue — that was the root cause of the last confusing report ("can't edit or delete templates").

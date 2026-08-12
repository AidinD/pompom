# Plan

## Current status

The Electron + React (TypeScript) app is at v1 scope and beyond, packaged and
installable (`package.json` version `0.1.12`, last built to
`dist\PomPom Setup 0.1.12.exe`). Implemented:
electron-vite scaffold; a four-theme CSS-variable system (Neon Dark, Warm
Paper Dark, Nature, Zen — see `mock/` for the design references the first
three themes are ported from); the config view with per-pomodoro task labels,
named/renamable template save/load/delete, and a theme picker; disk
persistence of templates / last config / theme / ambient toggle / mini-pin
toggle (`pompom-store.json` in userData, with `coerceCfg()` backward-compat
merge for configs saved before newer `Cfg` fields existed); the wall-clock
timer engine (`Date.now()`-delta authority) with pause/resume/skip/stop and a
trailing long-rest step after the session's last pomodoro; the timer and
session-complete views; the fullscreen always-on-top takeover window with a
grace countdown and a required Confirm (never auto-advances); the optional
frameless, transparent, click-through ambient meter bar, driven live over IPC;
a pinned mini view (auto-minimizes the main window to a small always-on-top
corner card with Pause/Stop, and now click-anywhere-to-restore) as another
optional toggle alongside it; a chime on step end; rest-break suggestions
shown during rest steps; a titlebar version label baked in at build time; and
an app-level fix (`disable-features=CalculateNativeWinOcclusion,
IntensiveWakeUpThrottling`) for background-throttling stalls that survives
window occlusion, on top of the earlier per-window fix.
The app icon (neon-tomato logo) is set: `build/icon.ico` for the packaged
exe/installer, `resources/icon.png` for the BrowserWindow.
See [README.md](README.md) for how to run it.

All six original Jot backlog tasks for the PomPom category (icon, sound
notification, rest-break tips, overlay stall bug, pinned mini view, window
sizing) are done and sitting in Jot's `review` status, awaiting the board
owner's confirm/close. The mini-pin "minimizes immediately if the toggle was
already on from a previous session" default (see PLAN's prior open question)
has shipped without objection through multiple sessions since - treat it as
settled unless told otherwise.

Deferred to later (not in v1):
- Packaging / distribution: installer exists (electron-builder, `npm run
  dist`, auto-cleaned via a `predist` script); code signing and auto-update
  are still not done.
- A configurable grace-period length (currently hard-coded `GRACE_SECS = 5`).
- Any further visual polish and cross-platform support.
- Long-duration soak test of the occlusion-throttling fix (the bug it fixes
  only reproduces after 5-10+ minutes backgrounded; verification so far is
  typecheck + build + short `npm run dev` launches only, no automated tests
  exist in this repo).

## Scope (v1)

- Configure number of pomodoros, work duration, and rest duration per session.
- Assign a task label per pomodoro (not just "pomodoro 3", but "task A", "task B", etc.), so a session can mix A,A,A,A / A,B,A,B / A,B,C,D freely.
- Fullscreen takeover window when a step changes (work to rest, rest to work), with a short grace period countdown, then a required "Confirm" click before the next step starts.
- Clean, minimal visual style (not "gamer") with subtle animations and pulsing on step changes.
- Optional setting: an always-on-top ambient meter bar (health-bar style) at the top of the screen, filling/draining with the current step's progress.
- Save reusable session templates locally.
- Theme picker in config: ship multiple built-in visual themes (see mock/) as CSS-var swaps, selectable per session/globally.

## Out of scope (v1)

- Cross-platform support (Windows-only for now).
- Cloud sync / accounts.
- Blocking OS-level shortcuts (Alt+Tab) - the takeover window is alwaysOnTop + fullscreen, not a hard OS lock.

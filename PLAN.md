# Plan

## Current status

The Electron + React (TypeScript) app is built to full v1 scope. Implemented:
electron-vite scaffold; the three-theme CSS-variable system (Neon Dark, Warm
Paper Dark, Nature); the config view with per-pomodoro task labels, template
save/load, and a theme picker; disk persistence of templates / last config /
theme / ambient toggle (`pompom-store.json` in userData); the wall-clock timer
engine (`Date.now()`-delta authority) with pause/resume/skip/stop; the timer
and session-complete views; the fullscreen always-on-top takeover window with a
grace countdown and a required Confirm (never auto-advances); and the optional
frameless, transparent, click-through ambient meter bar, driven live over IPC.
See [README.md](README.md) for how to run it.

Deferred to later (not in v1):
- Packaging / distribution (installer, code signing, auto-update).
- A real application icon.
- A configurable grace-period length (currently hard-coded `GRACE_SECS = 5`).
- Any further visual polish and cross-platform support.

## Scope (v1)

- Configure number of pomodoros, work duration, and rest duration per session.
- Assign a task label per pomodoro (not just "pomodoro 3", but "task A", "task B", etc.), so a session can mix A,A,A,A / A,B,A,B / A,B,C,D freely.
- Fullscreen takeover window when a step changes (work to rest, rest to work), with a short grace period countdown, then a required "Confirm" click before the next step starts.
- Clean, minimal visual style (not "gamer") with subtle animations and pulsing on step changes.
- Optional setting: an always-on-top ambient meter bar (health-bar style) at the top of the screen, filling/draining with the current step's progress.
- Save reusable session templates locally.

## Out of scope (v1)

- Cross-platform support (Windows-only for now).
- Cloud sync / accounts.
- Blocking OS-level shortcuts (Alt+Tab) - the takeover window is alwaysOnTop + fullscreen, not a hard OS lock.

# Plan

## Current status

Pre-mock.
Next step: build a clickable HTML mock covering the timer view, the fullscreen takeover screen, and the session configuration view, before starting the Electron build.

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

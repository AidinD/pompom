# Decisions

## 2026-08-11 - Electron + React, not a plain web app

Decision: build as an Electron desktop app.
Alternatives considered: a browser-based web app (Notification API + service worker).
Why: a web app can't reliably force itself always-on-top or fullscreen over other windows, which is required for the screen-takeover feature. Electron gives a real OS-level process that can set `alwaysOnTop` and go fullscreen across the screen.

## 2026-08-11 - Visual style: clean/minimal with subtle animation, not "gamer"

Decision: minimal, dark UI with a single accent color that shifts hue between work and rest states, plus subtle micro-animations (smooth bar fills, pulsing on step change) - no game-style graphics, characters, or particle effects.
Why: a game-like style is fun briefly but competes for attention, which works against the app's actual purpose (protecting focus). Confirmed with Aidin 2026-08-11.

## 2026-08-11 - Ambient meter bar as an always-on-top strip, not a full HUD

Decision: the optional progress meter is a thin always-on-top bar at the top of the screen, in the current accent color, rather than a floating widget or full HUD.
Why: discreet enough not to interrupt focus during work, but gives ambient status without switching windows - inspired by a game health-bar.

## 2026-08-11 - Mock design choices (pinned by mock/index.html)

Decisions locked in the clickable mock, to carry into the Electron build:
- Accent hue mapping: WORK = cool teal (`#3ddc97`), REST = warm amber (`#ffab4d`). Everything (ring, ambient bar, badges, glow) is driven off a single `--accent` CSS var swapped by `.state-work` / `.state-rest` classes.
- Timeline model: rests are auto-inserted *between* pomodoros (work,rest,work,...,work) with no trailing rest after the last pomodoro. Task labels attach to work steps only.
- Takeover contract: grace countdown runs first, then the timer stays paused and the next step does NOT auto-start - it waits indefinitely on a required Confirm click. Confirm button is dimmed/disabled during grace, then pulses when ready.
- Ambient bar fills (0->100%) with *elapsed* fraction of the current step, mirroring the ring.
- Config surface: pomodoro count (stepper, 1-8), work/rest minutes, per-pomodoro editable task labels, and local reusable templates (chips).
Why: getting these concrete before the Electron build means the React components have a settled visual + behavioral spec to target; the mock is the source of truth for look and flow.

## 2026-08-11 - Multiple built-in themes via a config picker, not one fixed style

Decision: rather than picking a single final look now, the app will ship several built-in themes (mock/index.html "Neon Dark", mock/variant-b-paper.html "Warm Paper Dark", mock/variant-d-nature.html "Nature", possibly more) selectable from a theme picker in the config view. All are pure CSS-var swaps (`--bg`, `--accent`, etc.) on the same markup/behavior, so adding a theme is cheap once the component structure is settled.
Why: Aidin liked aspects of multiple palettes rather than one clear winner - a picker avoids a forced single choice and costs little given the CSS-var architecture already proven across the mocks.

## 2026-08-11 - Dropped "Slate Mono" mock variant

Decision: removed the cool-gray/monospace "Slate Mono" design mock; not going forward with it.
Why: Aidin didn't like it after seeing it live.

## 2026-08-11 - "Warm Paper" reworked to a dark theme

Decision: the warm/editorial variant (serif type, clay/sage accent) was reworked from a light cream background to a dark warm one (`#1b1712` base, "ink on kraft paper" feel), keeping the same accent palette and no-glow style.
Why: Aidin liked the warm/editorial direction but prefers a dark-adapted UI overall.

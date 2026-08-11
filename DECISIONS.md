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

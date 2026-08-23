# PomPom

A Windows Pomodoro app (Electron + React) with per-pomodoro task labels, configurable work/rest durations, a fullscreen takeover screen between steps (with a grace period + confirm button), and an optional always-on-top ambient meter bar.

See [PLAN.md](PLAN.md) for current status and [DECISIONS.md](DECISIONS.md) for design decisions and rationale.

## Getting started

Requires Node.js 18+ and npm (Windows).

```bash
npm install     # install dependencies (first run only)
npm run dev     # launch the app with hot-reload for development
```

To produce a production build (compiles main/preload/renderer into `out/`):

```bash
npm run build   # type-check + bundle
npm start        # preview the production build (electron-vite preview)
```

Other scripts:

- `npm run release` — clean, build, package, and publish a GitHub release. The
  installed app picks the new version up on its next launch (electron-updater).
- `node scripts/generate-icon.mjs` — redraw `resources/icon.png` and the
  multi-size `resources/icon.ico` from the header mark. The output is committed;
  run it after changing `PomPomMark.tsx` so the two stay one drawing.
- `npm run typecheck` — run the TypeScript compiler for the node (main/preload) and web (renderer) tsconfigs without emitting.

## How it works

- **Config view** — choose the number of pomodoros (1–8), work/rest durations, and a task label per pomodoro. Save reusable templates and pick one of three themes (Neon Dark, Warm Paper Dark, Nature). Templates, last config, theme, and the ambient-bar toggle persist to disk (`pompom-store.json` in the app's userData folder).
- **Timer view** — a wall-clock countdown ring (derived from `Date.now()` deltas so it stays accurate across pauses/sleep), a sequence strip showing session progress, and Pause / Skip / Stop controls plus the ambient-bar toggle.
- **Takeover window** — when a step finishes, a fullscreen always-on-top window appears with a short grace countdown; the timer stays paused until you explicitly click **Confirm & continue**. It never auto-advances.
- **Ambient bar** — an optional frameless, transparent, click-through strip pinned to the top of the primary display that fills with the current step's elapsed progress, recoloring for work vs. rest.

## Themes

Three CSS-variable palettes are included: **Neon Dark** (default, with accent glow), **Warm Paper Dark** (serif display font, no glow), and **Nature** (no glow). The selection persists across restarts.

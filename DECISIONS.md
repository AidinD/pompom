# Decisions

## 2026-08-23 - Frameless window with a Jot/Nib-style header row

Decision: the main window is `frame: false` and its header row IS the title bar
- brand mark, wordmark, version on the left, minimise and close on the right,
the whole strip a drag region. The old `.titlebar` was a decorative brand strip
*under* the OS title bar, so the window was topped by two headers saying the
same thing. Minimise and close only, no maximise: this is a 560px utility panel.

The card-in-a-window look went with it. `.window` now fills the frame edge to
edge the way Jot and Nib do, instead of floating a 460px rounded card inside a
560px window. The accent glow survives as an inset wash off the top edge, so
the four themes still read differently at a glance.

What was deliberately NOT copied from Jot and Nib: their palette. Nudge took
Jot's tokens verbatim, but PomPom's four themes are the app's identity, so it
keeps them and matches the family on layout, chrome, and typography only.

## 2026-08-23 - The app icon is generated from the header mark, and the mark is filled

Supersedes the 2026-08-12 entry below. That icon was cut from a source PNG by an
ad-hoc PowerShell script that never lived in the repo, so there was no way to
regenerate it - and it drew the old neon-tomato-on-a-rounded-square, which is
not the mark the app shows in its header any more.

Now `scripts/generate-icon.mjs` draws it, ported from Jot's and Nib's generator:
the same dependency-free PNG and ICO writers, the same distance-field
rendering, so four apps share one icon pipeline. The geometry is
`PomPomMark.tsx`'s, so the mark beside the wordmark and the mark in the taskbar
are one drawing. Output moved from `build/icon.ico` to `resources/icon.ico`
alongside the rest of the family, and the main process now hands the .ico to
BrowserWindow so Windows picks a frame per DPI scale instead of shrinking a PNG.

**The body is filled, not stroked, and that was settled by looking rather than
arguing.** Eight tomato variants were rendered in the real header at 20px and
16px. Every outlined one reduced to a ring with two hooks either side - a horned
circle, and one that reads too close to Jot's ring. Filled, the silhouette
survives to 16px. A second finding from the same test: the calyx has to be one
solid two-lobed shape with the stalk clear above it; separate leaf strokes merge
into a bar across the top and the stalk vanishes behind it.

Two drawings in the .ico, per the family rule: the full mark at 32 and up, a
heavier calyx on a slightly larger body below that. It carries 20 and 24 as well
as the usual ladder, for 125% and 150% display scaling.

## 2026-08-23 - Auto-update via electron-updater, the same wiring as Jot and Nib

Decision: check GitHub once at startup, never in dev, install on quit, and tell
the renderer so it can offer a restart - Jot's flow, toast and all. Publishing
goes through `scripts/release.mjs` (Nib's), which cleans `out/` and `dist/`
first and lets electron-builder do the upload, because a hand-made
`gh release create` names the installer differently from what `latest.yml`
references and electron-updater then 404s on it.

`externalizeDepsPlugin()` had to be added to the vite config for main and
preload. Without it electron-updater is bundled into the main chunk rather than
required from `node_modules`, which is the failure Jot hit on 1.5.7.

PomPom is unsigned. That means SmartScreen on the first install and silence
after that; it does not stop updates. There were no releases at all before this
one, so the first install is a manual download either way.

## 2026-08-12 - Long rest is a trailing step after the session's last pomodoro

Decision: `Cfg.longRest` (minutes) with no separate interval field — the
timeline is `work,rest,work,...,work,long-rest`, i.e. a long rest is always
appended once after the final pomodoro. Every rest *between* pomodoros stays
a normal short rest. The "Long rest" field in `ConfigView.tsx` is hidden when
`count <= 1` (nothing to append after). Old persisted configs/templates
missing the field fall back via `coerceCfg()` (merge onto `DEFAULT_CFG`) in
`App.tsx`.
Alternatives considered, in order tried and rejected:
1. Classic-Pomodoro `longRest` + `longRestEvery` ("every Nth pomodoro gets a
   long break", default every 4th) - rejected by Aidin: PomPom's session
   already IS the fixed cycle (1-8 pomodoros), so a repeating "every N" inside
   it doesn't fit the model.
2. Always make the session's *last existing rest* (the one before the final
   pomodoro) long, dropping `longRestEvery` - shipped as commit `bd44c03`, but
   was still wrong per Aidin's screenshot: the long rest landed **before** the
   final pomodoro, so the session ended right after that pomodoro with no
   break at all - the opposite of the intent.
Why the final form: a long rest is only useful as a cooldown once the whole
session's work is done, so it has to come after the last pomodoro, not before
it - fixed in `ff68767`.

## 2026-08-12 - Ambient/timer background-throttling fix needed an app-level switch, not just per-window

Decision: disable Chromium's native-occlusion-tracking and intensive
wake-up throttling app-wide via
`app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,IntensiveWakeUpThrottling')`
in `src/main/index.ts`, in addition to the earlier per-window
`backgroundThrottling: false` fix (from a prior session, commit `f445274`).
Why: the per-window setting only stops Chromium's own timer throttling for
that window when it loses focus. Windows' native occlusion tracking is a
*separate* signal - once another window fully covers the main window (the
timer authority), Chromium still clamps its timers regardless of the
per-window setting. That's why the ambient bar/countdown kept stalling
"after a while" even after the earlier fix. If a similar stall shows up in
the mini-widget or elsewhere later, check both throttling paths, not just
`backgroundThrottling`.

## 2026-08-12 - Clicking the pinned mini widget itself reopens the main window

Decision: added a `mini:restore` IPC message - clicking anywhere on the
mini-widget card (not just its Pause/Stop buttons) hides the widget and
restores the main window, without acting on the running session (unlike
Pause/Stop, which also act on the timer engine). The buttons call
`stopPropagation()` so their own actions stay distinct from the card's.
Why: users expected the whole card to be clickable to bring the app back,
not just the two small buttons.

## 2026-08-12 - Fourth theme "Zen" added, following the Paper/Nature glow-free pattern

Decision: added `zen` as a 4th `ThemeId` - near-monochrome stone palette,
muted sage (`work`) / sand (`rest`) accents, `--accent-glow: transparent`
(no glow, like Paper and Nature), a 999px pill confirm button with a
brightness hover instead of a glow pulse, and its own slowest/softest
breathing animations for the step-badge dot and ring pulse (a plain fade,
not a pulse/sway/grow-in like the other themes).
Why: extends the existing "some themes have no glow" pattern established by
Paper/Nature rather than introducing a new visual mechanism.

## 2026-08-12 - Versioning: bump the patch on every commit, reset on minor/major

Decision: `package.json` version's patch digit increments by 1 with every commit
(`0.1.3` -> `0.1.4`), reset to 0 whenever the minor or major digit bumps
(`0.1.9` -> `0.2.0`). Minor/major bumps are a deliberate call (new user-facing
scope, breaking change), not automatic. Missed several bumps across the
2026-08-12 feature commits (icon, chime, rest tips, mini view, window sizing) —
`0.1.0` shipped unchanged across all of them — so the version was reset to
`0.1.1` to restart the count; those commits were not retroactively renumbered.
Why: Aidin's standing convention across his other projects, wasn't written down
for this one yet. Doing it per-commit (not per-release) means every build's
version is traceable to an exact commit without needing git log.

## 2026-08-12 - App icon generated from the neon-tomato logo

Decision: ship the app icon from Aidin's `pompomlogo.png` (a neon-tomato on a
dark rounded square). Two artifacts committed: `build/icon.ico` (multi-size
16-256px, PNG-compressed frames) drives the packaged exe/installer/taskbar via
electron-builder `build.win.icon`; `resources/icon.png` (256px) is imported in
the main process (`icon from '../../resources/icon.png?asset'`) for the
BrowserWindow. `resources/**` was added to `build.files` so the png ships inside
the asar at the path the `?asset` import resolves to.
Why/how to regenerate: the source PNG has an OPAQUE checkerboard background (not
real alpha), so the icons were cut with a PowerShell + System.Drawing script
that (1) finds the dark rounded-square by luminance, (2) turns near-gray light
pixels transparent, (3) pads to a centered square, resizes, and assembles the
ICO by hand. To redo, re-run that crop-by-darkness approach — a plain alpha-trim
does nothing on this source.

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

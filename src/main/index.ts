import { app, shell, screen, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
// electron-updater is CommonJS; a named ESM import ("import { autoUpdater }")
// fails at runtime in the packaged app. Import the default export and
// destructure - the pattern electron-vite documents for CJS deps, and the one
// Jot and Nib use.
import electronUpdater from 'electron-updater'
const { autoUpdater } = electronUpdater
// The multi-size .ico rather than the single PNG, so Windows can pick the
// frame for the current DPI scale instead of shrinking one bitmap - see
// scripts/generate-icon.mjs.
import icon from '../../resources/icon.ico?asset'
import { readStore, writeStore } from './store'
import type { StoreData } from '../shared/store'
import type { AmbientTick, MiniAction, MiniTick, TakeoverStep } from '../shared/ipc'

// Per-window `backgroundThrottling: false` stops Chromium from throttling a
// window's own timers once it loses focus, but Windows' native occlusion
// tracking is a separate signal: once another window fully covers ours,
// Chromium still treats it as occluded and clamps its timers regardless of
// that per-window setting — which is exactly "after a while" (once the user
// alt-tabs away or another window covers the main window) that the ambient
// bar/countdown stall despite the earlier per-window fix. Disabling both
// features at the app level removes that second throttling path.
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,IntensiveWakeUpThrottling')

let mainWindow: BrowserWindow | null = null
let takeoverWindow: BrowserWindow | null = null
let ambientWindow: BrowserWindow | null = null
let miniWindow: BrowserWindow | null = null

/** The step the takeover is currently gating (pull-based seed for its renderer). */
let pendingTakeoverStep: TakeoverStep | null = null

/** Latest ambient tick (pull-based seed so the bar can draw before the next push). */
let lastAmbientTick: AmbientTick | null = null

/** Latest mini-widget tick (pull-based seed so it can draw before the next push). */
let lastMiniTick: MiniTick | null = null

/** Thickness of the ambient bar strip, in px. */
const AMBIENT_HEIGHT = 5

/** Size of the pinned mini widget, in px. */
const MINI_WIDTH = 240
const MINI_HEIGHT = 96
/** Gap from the work-area edges (screen minus the taskbar), in px. */
const MINI_MARGIN = 16

const preload = join(__dirname, '../preload/index.js')

/**
 * Load the shared renderer bundle into `win` at the given hash route. In dev the
 * renderer is served by electron-vite (ELECTRON_RENDERER_URL); in prod it is a
 * file. A single bundle serves every window; the hash selects the window role
 * (`#/` main, `#/takeover`, `#/ambient`).
 */
function loadRoute(win: BrowserWindow, route: '' | 'takeover' | 'ambient' | 'mini'): void {
  const hash = route ? `#/${route}` : ''
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    win.loadURL(`${devUrl}${hash}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), route ? { hash: `/${route}` } : {})
  }
}

/**
 * Check GitHub for a newer release, once, at startup - the same arrangement as
 * Jot and Nib.
 *
 * PomPom is unsigned, which does not stop electron-updater on Windows: the
 * first install triggers SmartScreen, updates after that are silent. The
 * download installs on quit rather than mid-session, which is the library's
 * default and the right one for a timer you leave running all day; the renderer
 * gets a toast offering to restart now.
 *
 * Never in development: there is no packaged app to replace, and the check only
 * produces a confusing error in the log.
 */
function initAutoUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.on('update-available', (info) => {
    console.log(`PomPom update available: ${info.version}`)
  })
  autoUpdater.on('update-not-available', (info) => {
    console.log(`PomPom is up to date (${info.version})`)
  })
  autoUpdater.on('error', (error) => {
    // Being offline is the common case here, and it is not worth a dialog.
    console.error('PomPom update check failed', error)
  })
  autoUpdater.on('update-downloaded', (info) => {
    console.log(`PomPom update ${info.version} downloaded; it installs on quit`)
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('update:ready', info.version)
    }
  })

  void autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.error('PomPom update check could not start', error)
  })
}

/**
 * Window controls, because the main window is frameless (like Jot and Nib) and
 * its header row is the title bar. Minimise + close only: this is a 560px-wide
 * utility panel, so a maximise button would be a button for nothing.
 */
function registerWindowIpc(): void {
  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
  // "Restart to update" in the toast: quit now and come back on the new version.
  ipcMain.on('update:install', () => {
    autoUpdater.quitAndInstall()
  })
}

/** Persistence IPC bridge: renderer reads/writes the durable JSON store. */
function registerStoreIpc(): void {
  ipcMain.handle('store:get', () => readStore())
  ipcMain.handle('store:set', (_event, partial: Partial<StoreData>) => writeStore(partial))
}

/**
 * Takeover IPC bridge (plan step 8). The main-window renderer owns the timer and
 * requests a takeover when a step finishes; the takeover window renders the
 * grace countdown and, on an explicit Confirm click, tells the main window to
 * advance. The takeover NEVER auto-advances — only `takeover:confirm` does.
 */
function registerTakeoverIpc(): void {
  // Pull-based seed so the takeover renderer can fetch its step on mount,
  // avoiding a push/subscribe race with page load.
  ipcMain.handle('takeover:get', () => pendingTakeoverStep)

  ipcMain.on('takeover:show', (_event, step: TakeoverStep) => {
    pendingTakeoverStep = step
    const win = getTakeoverWindow()
    const reveal = (): void => {
      if (win.isDestroyed()) return
      win.webContents.send('takeover:step', step)
      win.show()
      win.focus()
    }
    if (win.webContents.isLoading()) {
      win.webContents.once('did-finish-load', reveal)
    } else {
      reveal()
    }
  })

  ipcMain.on('takeover:hide', () => {
    pendingTakeoverStep = null
    if (takeoverWindow && !takeoverWindow.isDestroyed()) takeoverWindow.close()
  })

  ipcMain.on('takeover:confirm', () => {
    pendingTakeoverStep = null
    if (takeoverWindow && !takeoverWindow.isDestroyed()) takeoverWindow.close()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('takeover:confirmed')
    }
  })
}

/**
 * Ambient bar IPC bridge (plan steps 9-10). The main-window renderer owns the
 * timer and decides when the bar should be visible (running/awaiting phase +
 * `ambientEnabled`); it pushes a compact `AmbientTick` each engine tick. This
 * window is a dumb click-through strip that just mirrors the elapsed fraction.
 */
function registerAmbientIpc(): void {
  // Pull-based seed so the ambient renderer can fetch the last tick on mount,
  // avoiding a push/subscribe race with page load (mirrors the takeover).
  ipcMain.handle('ambient:get', () => lastAmbientTick)

  ipcMain.on('ambient:setVisible', (_event, visible: boolean) => {
    if (visible) {
      const win = getAmbientWindow()
      if (win.isDestroyed()) return
      positionAmbientWindow(win)
      // Show without stealing focus from the main window.
      win.showInactive()
    } else if (ambientWindow && !ambientWindow.isDestroyed()) {
      ambientWindow.hide()
    }
  })

  ipcMain.on('ambient:push', (_event, tick: AmbientTick) => {
    lastAmbientTick = tick
    if (ambientWindow && !ambientWindow.isDestroyed()) {
      ambientWindow.webContents.send('ambient:tick', tick)
    }
  })
}

/** Pin the ambient window full-width to the very top of the primary display. */
function positionAmbientWindow(win: BrowserWindow): void {
  const { bounds } = screen.getPrimaryDisplay()
  win.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: AMBIENT_HEIGHT })
}

/**
 * Mini-widget IPC bridge. The main-window renderer decides when it should be
 * pinned (a `miniPinned` toggle, mirroring `ambientEnabled`) and pushes ticks
 * while it is; the widget's Pause/Stop buttons fire `mini:action`, which this
 * process forwards to the main window AND immediately restores it itself
 * (so restoring never depends on a renderer round-trip landing first).
 */
function registerMiniIpc(): void {
  ipcMain.handle('mini:get', () => lastMiniTick)

  ipcMain.on('mini:setVisible', (_event, visible: boolean) => {
    if (visible) {
      const win = getMiniWindow()
      if (win.isDestroyed()) return
      positionMiniWindow(win)
      win.showInactive()
      mainWindow?.minimize()
    } else {
      if (miniWindow && !miniWindow.isDestroyed()) miniWindow.hide()
      restoreMainWindow()
    }
  })

  ipcMain.on('mini:push', (_event, tick: MiniTick) => {
    lastMiniTick = tick
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.webContents.send('mini:tick', tick)
    }
  })

  ipcMain.on('mini:action', (_event, action: MiniAction) => {
    if (miniWindow && !miniWindow.isDestroyed()) miniWindow.hide()
    restoreMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mini:action', action)
    }
  })

  // Clicking the widget anywhere but its Pause/Stop buttons just reopens the
  // main window — the session keeps running unattended, same as Pause/Stop but
  // without acting on the engine.
  ipcMain.on('mini:restore', () => {
    if (miniWindow && !miniWindow.isDestroyed()) miniWindow.hide()
    restoreMainWindow()
  })
}

function restoreMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

/** Pin the mini widget to the bottom-right of the work area (above the taskbar). */
function positionMiniWindow(win: BrowserWindow): void {
  const { workArea } = screen.getPrimaryDisplay()
  win.setBounds({
    x: workArea.x + workArea.width - MINI_WIDTH - MINI_MARGIN,
    y: workArea.y + workArea.height - MINI_HEIGHT - MINI_MARGIN,
    width: MINI_WIDTH,
    height: MINI_HEIGHT
  })
}

/**
 * The ambient meter bar (`#/ambient`): a frameless, transparent, always-on-top
 * strip pinned to the top edge of the primary display. It is click-through
 * (`setIgnoreMouseEvents(true, { forward: true })` after load) so it never
 * intercepts input, and stays out of the taskbar / Alt-Tab.
 */
function getAmbientWindow(): BrowserWindow {
  if (ambientWindow && !ambientWindow.isDestroyed()) return ambientWindow
  const { bounds } = screen.getPrimaryDisplay()
  ambientWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: AMBIENT_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: 'PomPom',
    webPreferences: {
      preload,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // Keep the bar's CSS transitions running smoothly even though it is a
      // frameless, non-focusable background strip.
      backgroundThrottling: false
    }
  })
  ambientWindow.setAlwaysOnTop(true, 'screen-saver')
  // Let clicks pass straight through to whatever is underneath the strip.
  ambientWindow.webContents.once('did-finish-load', () => {
    if (ambientWindow && !ambientWindow.isDestroyed()) {
      ambientWindow.setIgnoreMouseEvents(true, { forward: true })
      // Re-seed the bar with the latest tick in case a push arrived while it
      // was still loading.
      if (lastAmbientTick) ambientWindow.webContents.send('ambient:tick', lastAmbientTick)
    }
  })
  ambientWindow.on('closed', () => {
    ambientWindow = null
  })
  loadRoute(ambientWindow, 'ambient')
  return ambientWindow
}

/**
 * The pinned mini widget (`#/mini`): a small, frameless, always-on-top card in
 * the bottom-right corner of the work area, shown while a session is running
 * with the "pin mini view" toggle on (the main window is minimized for the
 * duration). Unlike the ambient bar it takes clicks — its Pause/Stop buttons
 * restore the main window (see `registerMiniIpc`).
 */
function getMiniWindow(): BrowserWindow {
  if (miniWindow && !miniWindow.isDestroyed()) return miniWindow
  miniWindow = new BrowserWindow({
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: 'PomPom',
    webPreferences: {
      preload,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  })
  miniWindow.setAlwaysOnTop(true, 'screen-saver')
  miniWindow.webContents.once('did-finish-load', () => {
    if (miniWindow && !miniWindow.isDestroyed() && lastMiniTick) {
      miniWindow.webContents.send('mini:tick', lastMiniTick)
    }
  })
  miniWindow.on('closed', () => {
    miniWindow = null
  })
  loadRoute(miniWindow, 'mini')
  return miniWindow
}

/**
 * The fullscreen, always-on-top takeover window. It suppresses the taskbar and
 * sits above other windows (alwaysOnTop + fullscreen), per DECISIONS.md — no
 * hard OS-level input lock is attempted (explicitly out of scope).
 */
function getTakeoverWindow(): BrowserWindow {
  if (takeoverWindow && !takeoverWindow.isDestroyed()) return takeoverWindow
  takeoverWindow = new BrowserWindow({
    show: false,
    fullscreen: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    frame: false,
    backgroundColor: '#0d0f13',
    title: 'PomPom',
    webPreferences: {
      preload,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  // Keep it above fullscreen apps and OS chrome as far as Electron allows.
  takeoverWindow.setAlwaysOnTop(true, 'screen-saver')
  takeoverWindow.on('closed', () => {
    takeoverWindow = null
  })
  loadRoute(takeoverWindow, 'takeover')
  return takeoverWindow
}

function createMainWindow(): void {
  // Size against the actual screen so the default config view (4 pomodoros)
  // fits without scrolling on typical displays, while never exceeding the
  // work area on smaller ones — the body still scrolls as a fallback for
  // taller configs (see global.css).
  const { workAreaSize } = screen.getPrimaryDisplay()
  const height = Math.min(980, workAreaSize.height - 40)

  mainWindow = new BrowserWindow({
    width: 560,
    height,
    minWidth: 460,
    minHeight: 600,
    show: false,
    // Frameless, like Jot and Nib: the app header row IS the title bar (drag
    // handle plus window buttons), so the window is not topped by a second,
    // OS-drawn one saying the same thing.
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d0f13',
    title: 'PomPom',
    icon,
    webPreferences: {
      preload,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      // The main-window renderer is the timer authority (it owns the tick loop
      // and pushes the ambient bar). Without this, Electron throttles/pauses its
      // timers once the window is backgrounded — exactly when the user is
      // working — so the countdown and the ambient overlay silently stall.
      backgroundThrottling: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // If the user restores the main window themselves (taskbar click, Win+Tab,
  // …) rather than via the mini widget's Pause/Stop, hide the widget too —
  // otherwise it would linger on top of the now-visible main window.
  mainWindow.on('restore', () => {
    if (miniWindow && !miniWindow.isDestroyed()) miniWindow.hide()
  })

  loadRoute(mainWindow, '')

  mainWindow.on('closed', () => {
    mainWindow = null
    // Don't leave the aux windows orphaned if the main window closes.
    if (takeoverWindow && !takeoverWindow.isDestroyed()) takeoverWindow.close()
    if (ambientWindow && !ambientWindow.isDestroyed()) ambientWindow.close()
    if (miniWindow && !miniWindow.isDestroyed()) miniWindow.close()
  })
}

app.whenReady().then(() => {
  initAutoUpdater()
  registerWindowIpc()
  registerStoreIpc()
  registerTakeoverIpc()
  registerAmbientIpc()
  registerMiniIpc()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

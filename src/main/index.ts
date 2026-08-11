import { app, shell, screen, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { readStore, writeStore } from './store'
import type { StoreData } from '../shared/store'
import type { AmbientTick, TakeoverStep } from '../shared/ipc'

let mainWindow: BrowserWindow | null = null
let takeoverWindow: BrowserWindow | null = null
let ambientWindow: BrowserWindow | null = null

/** The step the takeover is currently gating (pull-based seed for its renderer). */
let pendingTakeoverStep: TakeoverStep | null = null

/** Latest ambient tick (pull-based seed so the bar can draw before the next push). */
let lastAmbientTick: AmbientTick | null = null

/** Thickness of the ambient bar strip, in px. */
const AMBIENT_HEIGHT = 5

const preload = join(__dirname, '../preload/index.js')

/**
 * Load the shared renderer bundle into `win` at the given hash route. In dev the
 * renderer is served by electron-vite (ELECTRON_RENDERER_URL); in prod it is a
 * file. A single bundle serves every window; the hash selects the window role
 * (`#/` main, `#/takeover`, `#/ambient`).
 */
function loadRoute(win: BrowserWindow, route: '' | 'takeover' | 'ambient'): void {
  const hash = route ? `#/${route}` : ''
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    win.loadURL(`${devUrl}${hash}`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), route ? { hash: `/${route}` } : {})
  }
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
      nodeIntegration: false
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
  mainWindow = new BrowserWindow({
    width: 520,
    height: 760,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d0f13',
    title: 'PomPom',
    webPreferences: {
      preload,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  loadRoute(mainWindow, '')

  mainWindow.on('closed', () => {
    mainWindow = null
    // Don't leave the aux windows orphaned if the main window closes.
    if (takeoverWindow && !takeoverWindow.isDestroyed()) takeoverWindow.close()
    if (ambientWindow && !ambientWindow.isDestroyed()) ambientWindow.close()
  })
}

app.whenReady().then(() => {
  registerStoreIpc()
  registerTakeoverIpc()
  registerAmbientIpc()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

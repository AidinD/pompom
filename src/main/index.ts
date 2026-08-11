import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { readStore, writeStore } from './store'
import type { StoreData } from '../shared/store'
import type { TakeoverStep } from '../shared/ipc'

let mainWindow: BrowserWindow | null = null
let takeoverWindow: BrowserWindow | null = null

/** The step the takeover is currently gating (pull-based seed for its renderer). */
let pendingTakeoverStep: TakeoverStep | null = null

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
    // Don't leave the takeover window orphaned if the main window closes.
    if (takeoverWindow && !takeoverWindow.isDestroyed()) takeoverWindow.close()
  })
}

app.whenReady().then(() => {
  registerStoreIpc()
  registerTakeoverIpc()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

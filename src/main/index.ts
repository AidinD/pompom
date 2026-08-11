import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { readStore, writeStore } from './store'
import type { StoreData } from '../shared/store'

let mainWindow: BrowserWindow | null = null

/** Persistence IPC bridge: renderer reads/writes the durable JSON store. */
function registerStoreIpc(): void {
  ipcMain.handle('store:get', () => readStore())
  ipcMain.handle('store:set', (_event, partial: Partial<StoreData>) => writeStore(partial))
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
      preload: join(__dirname, '../preload/index.js'),
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

  // electron-vite injects ELECTRON_RENDERER_URL in dev; load the file in prod.
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  registerStoreIpc()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

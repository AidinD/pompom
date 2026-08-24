import { contextBridge, ipcRenderer } from 'electron'
import type { StoreData } from '../shared/store'
import type { AmbientTick, MiniAction, MiniTick, TakeoverStep } from '../shared/ipc'

// The PomPom API surface exposed to the renderer. Persistence (durable JSON
// store) lands in plan step 4; the takeover multi-window bridge in step 8
//.
const api = {
  ping: (): string => 'pong',
  /** Frameless window: the header row's buttons drive the real window. */
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),
  /** An update finished downloading and is waiting for a restart. */
  onUpdateReady: (cb: (version: string) => void): (() => void) => {
    const listener = (_e: unknown, version: string): void => cb(version)
    ipcRenderer.on('update:ready', listener)
    return () => ipcRenderer.removeListener('update:ready', listener)
  },
  /** Quit and come back on the new version. */
  installUpdate: (): void => ipcRenderer.send('update:install'),
  store: {
    /** Read the whole durable store. */
    get: (): Promise<StoreData> => ipcRenderer.invoke('store:get'),
    /** Merge a partial update into the store and persist it; returns the result. */
    set: (partial: Partial<StoreData>): Promise<StoreData> =>
      ipcRenderer.invoke('store:set', partial)
  },
  takeover: {
    /** (main window) Request the fullscreen takeover for the next pending step. */
    show: (step: TakeoverStep): void => ipcRenderer.send('takeover:show', step),
    /** (main window) Force-hide/close the takeover (e.g. on stop/complete). */
    hide: (): void => ipcRenderer.send('takeover:hide'),
    /** (takeover window) User clicked "Confirm & continue" — advance the timer. */
    confirm: (): void => ipcRenderer.send('takeover:confirm'),
    /** (takeover window) Fetch the current pending step on mount. */
    get: (): Promise<TakeoverStep | null> => ipcRenderer.invoke('takeover:get'),
    /** (takeover window) Subscribe to pending-step pushes. Returns an unsubscribe. */
    onStep: (cb: (step: TakeoverStep) => void): (() => void) => {
      const listener = (_e: unknown, step: TakeoverStep): void => cb(step)
      ipcRenderer.on('takeover:step', listener)
      return () => ipcRenderer.removeListener('takeover:step', listener)
    },
    /** (main window) Subscribe to confirm events. Returns an unsubscribe. */
    onConfirmed: (cb: () => void): (() => void) => {
      const listener = (): void => cb()
      ipcRenderer.on('takeover:confirmed', listener)
      return () => ipcRenderer.removeListener('takeover:confirmed', listener)
    }
  },
  ambient: {
    /** (main window) Show or hide the always-on-top ambient meter bar. */
    setVisible: (visible: boolean): void => ipcRenderer.send('ambient:setVisible', visible),
    /** (main window) Push the current elapsed fraction / accent to the bar. */
    push: (tick: AmbientTick): void => ipcRenderer.send('ambient:push', tick),
    /** (ambient window) Fetch the last tick on mount (seed before the next push). */
    get: (): Promise<AmbientTick | null> => ipcRenderer.invoke('ambient:get'),
    /** (ambient window) Subscribe to live ticks. Returns an unsubscribe. */
    onTick: (cb: (tick: AmbientTick) => void): (() => void) => {
      const listener = (_e: unknown, tick: AmbientTick): void => cb(tick)
      ipcRenderer.on('ambient:tick', listener)
      return () => ipcRenderer.removeListener('ambient:tick', listener)
    }
  },
  mini: {
    /** (main window) Show/hide the pinned mini widget; also minimizes/restores the main window. */
    setVisible: (visible: boolean): void => ipcRenderer.send('mini:setVisible', visible),
    /** (main window) Push the current step/remaining/paused state to the widget. */
    push: (tick: MiniTick): void => ipcRenderer.send('mini:push', tick),
    /** (mini window) Fetch the last tick on mount (seed before the next push). */
    get: (): Promise<MiniTick | null> => ipcRenderer.invoke('mini:get'),
    /** (mini window) Subscribe to live ticks. Returns an unsubscribe. */
    onTick: (cb: (tick: MiniTick) => void): (() => void) => {
      const listener = (_e: unknown, tick: MiniTick): void => cb(tick)
      ipcRenderer.on('mini:tick', listener)
      return () => ipcRenderer.removeListener('mini:tick', listener)
    },
    /** (mini window) User clicked Pause or Stop — restores the main window. */
    action: (action: MiniAction): void => ipcRenderer.send('mini:action', action),
    /** (mini window) User clicked the widget itself — just reopen the main window. */
    restore: (): void => ipcRenderer.send('mini:restore'),
    /** (main window) Subscribe to actions fired from the mini widget. Returns an unsubscribe. */
    onAction: (cb: (action: MiniAction) => void): (() => void) => {
      const listener = (_e: unknown, action: MiniAction): void => cb(action)
      ipcRenderer.on('mini:action', listener)
      return () => ipcRenderer.removeListener('mini:action', listener)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('pompom', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define on window when context isolation is off)
  window.pompom = api
}

export type PomPomApi = typeof api

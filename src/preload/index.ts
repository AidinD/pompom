import { contextBridge, ipcRenderer } from 'electron'
import type { StoreData } from '../shared/store'

// The PomPom API surface exposed to the renderer. Persistence (durable JSON
// store) lands here in plan step 4; multi-window IPC is added in later steps
// (see .helm-goal/plan.md).
const api = {
  ping: (): string => 'pong',
  store: {
    /** Read the whole durable store. */
    get: (): Promise<StoreData> => ipcRenderer.invoke('store:get'),
    /** Merge a partial update into the store and persist it; returns the result. */
    set: (partial: Partial<StoreData>): Promise<StoreData> =>
      ipcRenderer.invoke('store:set', partial)
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

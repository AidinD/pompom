import { contextBridge } from 'electron'

// The PomPom API surface exposed to the renderer. This is intentionally
// minimal for the scaffold; persistence + multi-window IPC are added in
// later steps (see .helm-goal/plan.md).
const api = {
  ping: (): string => 'pong'
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

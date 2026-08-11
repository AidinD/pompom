import type { PomPomApi } from './index'

declare global {
  interface Window {
    pompom: PomPomApi
  }
}

export {}

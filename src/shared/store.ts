/**
 * PomPom persisted store shape.
 *
 * Serialized to a JSON file at `app.getPath('userData')/pompom-store.json`
 * (see src/main/store.ts). Kept in `src/shared` so the main process (writer)
 * and the renderer (reader/consumer) agree on the exact shape.
 *
 * `theme` is typed as a plain string here to avoid coupling the main process to
 * the renderer-only ThemeId union; the renderer narrows/validates it on load.
 */

import type { Cfg, Template } from './model'
import { DEFAULT_CFG, SEED_TEMPLATES } from './model'

export interface StoreData {
  /** Reusable session templates (seeded on first run). */
  templates: Template[]
  /** The last config the user started a session with. */
  lastConfig: Cfg
  /** Selected theme id ('neon' | 'paper' | 'nature'). */
  theme: string
  /** Whether the ambient meter bar is enabled. */
  ambientEnabled: boolean
  /** Whether the pinned mini view (auto-minimize while running) is enabled. */
  miniPinned: boolean
}

/** Defaults used on first run / when the store file is missing or corrupt. */
export const DEFAULT_STORE: StoreData = {
  templates: SEED_TEMPLATES,
  lastConfig: DEFAULT_CFG,
  theme: 'neon',
  ambientEnabled: false,
  miniPinned: false
}

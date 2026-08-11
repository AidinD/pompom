/**
 * PomPom durable store (main process).
 *
 * Hand-rolled JSON persistence at `app.getPath('userData')/pompom-store.json`.
 * Survives app restarts (NOT localStorage). The value is cached in memory after
 * the first read and rewritten on every `writeStore`. Exposed to the renderer
 * over IPC (see src/main/index.ts + src/preload/index.ts).
 */

import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { DEFAULT_STORE, type StoreData } from '../shared/store'

let cache: StoreData | null = null

function storePath(): string {
  return join(app.getPath('userData'), 'pompom-store.json')
}

/** Read the store (from cache after first load; falls back to defaults). */
export function readStore(): StoreData {
  if (cache) return cache
  try {
    const path = storePath()
    if (existsSync(path)) {
      const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<StoreData>
      // Merge over defaults so newly-added keys are always present.
      cache = { ...DEFAULT_STORE, ...parsed }
    } else {
      cache = { ...DEFAULT_STORE }
    }
  } catch (err) {
    console.error('[PomPom] failed to read store; using defaults', err)
    cache = { ...DEFAULT_STORE }
  }
  return cache
}

/** Merge a partial update into the store and persist it to disk. */
export function writeStore(partial: Partial<StoreData>): StoreData {
  const next: StoreData = { ...readStore(), ...partial }
  cache = next
  try {
    writeFileSync(storePath(), JSON.stringify(next, null, 2), 'utf-8')
  } catch (err) {
    console.error('[PomPom] failed to write store', err)
  }
  return next
}

import { deleteImport } from './importStore'

export type SessionMode = 'cloud' | 'demo' | 'import'

const DEMO_KEY = 'trove-web:demo'
const IMPORT_NAME_KEY = 'trove-web:import-name'
const IMPORT_ID_KEY = 'trove-web:import-id'
const SOUNDS_KEY = 'trove-web:sounds-enabled'

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

export function setDemoMode(): void {
  if (!hasWindow()) return
  sessionStorage.setItem(DEMO_KEY, '1')
  sessionStorage.removeItem(IMPORT_NAME_KEY)
  sessionStorage.removeItem(IMPORT_ID_KEY)
}

export function clearDemoMode(): void {
  if (!hasWindow()) return
  sessionStorage.removeItem(DEMO_KEY)
}

export function isDemoMode(): boolean {
  if (!hasWindow()) return false
  return sessionStorage.getItem(DEMO_KEY) === '1'
}

export function setImportSession(name: string, importId: string): void {
  if (!hasWindow()) return
  sessionStorage.removeItem(DEMO_KEY)
  sessionStorage.setItem(IMPORT_NAME_KEY, name)
  sessionStorage.setItem(IMPORT_ID_KEY, importId)
}

export async function clearImportSession(): Promise<void> {
  if (!hasWindow()) return
  const id = sessionStorage.getItem(IMPORT_ID_KEY)
  sessionStorage.removeItem(IMPORT_NAME_KEY)
  sessionStorage.removeItem(IMPORT_ID_KEY)
  if (id) {
    try {
      await deleteImport(id)
    } catch {
      // IndexedDB may be unavailable; session flags are already cleared.
    }
  }
}

export function getImportSession(): { name: string; id: string } | null {
  if (!hasWindow()) return null
  const name = sessionStorage.getItem(IMPORT_NAME_KEY)
  const id = sessionStorage.getItem(IMPORT_ID_KEY)
  if (!name || !id) return null
  return { name, id }
}

export function getSessionMode(): SessionMode {
  if (isDemoMode()) return 'demo'
  if (getImportSession()) return 'import'
  return 'cloud'
}

export function readSoundsEnabled(): boolean {
  if (!hasWindow()) return false
  const raw = localStorage.getItem(SOUNDS_KEY)
  if (raw === null) return true
  return raw === '1'
}

export function writeSoundsEnabled(enabled: boolean): void {
  if (!hasWindow()) return
  localStorage.setItem(SOUNDS_KEY, enabled ? '1' : '0')
}

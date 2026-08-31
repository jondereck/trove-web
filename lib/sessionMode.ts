export type SessionMode = 'cloud' | 'demo' | 'import'

const DEMO_KEY = 'trove-web:demo'
const IMPORT_NAME_KEY = 'trove-web:import-name'
const IMPORT_SAVES_KEY = 'trove-web:import-saves'
const SOUNDS_KEY = 'trove-web:sounds-enabled'

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

export function setDemoMode(): void {
  if (!hasWindow()) return
  sessionStorage.setItem(DEMO_KEY, '1')
  sessionStorage.removeItem(IMPORT_NAME_KEY)
  sessionStorage.removeItem(IMPORT_SAVES_KEY)
}

export function clearDemoMode(): void {
  if (!hasWindow()) return
  sessionStorage.removeItem(DEMO_KEY)
}

export function isDemoMode(): boolean {
  if (!hasWindow()) return false
  return sessionStorage.getItem(DEMO_KEY) === '1'
}

export function setImportSession(name: string, savesJson: string): void {
  if (!hasWindow()) return
  sessionStorage.removeItem(DEMO_KEY)
  sessionStorage.setItem(IMPORT_NAME_KEY, name)
  sessionStorage.setItem(IMPORT_SAVES_KEY, savesJson)
}

export function clearImportSession(): void {
  if (!hasWindow()) return
  sessionStorage.removeItem(IMPORT_NAME_KEY)
  sessionStorage.removeItem(IMPORT_SAVES_KEY)
}

export function getImportSession(): { name: string; savesJson: string } | null {
  if (!hasWindow()) return null
  const name = sessionStorage.getItem(IMPORT_NAME_KEY)
  const savesJson = sessionStorage.getItem(IMPORT_SAVES_KEY)
  if (!name || !savesJson) return null
  return { name, savesJson }
}

export function getSessionMode(): SessionMode {
  if (isDemoMode()) return 'demo'
  if (getImportSession()) return 'import'
  return 'cloud'
}

export function readSoundsEnabled(): boolean {
  if (!hasWindow()) return false
  return localStorage.getItem(SOUNDS_KEY) === '1'
}

export function writeSoundsEnabled(enabled: boolean): void {
  if (!hasWindow()) return
  localStorage.setItem(SOUNDS_KEY, enabled ? '1' : '0')
}

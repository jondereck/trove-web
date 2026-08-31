import type { BackupPayload, Save } from './types'
import { filterLibrarySaves } from './libraryCore'

export function parseBackupJson(raw: string): { saves: Save[]; collections: BackupPayload['collections'] } {
  const data = JSON.parse(raw) as BackupPayload
  if (!Array.isArray(data.saves)) throw new Error('Invalid backup: missing saves array')
  return { saves: filterLibrarySaves(data.saves), collections: data.collections ?? [] }
}

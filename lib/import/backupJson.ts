import type { BackupPayload, Save } from '../types'
import { filterLibrarySaves } from '../libraryCore'

export const BACKUP_VERSION = 2

export function parseBackupJson(raw: string): {
  saves: Save[]
  collections: BackupPayload['collections']
} {
  const data = JSON.parse(raw) as BackupPayload
  if (!Array.isArray(data.saves)) throw new Error('Invalid backup: missing saves array')
  if (typeof data.version === 'number' && data.version > BACKUP_VERSION) {
    throw new Error('This backup is from a newer Trove version. Update Trove Web to open it.')
  }
  return { saves: filterLibrarySaves(data.saves), collections: data.collections ?? [] }
}

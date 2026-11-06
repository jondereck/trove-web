import type { BackupPayload, Collection, Save } from '../types'
import { BACKUP_VERSION } from '../backup/payload'
import { excludeVaultSaves } from '../libraryCore'

export { BACKUP_VERSION }

export function parseBackupJson(raw: string): {
  saves: Save[]
  collections: Collection[]
} {
  const data = JSON.parse(raw) as BackupPayload
  if (!Array.isArray(data.saves)) throw new Error('Invalid backup: missing saves array')
  if (typeof data.version === 'number' && data.version > BACKUP_VERSION) {
    throw new Error('This backup is from a newer Trove version. Update Trove Web to open it.')
  }
  return {
    saves: excludeVaultSaves(data.saves),
    collections: data.collections ?? [],
  }
}

import JSZip from 'jszip'
import { parseBackupJson } from './backupJson'
import type { Collection, Save } from '../types'

export async function parseBackupZip(buffer: ArrayBuffer): Promise<{
  saves: Save[]
  collections: Collection[]
}> {
  const zip = await JSZip.loadAsync(buffer)
  const backupFile = zip.file('backup.json')

  if (!backupFile) {
    throw new Error('This zip does not contain backup.json.')
  }

  const raw = await backupFile.async('string')
  return parseBackupJson(raw)
}

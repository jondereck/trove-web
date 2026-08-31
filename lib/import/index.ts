import { parseBackupJson } from './backupJson'
import { parseBackupZip } from './backupZip'
import { isRaindropCsv, previewRaindropCsv } from './raindropCsv'
import type { Collection, Save } from '../types'

export type ImportParseResult = {
  saves: Save[]
  collections: Collection[]
  source: 'trove-json' | 'trove-zip' | 'raindrop-csv'
}

export async function parseImportFile(file: File): Promise<ImportParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'json') {
    const raw = await file.text()
    const parsed = parseBackupJson(raw)
    return { ...parsed, source: 'trove-json' }
  }

  if (ext === 'zip') {
    const buffer = await file.arrayBuffer()
    const parsed = await parseBackupZip(buffer)
    return { ...parsed, source: 'trove-zip' }
  }

  if (ext === 'csv') {
    const raw = await file.text()
    if (!isRaindropCsv(raw)) {
      throw new Error('Unsupported CSV. Use a Raindrop.io export or Trove JSON/zip backup.')
    }
    const parsed = previewRaindropCsv(raw)
    return { ...parsed, source: 'raindrop-csv' }
  }

  throw new Error('Unsupported file type. Choose .json, .zip, or Raindrop .csv.')
}
